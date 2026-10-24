export type { SearchRequest, SearchResponse, SearchResult } from '@seven-ai-search/types';

export interface SearchErrorResponse {
  success: false;
  code?: string;
  error?: string;
  message?: string | string[];
  retryAfterSeconds?: number;
  timestamp?: string;
}
