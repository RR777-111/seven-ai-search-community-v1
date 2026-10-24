'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { SearchResultItem } from '@/components/SearchResultItem';
import {
  getSearchResultsEndLabel,
  formatSearchResultsEmptyMessage,
} from '@/components/search-results-display';
import {
  DRIVE_SOURCE_OPTIONS,
  filterResultsByDriveSource,
  getDriveSourceOption,
  type DriveSource,
} from '@/components/search-results-filter';
import {
  getInitialVisibleResultCount,
  getNextVisibleResultCount,
  shouldLoadMoreSearchResults,
} from '@/components/search-results-pagination';
import type { SearchResult } from '@/types/search';

interface SearchResultsProps {
  results: SearchResult[];
}

export function SearchResults({ results }: SearchResultsProps) {
  const [selectedSource, setSelectedSource] = useState<DriveSource>('all');
  const filteredResults = useMemo(
    () => filterResultsByDriveSource(results, selectedSource),
    [results, selectedSource],
  );
  const [visibleCount, setVisibleCount] = useState(() =>
    getInitialVisibleResultCount(filteredResults.length),
  );
  const loadMoreTarget = useRef<HTMLDivElement | null>(null);
  const isLoadingBatch = useRef(false);
  const displayedResults = filteredResults.slice(0, visibleCount);
  const hasMore = visibleCount < filteredResults.length;

  useEffect(() => {
    isLoadingBatch.current = false;
  }, [visibleCount]);

  useEffect(() => {
    const target = loadMoreTarget.current;
    if (!target || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          !shouldLoadMoreSearchResults({
            hasMore,
            isIntersecting: entries.some((entry) => entry.isIntersecting),
            isLoadingBatch: isLoadingBatch.current,
          })
        ) {
          return;
        }

        isLoadingBatch.current = true;
        setVisibleCount((current) => getNextVisibleResultCount(current, filteredResults.length));
      },
      { rootMargin: '160px 0px' },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [filteredResults.length, hasMore]);

  function handleSourceChange(source: DriveSource) {
    setSelectedSource(source);
    setVisibleCount(
      getInitialVisibleResultCount(filterResultsByDriveSource(results, source).length),
    );
    isLoadingBatch.current = false;
  }

  return (
    <section aria-label="结果列表" className="w-full">
      <div className="mb-5 flex min-w-0 flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="max-w-full min-w-0 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label="网盘来源筛选"
        >
          <div className="inline-flex min-w-max items-center gap-2">
            {DRIVE_SOURCE_OPTIONS.map((option) => (
              <button
                key={option.value}
                aria-pressed={selectedSource === option.value}
                className="neo-result-filter"
                onClick={() => handleSourceChange(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <p className="inline-flex min-h-9 items-center self-start rounded-[4px] border-2 border-[#1b1b1b] bg-white px-2 py-1 text-xs font-extrabold leading-4 text-[#1b1b1b] shadow-[2px_2px_0_#1b1b1b] sm:self-auto">
          共 {filteredResults.length} 条资源
        </p>
      </div>
      {filteredResults.length > 0 ? (
        <>
          <ul className="space-y-2.5 sm:space-y-3" role="list">
            {displayedResults.map((result) => (
              <SearchResultItem
                key={`${result.type}-${result.title}-${result.url}`}
                result={result}
              />
            ))}
          </ul>
          <div className="mt-5 flex justify-center">
            {hasMore ? (
              <div aria-hidden="true" className="h-px w-full" ref={loadMoreTarget} />
            ) : (
              <p
                className="rounded-[4px] border-2 border-[#1b1b1b] bg-[#f6f6f6] px-4 py-2 text-center text-sm font-extrabold text-[#1b1b1b] shadow-[2px_2px_0_#1b1b1b]"
                role="status"
              >
                {getSearchResultsEndLabel()}
              </p>
            )}
          </div>
        </>
      ) : (
        <div
          className="neo-result-state neo-result-state-empty overflow-hidden px-4 py-6 text-center"
          role="status"
        >
          <p className="text-base font-extrabold text-[#1b1b1b]">
            {formatSearchResultsEmptyMessage({
              selectedSource,
              sourceLabel: getDriveSourceOption(selectedSource).label,
            })}
          </p>
        </div>
      )}
    </section>
  );
}
