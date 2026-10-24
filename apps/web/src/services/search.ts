import { buildApiUrl } from '../lib/api.ts';
import type { SearchErrorResponse, SearchRequest, SearchResponse } from '../types/search';

const SEARCH_SOURCE_IDS = ['BAIDU', 'QUARK', 'XUNLEI', 'ALIYUN', 'UC'] as const;
const SEARCH_TIMING_NUMBER_FIELDS = [
  'queryOptimizeMs',
  'panSouMs',
  'filterDedupeMs',
  'totalMs',
  'rawCount',
  'validCount',
] as const;
const OPTIONAL_SEARCH_TIMING_NUMBER_FIELDS = [
  'memoryCacheMs',
  'redisCacheMs',
  'cacheWriteMs',
  'validLinkCount',
  'relevantCount',
  'deduplicatedCount',
  'resultCount',
] as const;
const SEARCH_CACHE_STATUS_VALUES = ['memory_fresh', 'redis_fresh', 'redis_stale', 'miss'] as const;
const PANSOU_STATUS_VALUES = ['not_called', 'success', 'partial', 'timeout', 'error'] as const;

interface SearchResourcesOptions {
  apiBaseUrl?: string;
  signal?: AbortSignal;
}

export class SearchApiError extends Error {
  readonly code?: string;
  readonly payload?: SearchErrorResponse;
  readonly retryAfterSeconds?: number;
  readonly status: number;

  constructor(
    message: string,
    status: number,
    payload?: SearchErrorResponse,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'SearchApiError';
    this.status = status;
    this.payload = payload;
    this.code = payload?.code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function searchResources(
  keyword: string,
  options: SearchResourcesOptions = {},
): Promise<SearchResponse> {
  return requestSearchResources(keyword, options);
}

async function requestSearchResources(
  keyword: string,
  options: SearchResourcesOptions,
): Promise<SearchResponse> {
  const requestBody: SearchRequest = { keyword };
  const response = await fetch(buildApiUrl('/search', options.apiBaseUrl), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    cache: 'no-store',
    signal: options.signal,
  });

  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    const errorPayload = isSearchErrorResponse(payload) ? payload : undefined;
    throw new SearchApiError(
      getSearchErrorMessage(response.status, errorPayload),
      response.status,
      errorPayload,
      getRetryAfterSeconds(response, errorPayload),
    );
  }

  if (!isSearchResponse(payload)) {
    throw new SearchApiError('搜索服务返回了无法识别的数据。', response.status);
  }

  return payload;
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getSearchErrorMessage(status: number, payload?: SearchErrorResponse): string {
  if (status === 400) {
    return getPayloadMessage(payload) || '请输入有效的资源名称。';
  }

  if (status === 409 && payload?.code === 'SEARCH_IN_PROGRESS') {
    return getPayloadMessage(payload) || '正在搜索，请勿重复提交';
  }

  if (status === 429) {
    return getPayloadMessage(payload) || '搜索过于频繁，请稍后再试';
  }

  if (status === 503) {
    return getPayloadMessage(payload) || '搜索服务暂时不可用，请稍后再试。';
  }

  return getPayloadMessage(payload) || '搜索失败，请稍后重试。';
}

function getRetryAfterSeconds(
  response: Response,
  payload?: SearchErrorResponse,
): number | undefined {
  const bodyValue = payload?.retryAfterSeconds;
  if (Number.isInteger(bodyValue) && Number(bodyValue) > 0) {
    return Number(bodyValue);
  }

  const headerValue = Number(response.headers.get('retry-after'));
  return Number.isInteger(headerValue) && headerValue > 0 ? headerValue : undefined;
}

function getPayloadMessage(payload?: SearchErrorResponse): string {
  if (!payload?.message) {
    return '';
  }

  return Array.isArray(payload.message) ? payload.message.join('；') : payload.message;
}

function isSearchErrorResponse(payload: unknown): payload is SearchErrorResponse {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  return (payload as SearchErrorResponse).success === false;
}

function isSearchResponse(payload: unknown): payload is SearchResponse {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const response = payload as Partial<SearchResponse>;
  return (
    response.success === true &&
    Array.isArray(response.data) &&
    typeof response.timestamp === 'string' &&
    (response.total === undefined || typeof response.total === 'number') &&
    (response.page === undefined || typeof response.page === 'number') &&
    (response.pageSize === undefined || typeof response.pageSize === 'number') &&
    (response.maxResults === undefined || typeof response.maxResults === 'number') &&
    (response.exhausted === undefined || typeof response.exhausted === 'boolean') &&
    (response.truncated === undefined || typeof response.truncated === 'boolean') &&
    (response.cacheHit === undefined || typeof response.cacheHit === 'boolean') &&
    (response.sourceCounts === undefined || isSearchSourceCounts(response.sourceCounts)) &&
    (response.cacheStatus === undefined || isSearchCacheStatus(response.cacheStatus)) &&
    (response.staleFallback === undefined || typeof response.staleFallback === 'boolean') &&
    (response.searchNotice === undefined || typeof response.searchNotice === 'string') &&
    (response.timing === undefined || isSearchTiming(response.timing)) &&
    response.data.every(isSearchResult)
  );
}

function isSearchSourceCounts(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const counts = value as Record<string, unknown>;
  return SEARCH_SOURCE_IDS.every((source) => isNonNegativeInteger(counts[source]));
}

function isSearchTiming(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const timing = value as Record<string, unknown>;
  return (
    typeof timing.requestId === 'string' &&
    timing.requestId.trim().length > 0 &&
    typeof timing.cacheHit === 'boolean' &&
    typeof timing.exhausted === 'boolean' &&
    typeof timing.truncated === 'boolean' &&
    SEARCH_TIMING_NUMBER_FIELDS.every((field) => isNonNegativeNumber(timing[field])) &&
    OPTIONAL_SEARCH_TIMING_NUMBER_FIELDS.every(
      (field) => timing[field] === undefined || isNonNegativeNumber(timing[field]),
    ) &&
    (timing.cacheStatus === undefined || isSearchCacheStatus(timing.cacheStatus)) &&
    (timing.panSouStatus === undefined || isPanSouStatus(timing.panSouStatus)) &&
    (timing.timeoutReason === undefined ||
      timing.timeoutReason === null ||
      typeof timing.timeoutReason === 'string') &&
    (timing.staleFallback === undefined || typeof timing.staleFallback === 'boolean') &&
    (timing.finalStatus === undefined ||
      timing.finalStatus === 'success' ||
      timing.finalStatus === 'failed')
  );
}

function isSearchCacheStatus(value: unknown): boolean {
  return typeof value === 'string' && SEARCH_CACHE_STATUS_VALUES.includes(value as never);
}

function isPanSouStatus(value: unknown): boolean {
  return typeof value === 'string' && PANSOU_STATUS_VALUES.includes(value as never);
}

function isNonNegativeInteger(value: unknown): boolean {
  return Number.isInteger(value) && Number(value) >= 0;
}

function isNonNegativeNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isSearchResult(result: unknown): boolean {
  if (!result || typeof result !== 'object') {
    return false;
  }

  const candidate = result as Record<string, unknown>;
  return (
    typeof candidate.type === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.url === 'string'
  );
}
