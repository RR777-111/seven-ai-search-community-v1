'use client';

import { useEffect, useRef, useState } from 'react';
import { getSearchUiErrorMessage } from '@/hooks/search-error-message';
import { acquireSearchSubmission, releaseSearchSubmission } from '@/hooks/search-submission-guard';
import { SearchApiError, searchResources } from '@/services/search';
import type { SearchResult } from '@/types/search';

type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

interface SearchState {
  errorCode?: string;
  errorMessage: string;
  loadingStartedAt?: number;
  page?: number;
  pageSize?: number;
  results: SearchResult[];
  searchNotice: string;
  status: SearchStatus;
  total?: number;
}

const INITIAL_STATE: SearchState = {
  errorMessage: '',
  results: [],
  searchNotice: '',
  status: 'idle',
};

export function useSearch() {
  const [state, setState] = useState<SearchState>(INITIAL_STATE);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
  const activeRequest = useRef<AbortController | null>(null);
  const pendingSubmission = useRef(false);
  const requestSequence = useRef(0);
  const retryBlockedUntil = useRef(0);

  useEffect(() => {
    return () => {
      activeRequest.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (retryAfterSeconds <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const remainingSeconds = Math.max(
        0,
        Math.ceil((retryBlockedUntil.current - Date.now()) / 1000),
      );
      setRetryAfterSeconds(remainingSeconds);
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [retryAfterSeconds]);

  async function submitSearch(keyword: string) {
    const normalizedKeyword = keyword.trim();

    if (!normalizedKeyword) {
      setState({
        errorMessage: '请输入资源名称',
        loadingStartedAt: undefined,
        page: undefined,
        pageSize: undefined,
        results: [],
        searchNotice: '',
        status: 'error',
        total: undefined,
      });
      return;
    }

    if (Date.now() < retryBlockedUntil.current || !acquireSearchSubmission(pendingSubmission)) {
      return;
    }

    const abortController = new AbortController();
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    activeRequest.current = abortController;
    setRetryAfterSeconds(0);
    const loadingStartedAt = Date.now();

    setState({
      errorMessage: '',
      loadingStartedAt,
      page: undefined,
      pageSize: undefined,
      results: [],
      searchNotice: '',
      status: 'loading',
      total: undefined,
    });

    try {
      const response = await searchResources(normalizedKeyword, { signal: abortController.signal });

      if (abortController.signal.aborted || requestSequence.current !== requestId) {
        return;
      }

      setState({
        errorMessage: '',
        loadingStartedAt,
        page: response.page,
        pageSize: response.pageSize,
        results: response.data,
        searchNotice:
          response.staleFallback || response.cacheStatus === 'redis_stale'
            ? (response.searchNotice ?? '实时搜索响应较慢，当前展示近期缓存结果。')
            : '',
        status: 'success',
        total: response.total,
      });
    } catch (error) {
      if (abortController.signal.aborted || requestSequence.current !== requestId) {
        return;
      }

      const errorCode =
        error instanceof SearchApiError
          ? (error.code ?? (error.status === 429 ? 'RATE_LIMITED' : undefined))
          : undefined;
      const nextRetryAfterSeconds =
        error instanceof SearchApiError ? (error.retryAfterSeconds ?? 0) : 0;
      if (nextRetryAfterSeconds > 0) {
        retryBlockedUntil.current = Date.now() + nextRetryAfterSeconds * 1000;
        setRetryAfterSeconds(nextRetryAfterSeconds);
      }

      setState({
        errorCode,
        errorMessage: getSearchUiErrorMessage(error),
        loadingStartedAt: undefined,
        page: undefined,
        pageSize: undefined,
        results: [],
        searchNotice: '',
        status: 'error',
        total: undefined,
      });
    } finally {
      if (activeRequest.current === abortController) {
        activeRequest.current = null;
      }
      releaseSearchSubmission(pendingSubmission);
    }
  }

  const errorMessage =
    state.errorCode === 'RATE_LIMITED' && retryAfterSeconds > 0
      ? `搜索过于频繁，请在 ${retryAfterSeconds} 秒后重试`
      : state.errorMessage;

  return {
    ...state,
    errorMessage,
    isLoading: state.status === 'loading',
    isSubmitDisabled: state.status === 'loading' || retryAfterSeconds > 0,
    retryAfterSeconds,
    submitSearch,
  };
}
