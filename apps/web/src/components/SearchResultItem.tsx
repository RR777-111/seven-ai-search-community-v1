'use client';

import { useEffect, useRef, useState } from 'react';
import { getSearchResultCardFields } from '@/components/search-results-display';
import type { SearchResult } from '@/types/search';

interface SearchResultItemProps {
  result: SearchResult;
}

type CopyStatus = 'idle' | 'success' | 'error';

export function SearchResultItem({ result }: SearchResultItemProps) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  const resetTimer = useRef<number | null>(null);
  const cardFields = getSearchResultCardFields(result);

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) {
        window.clearTimeout(resetTimer.current);
        resetTimer.current = null;
      }
    };
  }, []);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(result.url);
      setTemporaryCopyStatus('success');
    } catch {
      setTemporaryCopyStatus('error');
    }
  }

  function setTemporaryCopyStatus(status: Exclude<CopyStatus, 'idle'>) {
    clearResetTimer();
    setCopyStatus(status);
    resetTimer.current = window.setTimeout(() => {
      setCopyStatus('idle');
      resetTimer.current = null;
    }, 1500);
  }

  function clearResetTimer() {
    if (resetTimer.current === null) {
      return;
    }

    window.clearTimeout(resetTimer.current);
    resetTimer.current = null;
  }

  const copyLabel =
    copyStatus === 'success'
      ? '已复制'
      : copyStatus === 'error'
        ? '复制失败，请手动复制'
        : cardFields.copyButtonLabel;

  return (
    <li className="neo-result-card overflow-hidden">
      <article className="flex flex-col gap-3 px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <span className="neo-result-card-source">{cardFields.sourceLabel}</span>
            <div className="space-y-1">
              <h3
                className="line-clamp-2 min-w-0 break-words text-[15px] font-black leading-6 text-[#1b1b1b] [overflow-wrap:anywhere] sm:text-base"
                title={cardFields.title}
              >
                {cardFields.title}
              </h3>
              <p className="neo-result-card-meta text-[#666666]">{cardFields.updatedAtText}</p>
            </div>
          </div>

          <div className="flex shrink-0 justify-start sm:justify-end">
            <button
              aria-label={`${copyLabel}：${cardFields.title}`}
              className={
                copyStatus === 'error'
                  ? 'neo-button h-11 w-full border-[#b42318] bg-[#ffd9d5] px-4 text-sm text-[#1b1b1b] shadow-[3px_3px_0_#1b1b1b] sm:w-auto'
                  : copyStatus === 'success'
                    ? 'neo-button h-11 w-full border-[#1b1b1b] bg-[#d8f4c8] px-4 text-sm text-[#1b1b1b] shadow-[3px_3px_0_#1b1b1b] sm:w-auto'
                    : 'neo-button h-11 w-full px-4 text-sm sm:w-auto'
              }
              onClick={() => void copyUrl()}
              type="button"
            >
              {copyLabel}
            </button>
          </div>
        </div>

        <a
          className="block min-w-0 break-all rounded-[4px] border-2 border-[#1b1b1b] bg-[#fafafa] px-2.5 py-2 text-xs leading-5 text-[#1b1b1b] underline-offset-4 transition hover:bg-white hover:text-[#7c3aed] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b1b1b] sm:text-sm sm:leading-6"
          href={cardFields.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {cardFields.url}
        </a>
      </article>
    </li>
  );
}
