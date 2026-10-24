import type { SearchCacheStatus, SearchSourceCounts, SearchTiming } from '@seven-ai-search/types';

const RESPONSE_PAYLOAD = Symbol('RESPONSE_PAYLOAD');

export interface ApiResponsePayload<TData> {
  data: TData;
  message: string;
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
  [RESPONSE_PAYLOAD]: true;
}

export type ApiResponseData<TData> =
  TData extends ApiResponsePayload<infer TPayload> ? TPayload : TData;

export function createResponsePayload<TData>(
  data: TData,
  message = '',
  meta: Omit<ApiResponsePayload<TData>, 'data' | 'message' | typeof RESPONSE_PAYLOAD> = {},
): ApiResponsePayload<TData> {
  return {
    data,
    message,
    ...meta,
    [RESPONSE_PAYLOAD]: true,
  };
}

export function isApiResponsePayload(value: unknown): value is ApiResponsePayload<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { [RESPONSE_PAYLOAD]?: unknown })[RESPONSE_PAYLOAD] === true
  );
}
