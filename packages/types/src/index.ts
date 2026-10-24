export type HealthStatus = 'ok' | 'degraded' | 'down';

export interface HealthCheckResponse {
  status: HealthStatus;
  service: string;
}

export type {
  SearchRequest,
  SearchResponse,
  SearchCacheStatus,
  SearchResult,
  SearchSourceCounts,
  SearchSourceId,
  SearchTiming,
} from './search.js';
