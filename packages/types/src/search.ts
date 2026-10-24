export interface SearchRequest {
  keyword: string;
}

export interface SearchResult {
  type: string;
  title: string;
  url: string;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
  resourceTime?: string | null;
}

export type SearchSourceId = 'BAIDU' | 'QUARK' | 'XUNLEI' | 'ALIYUN' | 'UC';

export type SearchSourceCounts = Record<SearchSourceId, number>;

export type SearchCacheStatus = 'memory_fresh' | 'redis_fresh' | 'redis_stale' | 'miss';

export interface SearchTiming {
  requestId: string;
  cacheHit: boolean;
  keywordHash?: string;
  cacheKeyHash?: string;
  cacheVersion?: string;
  cacheStatus?: SearchCacheStatus;
  memoryCacheMs?: number;
  redisCacheMs?: number;
  queryOptimizeMs: number;
  panSouMs: number;
  filterDedupeMs: number;
  cacheWriteMs?: number;
  totalMs: number;
  rawCount: number;
  validCount: number;
  resultCount?: number;
  panSouStatus?: 'not_called' | 'success' | 'partial' | 'timeout' | 'error';
  timeoutReason?: string | null;
  staleFallback?: boolean;
  finalStatus?: 'success' | 'failed';
  exhausted: boolean;
  truncated: boolean;
}

export interface SearchResponse {
  success: boolean;
  data: SearchResult[];
  message: string;
  timestamp: string;
  total?: number;
  page?: number;
  pageSize?: number;
  maxResults?: number;
  exhausted?: boolean;
  truncated?: boolean;
  sourceCounts?: SearchSourceCounts;
  cacheHit?: boolean;
  cacheStatus?: SearchCacheStatus;
  staleFallback?: boolean;
  searchNotice?: string;
  timing?: SearchTiming;
}
