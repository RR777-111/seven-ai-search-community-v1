import { useEffect, useState } from 'react';

export type SearchWaitingVisibilityStatus = 'idle' | 'loading' | 'success' | 'error';

export const SEARCH_WAITING_MINIMUM_VISIBLE_MS = 1000;

export function getSearchWaitingVisibility(
  status: SearchWaitingVisibilityStatus,
  startedAt: number | undefined,
  now = Date.now(),
): boolean {
  if (status === 'loading') {
    return true;
  }

  if (status !== 'success' || !startedAt) {
    return false;
  }

  return now - startedAt < SEARCH_WAITING_MINIMUM_VISIBLE_MS;
}

export function getSearchWaitingRemainingMs(
  status: SearchWaitingVisibilityStatus,
  startedAt: number | undefined,
  now = Date.now(),
): number {
  if (status !== 'success' || !startedAt) {
    return 0;
  }

  return Math.max(0, SEARCH_WAITING_MINIMUM_VISIBLE_MS - (now - startedAt));
}

export function useSearchWaitingVisibility(
  status: SearchWaitingVisibilityStatus,
  startedAt: number | undefined,
): boolean {
  const [, setTimerTick] = useState(0);

  useEffect(() => {
    const remainingMs = getSearchWaitingRemainingMs(status, startedAt);
    if (remainingMs <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setTimerTick((value) => value + 1);
    }, remainingMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [startedAt, status]);

  return getSearchWaitingVisibility(status, startedAt);
}
