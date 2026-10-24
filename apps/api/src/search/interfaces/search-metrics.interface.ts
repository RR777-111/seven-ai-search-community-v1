import type { SearchTiming } from '@seven-ai-search/types';

export const SEARCH_METRICS = Symbol('SEARCH_METRICS');

export interface SearchMetrics {
  recordProviderDuration(durationMs: number): void;
  recordQueryCount(queryCount: number): void;
  recordSearchTiming(timing: SearchTiming): void;
}
