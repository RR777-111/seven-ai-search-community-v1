export const SEARCH_RESULTS_BATCH_SIZE = 15;

export function getInitialVisibleResultCount(total: number): number {
  return Math.min(SEARCH_RESULTS_BATCH_SIZE, Math.max(0, total));
}

export function getNextVisibleResultCount(current: number, total: number): number {
  return Math.min(Math.max(0, total), Math.max(0, current) + SEARCH_RESULTS_BATCH_SIZE);
}

export function shouldLoadMoreSearchResults({
  hasMore,
  isIntersecting,
  isLoadingBatch,
}: {
  hasMore: boolean;
  isIntersecting: boolean;
  isLoadingBatch: boolean;
}): boolean {
  return hasMore && isIntersecting && !isLoadingBatch;
}
