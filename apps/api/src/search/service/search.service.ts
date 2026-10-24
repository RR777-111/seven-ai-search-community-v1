import {
  Inject,
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SearchCacheStatus, SearchSourceCounts, SearchTiming } from '@seven-ai-search/types';
import { createHash, randomUUID } from 'node:crypto';
import {
  SEARCH_CACHE_ENABLED,
  SEARCH_CACHE_TTL,
  SEARCH_FETCH_TIME_BUDGET_MS,
  SEARCH_TIMEOUT,
} from '../../config/app.config';
import {
  createResponsePayload,
  type ApiResponsePayload,
} from '../../common/response/response-payload';
import { QUERY_PROCESSOR, type QueryProcessor } from '../interfaces/query-processor.interface';
import {
  REDIS_SEARCH_CACHE,
  type RedisSearchCache,
} from '../interfaces/redis-search-cache.interface';
import { SEARCH_CACHE, type SearchCache } from '../interfaces/search-cache.interface';
import {
  SEARCH_PROVIDER,
  type SearchProvider,
  SearchProviderTimeoutException,
} from '../interfaces/search-provider.interface';
import { SEARCH_METRICS, type SearchMetrics } from '../interfaces/search-metrics.interface';
import type { SearchResult } from '../interfaces/search-result.interface';
import { ResourceFilter } from '../resource-filter/resource-filter.service';
import { normalizeAllowedResourceSource } from '../resource-source/resource-source.config';

export const SEARCH_RESULT_LIMIT = 300;
export const SEARCH_RESULT_SOFT_TARGET_PER_SOURCE = 60;
export const SEARCH_DRIVE_WHITELIST_VERSION = 'v4';
export const SEARCH_CACHE_VERSION = 'v5';
export const SEARCH_PROVIDER_RETRY_DELAY_MS = 300;
export const NO_RESULTS_MESSAGE = '未找到有效资源，请重新输入关键词';
export const SEARCH_TIMEOUT_CODE = 'SEARCH_TIMEOUT';
export const SEARCH_STALE_FALLBACK_NOTICE = '实时搜索响应较慢，当前展示近期缓存结果。';
export const DEFAULT_SEARCH_TIMEOUT_MS = 10000;
export const DEFAULT_SEARCH_FETCH_TIME_BUDGET_MS = 6000;
export const DEFAULT_SEARCH_CACHE_TTL_SECONDS = 300;
export const SEARCH_STALE_CACHE_TTL_SECONDS = 72 * 60 * 60;
const SEARCH_RESULTS_PAGE = 1;

const BRACKETED_TITLE_TAG_PATTERN =
  /【([^】]{0,40})】|\[([^\]]{0,40})\]|\(([^)]{0,40})\)|（([^）]{0,40})）|《([^》]{0,40})》|「([^」]{0,40})」|『([^』]{0,40})』/gu;
const DECORATIVE_SYMBOL_PATTERN = /[\p{Extended_Pictographic}\uFE0F★☆◆◇●○◎■□▲△▼▽※＊*]+/gu;
const REPEATED_SEPARATOR_PATTERN = /(?:[-_=+~～|｜/\\]{2,})+/g;
const TITLE_SEGMENT_SEPARATOR_PATTERN = /\s*[|｜]+\s*/gu;
const EDGE_SEPARATOR_PATTERN =
  /^[\s\-_=+~～|｜/\\:：,，.。;；!！?？]+|[\s\-_=+~～|｜/\\:：,，.。;；!！?？]+$/g;
const REPEATED_SOURCE_LABEL_PATTERN =
  /(百度网盘|夸克网盘|迅雷(?:云盘|网盘)|阿里云盘|UC网盘)(?:\s*(?:[|｜/·,:：-]+\s*)?\1)+/giu;
const PROMOTION_TAIL_PATTERN =
  /(?:\s*(?:[|｜/·,:：-]+)\s*)?(?:更多资源请访问|更多资源(?:请)?关注|关注公众号|资源来自\S*分享站|网盘资源分享(?:站|群)|加入\S*资源群|访问\S*分享站).*$/iu;
const MINIMUM_CREDIBLE_RESOURCE_TIME = Date.UTC(1970, 0, 1);

type SearchProviderAttempt = {
  results: SearchResult[];
  error?: unknown;
};

interface SearchCacheValue {
  items: SearchResult[];
  rawCount: number;
  exhausted: boolean;
  truncated: boolean;
  sourceCounts: SearchSourceCounts;
}

interface RedisSearchCachePayload extends SearchCacheValue {
  cacheVersion: typeof SEARCH_CACHE_VERSION;
  resultCount: number;
  createdAt: string;
  freshUntil: string;
  normalizedQueryHash: string;
  upstreamSource: 'pansou';
  maxResults: typeof SEARCH_RESULT_LIMIT;
  whitelistVersion: typeof SEARCH_DRIVE_WHITELIST_VERSION;
}

interface SearchCacheIdentity {
  key: string;
  normalizedQuery: string;
  normalizedQueryHash: string;
  cacheKeyHash: string;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @Inject(SEARCH_PROVIDER)
    private readonly searchProvider: SearchProvider,
    private readonly resourceFilter: ResourceFilter,
    @Inject(QUERY_PROCESSOR)
    private readonly queryProcessor: QueryProcessor,
    @Inject(SEARCH_METRICS)
    private readonly searchMetrics: SearchMetrics,
    @Inject(SEARCH_CACHE)
    private readonly searchCache: SearchCache,
    private readonly configService: ConfigService,
    @Optional()
    @Inject(REDIS_SEARCH_CACHE)
    private readonly redisSearchCache?: RedisSearchCache,
  ) {}

  async search(keyword: string): Promise<ApiResponsePayload<SearchResult[]>> {
    const startedAt = Date.now();
    const cacheIdentity = createSearchCacheIdentity(keyword);
    const timing = createInitialSearchTiming(randomUUID(), cacheIdentity);
    let staleCandidate: RedisSearchCachePayload | null = null;

    try {
      const cacheEnabled = this.isSearchCacheEnabled();

      if (cacheEnabled) {
        const memoryStartedAt = Date.now();
        const cachedValue = this.readMemoryCache(cacheIdentity.key, timing);
        timing.memoryCacheMs = Date.now() - memoryStartedAt;
        if (isSearchCacheValue(cachedValue) && cachedValue.items.length > 0) {
          const filterStartedAt = Date.now();
          const cleaned = cleanSearchResults(cachedValue.items, this.resourceFilter);
          timing.filterDedupeMs = Date.now() - filterStartedAt;
          timing.rawCount = cachedValue.rawCount;
          timing.validCount = cleaned.results.length;
          timing.resultCount = cleaned.results.length;
          timing.cacheHit = true;
          timing.cacheStatus = 'memory_fresh';

          const truncated = cachedValue.truncated || cleaned.truncated;
          const exhausted = cachedValue.exhausted && !truncated;
                    return this.createTimedSearchResponse({
            results: cleaned.results,
            exhausted,
            truncated,
            sourceCounts: countSearchResultSources(cleaned.results),
            startedAt,
            timing,
          });
        }

        const redisStartedAt = Date.now();
        const redisPayload = await this.readRedisCache(cacheIdentity, timing);
        timing.redisCacheMs = Date.now() - redisStartedAt;
        if (redisPayload) {
          if (isFreshRedisCachePayload(redisPayload) && redisPayload.items.length > 0) {
            this.writeMemoryCache(
              cacheIdentity.key,
              toSearchCacheValue(redisPayload),
              getRemainingTtlSeconds(redisPayload.freshUntil),
              timing,
            );

            const filterStartedAt = Date.now();
            const cleaned = cleanSearchResults(redisPayload.items, this.resourceFilter);
            timing.filterDedupeMs = Date.now() - filterStartedAt;
            timing.rawCount = redisPayload.rawCount;
            timing.validCount = cleaned.results.length;
            timing.resultCount = cleaned.results.length;
            timing.cacheHit = true;
            timing.cacheStatus = 'redis_fresh';

            const truncated = redisPayload.truncated || cleaned.truncated;
            const exhausted = redisPayload.exhausted && !truncated;
                        return this.createTimedSearchResponse({
              results: cleaned.results,
              exhausted,
              truncated,
              sourceCounts: countSearchResultSources(cleaned.results),
              startedAt,
              timing,
            });
          }

          staleCandidate = redisPayload;
        }
      }

      const queryStartedAt = Date.now();
      const queries = await this.queryProcessor.process(keyword);
      timing.queryOptimizeMs = Date.now() - queryStartedAt;
      this.searchMetrics.recordQueryCount(queries.length);

      const providerStartedAt = Date.now();
      const fetchTimeBudgetMs = this.getSearchFetchTimeBudgetMs();
      const providerAttempts = await Promise.all(
        queries.map((query) => this.searchProviderSafely(query, fetchTimeBudgetMs)),
      );
      timing.panSouMs = Date.now() - providerStartedAt;
      const providerResults = providerAttempts.flatMap((attempt) => attempt.results);
      timing.rawCount = providerResults.length;
      timing.panSouStatus = getPanSouStatus(providerAttempts, providerResults.length);

      if (
        providerResults.length === 0 &&
        providerAttempts.length > 0 &&
        providerAttempts.every((attempt) => attempt.error !== undefined)
      ) {
        const providerError = createSearchProviderError(providerAttempts);
        timing.timeoutReason = getTimeoutReason(providerError);
        if (isStaleFallbackError(providerError)) {
          const staleResponse = await this.createStaleFallbackResponse({
            payload: staleCandidate,
            startedAt,
            timing,
          });
          if (staleResponse) {
            return staleResponse;
          }
        }

        throw providerError;
      }

      const filterStartedAt = Date.now();
      const cleaned = cleanSearchResults(providerResults, this.resourceFilter);
      timing.filterDedupeMs = Date.now() - filterStartedAt;
      const results = cleaned.results;
      timing.validCount = results.length;
      timing.resultCount = results.length;
      const truncated =
        cleaned.truncated || providerAttempts.some((attempt) => attempt.error !== undefined);
      const exhausted = !truncated;
      const sourceCounts = countSearchResultSources(results);

      if (cacheEnabled && results.length > 0) {
        const cacheWriteStartedAt = Date.now();
        const cacheValue = {
          items: results,
          rawCount: timing.rawCount,
          exhausted,
          truncated,
          sourceCounts,
        };
        this.writeMemoryCache(
          cacheIdentity.key,
          cacheValue,
          this.getSearchCacheTtlSeconds(),
          timing,
        );
        await this.writeRedisCache(cacheIdentity, cacheValue, timing);
        timing.cacheWriteMs = Date.now() - cacheWriteStartedAt;
      }

      return this.createTimedSearchResponse({
        results,
        exhausted,
        truncated,
        sourceCounts,
        startedAt,
        timing,
      });
    } catch (error) {
      timing.totalMs = Date.now() - startedAt;
      timing.finalStatus = 'failed';
      timing.timeoutReason = timing.timeoutReason ?? getTimeoutReason(error);
      this.logger.warn(
        {
          event: 'search_timing',
          requestId: timing.requestId,
          keywordHash: timing.keywordHash,
          cacheKeyHash: timing.cacheKeyHash,
          cacheVersion: timing.cacheVersion,
          cacheStatus: timing.cacheStatus,
          cacheHit: timing.cacheHit,
          memoryCacheMs: timing.memoryCacheMs,
          redisCacheMs: timing.redisCacheMs,
          queryOptimizeMs: timing.queryOptimizeMs,
          panSouMs: timing.panSouMs,
          filterDedupeMs: timing.filterDedupeMs,
          cacheWriteMs: timing.cacheWriteMs,
          totalMs: timing.totalMs,
          rawCount: timing.rawCount,
          validCount: timing.validCount,
          resultCount: timing.resultCount,
          panSouStatus: timing.panSouStatus,
          timeoutReason: timing.timeoutReason,
          staleFallback: timing.staleFallback,
          finalStatus: timing.finalStatus,
          outcome: 'failed',
        },
        'search failed',
      );
      if (error instanceof SearchProviderTimeoutException) {
        throw createSearchTimeoutException();
      }
      throw error;
    }
  }

  private createTimedSearchResponse(input: {
    results: SearchResult[];
    exhausted: boolean;
    truncated: boolean;
    sourceCounts: SearchSourceCounts;
    startedAt: number;
    timing: SearchTiming;
  }): ApiResponsePayload<SearchResult[]> {
    input.timing.exhausted = input.exhausted;
    input.timing.truncated = input.truncated;
    input.timing.totalMs = Date.now() - input.startedAt;
    input.timing.finalStatus = 'success';
    input.timing.resultCount = input.results.length;
    this.searchMetrics.recordSearchTiming({ ...input.timing });
    this.logger.log({ event: 'search_timing', ...input.timing }, 'search completed');

    return createSearchResponse(input.results, {
      cacheHit: input.timing.cacheHit,
      cacheStatus: input.timing.cacheStatus ?? 'miss',
      exhausted: input.exhausted,
      sourceCounts: input.sourceCounts,
      staleFallback: Boolean(input.timing.staleFallback),
      timing: input.timing,
      truncated: input.truncated,
    });
  }

  private async createStaleFallbackResponse(input: {
    payload: RedisSearchCachePayload | null;
    startedAt: number;
    timing: SearchTiming;
  }): Promise<ApiResponsePayload<SearchResult[]> | null> {
    if (!input.payload || !isStaleFallbackEligible(input.payload)) {
      return null;
    }

    const filterStartedAt = Date.now();
    const cleaned = cleanSearchResults(input.payload.items, this.resourceFilter);
    input.timing.filterDedupeMs = Date.now() - filterStartedAt;
    if (cleaned.results.length === 0) {
      return null;
    }

    input.timing.rawCount = input.payload.rawCount;
    input.timing.validCount = cleaned.results.length;
    input.timing.resultCount = cleaned.results.length;
    input.timing.cacheHit = true;
    input.timing.cacheStatus = 'redis_stale';
    input.timing.staleFallback = true;
    const truncated = input.payload.truncated || cleaned.truncated;
    const exhausted = input.payload.exhausted && !truncated;

    return this.createTimedSearchResponse({
      results: cleaned.results,
      exhausted,
      truncated,
      sourceCounts: countSearchResultSources(cleaned.results),
      startedAt: input.startedAt,
      timing: input.timing,
    });
  }

  private readMemoryCache(key: string, timing: SearchTiming): SearchCacheValue | undefined {
    try {
      return this.searchCache.get<SearchCacheValue>(key);
    } catch (error) {
      this.logCacheWarning('memory_get', error, timing);
      return undefined;
    }
  }

  private writeMemoryCache(
    key: string,
    value: SearchCacheValue,
    ttlSeconds: number,
    timing: SearchTiming,
  ): void {
    try {
      this.searchCache.set<SearchCacheValue>(key, value, ttlSeconds);
    } catch (error) {
      this.logCacheWarning('memory_set', error, timing);
    }
  }

  private async readRedisCache(
    identity: SearchCacheIdentity,
    timing: SearchTiming,
  ): Promise<RedisSearchCachePayload | null> {
    if (!this.redisSearchCache) {
      return null;
    }

    try {
      const rawPayload = await this.redisSearchCache.get(identity.key);
      if (!rawPayload) {
        return null;
      }

      const payload = parseRedisSearchCachePayload(rawPayload, identity.normalizedQueryHash);
      if (!payload) {
        this.logCacheWarning('redis_get', new Error('invalid_payload'), timing);
      }
      return payload;
    } catch (error) {
      this.logCacheWarning('redis_get', error, timing);
      return null;
    }
  }

  private async writeRedisCache(
    identity: SearchCacheIdentity,
    value: SearchCacheValue,
    timing: SearchTiming,
  ): Promise<void> {
    if (!this.redisSearchCache) {
      return;
    }

    try {
      await this.redisSearchCache.set(
        identity.key,
        JSON.stringify(
          createRedisSearchCachePayload(identity, value, this.getSearchCacheTtlSeconds()),
        ),
        SEARCH_STALE_CACHE_TTL_SECONDS,
      );
    } catch (error) {
      this.logCacheWarning('redis_set', error, timing);
    }
  }

  private logCacheWarning(operation: string, error: unknown, timing: SearchTiming): void {
    this.logger.warn(
      {
        operation,
        errorCategory: getErrorCategory(error),
        requestId: timing.requestId,
        cacheKeyHash: timing.cacheKeyHash,
      },
      'search cache operation failed',
    );
  }

  private async searchProviderSafely(
    query: string,
    fetchTimeBudgetMs: number,
  ): Promise<SearchProviderAttempt> {
    const startedAt = Date.now();

    try {
      const results = await this.searchProviderWithRetry(query, fetchTimeBudgetMs);
      return { results };
    } catch (error) {
      return { results: [], error };
    } finally {
      this.searchMetrics.recordProviderDuration(Date.now() - startedAt);
    }
  }

  private getSearchTimeoutMs(): number {
    const configuredTimeout = Number(
      this.configService.get<string>(SEARCH_TIMEOUT) ?? DEFAULT_SEARCH_TIMEOUT_MS,
    );

    return Number.isInteger(configuredTimeout) && configuredTimeout > 0
      ? configuredTimeout
      : DEFAULT_SEARCH_TIMEOUT_MS;
  }

  private getSearchFetchTimeBudgetMs(): number {
    const configuredBudget = Number(
      this.configService.get<string>(SEARCH_FETCH_TIME_BUDGET_MS) ??
        DEFAULT_SEARCH_FETCH_TIME_BUDGET_MS,
    );

    return Number.isInteger(configuredBudget) && configuredBudget > 0
      ? configuredBudget
      : DEFAULT_SEARCH_FETCH_TIME_BUDGET_MS;
  }

  private async searchProviderWithRetry(
    query: string,
    fetchTimeBudgetMs: number,
  ): Promise<SearchResult[]> {
    const startedAt = Date.now();

    try {
      return await this.searchProviderOnce(
        query,
        Math.min(this.getSearchTimeoutMs(), fetchTimeBudgetMs),
      );
    } catch (error) {
      const remainingBudgetMs = fetchTimeBudgetMs - (Date.now() - startedAt);
      if (remainingBudgetMs <= SEARCH_PROVIDER_RETRY_DELAY_MS + 100) {
        throw error;
      }

      await delay(SEARCH_PROVIDER_RETRY_DELAY_MS);
      return this.searchProviderOnce(
        query,
        Math.min(this.getSearchTimeoutMs(), remainingBudgetMs - SEARCH_PROVIDER_RETRY_DELAY_MS),
      );
    }
  }

  private searchProviderOnce(query: string, timeoutMs: number): Promise<SearchResult[]> {
    return withTimeout(this.searchProvider.search(query, { timeoutMs }), timeoutMs);
  }

  private isSearchCacheEnabled(): boolean {
    return this.configService.get<string>(SEARCH_CACHE_ENABLED) !== 'false';
  }

  private getSearchCacheTtlSeconds(): number {
    const configuredTtl = Number(
      this.configService.get<string>(SEARCH_CACHE_TTL) ?? DEFAULT_SEARCH_CACHE_TTL_SECONDS,
    );

    return Number.isInteger(configuredTtl) && configuredTtl > 0
      ? configuredTtl
      : DEFAULT_SEARCH_CACHE_TTL_SECONDS;
  }
}

function createSearchResponse(
  results: SearchResult[],
  metadata: {
    cacheHit: boolean;
    cacheStatus: SearchCacheStatus;
    exhausted: boolean;
    sourceCounts: SearchSourceCounts;
    staleFallback: boolean;
    timing: SearchTiming;
    truncated: boolean;
  },
): ApiResponsePayload<SearchResult[]> {
  const message = results.length === 0 ? NO_RESULTS_MESSAGE : '';
  return createResponsePayload(results, message, {
    total: results.length,
    page: SEARCH_RESULTS_PAGE,
    pageSize: SEARCH_RESULT_LIMIT,
    maxResults: SEARCH_RESULT_LIMIT,
    ...metadata,
    ...(metadata.staleFallback ? { searchNotice: SEARCH_STALE_FALLBACK_NOTICE } : {}),
  });
}

function createSearchProviderError(providerAttempts: readonly SearchProviderAttempt[]): Error {
  const firstError = providerAttempts.find((attempt) => attempt.error !== undefined)?.error;

  return firstError instanceof Error
    ? firstError
    : new ServiceUnavailableException('Search provider is unavailable.');
}

function createSearchCacheIdentity(keyword: string): SearchCacheIdentity {
  const normalizedQuery = normalizeText(keyword);
  const normalizedQueryHash = createHexHash(normalizedQuery, 32);
  const key = `seven-community:search:${SEARCH_CACHE_VERSION}:${normalizedQueryHash}`;
  return {
    key,
    normalizedQuery,
    normalizedQueryHash,
    cacheKeyHash: createHexHash(key, 32),
  };
}

function createHexHash(value: string, length: number): string {
  return createHash('sha256').update(value).digest('hex').slice(0, length);
}

function createRedisSearchCachePayload(
  identity: SearchCacheIdentity,
  value: SearchCacheValue,
  freshTtlSeconds: number,
): RedisSearchCachePayload {
  const now = Date.now();
  return {
    cacheVersion: SEARCH_CACHE_VERSION,
    items: value.items,
    resultCount: value.items.length,
    rawCount: value.rawCount,
    createdAt: new Date(now).toISOString(),
    freshUntil: new Date(now + freshTtlSeconds * 1000).toISOString(),
    normalizedQueryHash: identity.normalizedQueryHash,
    upstreamSource: 'pansou',
    exhausted: value.exhausted,
    truncated: value.truncated,
    sourceCounts: value.sourceCounts,
    maxResults: SEARCH_RESULT_LIMIT,
    whitelistVersion: SEARCH_DRIVE_WHITELIST_VERSION,
  };
}

function toSearchCacheValue(payload: RedisSearchCachePayload): SearchCacheValue {
  return {
    items: payload.items,
    rawCount: payload.rawCount,
    exhausted: payload.exhausted,
    truncated: payload.truncated,
    sourceCounts: payload.sourceCounts,
  };
}

function parseRedisSearchCachePayload(
  rawPayload: string,
  normalizedQueryHash: string,
): RedisSearchCachePayload | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawPayload);
  } catch {
    return null;
  }

  if (!isRedisSearchCachePayload(parsed, normalizedQueryHash)) {
    return null;
  }

  return parsed;
}

function isRedisSearchCachePayload(
  value: unknown,
  normalizedQueryHash: string,
): value is RedisSearchCachePayload {
  if (!isSearchCacheValue(value)) {
    return false;
  }

  const candidate = value as SearchCacheValue & Partial<RedisSearchCachePayload>;
  return (
    candidate.cacheVersion === SEARCH_CACHE_VERSION &&
    candidate.normalizedQueryHash === normalizedQueryHash &&
    candidate.upstreamSource === 'pansou' &&
    candidate.maxResults === SEARCH_RESULT_LIMIT &&
    candidate.whitelistVersion === SEARCH_DRIVE_WHITELIST_VERSION &&
    Number.isInteger(candidate.resultCount) &&
    candidate.resultCount === candidate.items?.length &&
    isIsoDate(candidate.createdAt) &&
    isIsoDate(candidate.freshUntil) &&
    candidate.items.every(isSafeCachedSearchResult)
  );
}

function isFreshRedisCachePayload(payload: RedisSearchCachePayload): boolean {
  return Date.parse(payload.freshUntil) > Date.now();
}

function isStaleFallbackEligible(payload: RedisSearchCachePayload): boolean {
  const createdAt = Date.parse(payload.createdAt);
  return (
    Number.isFinite(createdAt) &&
    Date.now() - createdAt <= SEARCH_STALE_CACHE_TTL_SECONDS * 1000 &&
    payload.items.length > 0
  );
}

function getRemainingTtlSeconds(freshUntil: string): number {
  return Math.max(1, Math.ceil((Date.parse(freshUntil) - Date.now()) / 1000));
}

function isSafeCachedSearchResult(result: unknown): result is SearchResult {
  if (!result || typeof result !== 'object') {
    return false;
  }

  const candidate = result as Partial<SearchResult>;
  return (
    isNonEmptyString(candidate.type) &&
    isNonEmptyString(candidate.title) &&
    isNonEmptyString(candidate.url) &&
    normalizeAllowedResourceSource({
      source: candidate.source,
      type: candidate.type,
      url: candidate.url,
    }) !== undefined
  );
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function getPanSouStatus(
  providerAttempts: readonly SearchProviderAttempt[],
  resultCount: number,
): NonNullable<SearchTiming['panSouStatus']> {
  if (providerAttempts.length === 0) {
    return 'not_called';
  }
  if (providerAttempts.every((attempt) => attempt.error === undefined)) {
    return 'success';
  }
  if (resultCount > 0) {
    return 'partial';
  }
  if (providerAttempts.some((attempt) => attempt.error instanceof SearchProviderTimeoutException)) {
    return 'timeout';
  }
  return 'error';
}

function getTimeoutReason(error: unknown): string | null {
  return error instanceof SearchProviderTimeoutException ? 'pansou_timeout' : null;
}

function isStaleFallbackError(error: unknown): boolean {
  return (
    error instanceof SearchProviderTimeoutException || error instanceof ServiceUnavailableException
  );
}

function createSearchTimeoutException(): ServiceUnavailableException {
  return new ServiceUnavailableException({
    code: SEARCH_TIMEOUT_CODE,
    message: 'Search provider timed out.',
  });
}

function getErrorCategory(error: unknown): string {
  return error instanceof Error && error.name.trim().length > 0 ? error.name : 'unknown';
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new SearchProviderTimeoutException());
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) {
      clearTimeout(timeout);
    }
  });
}

export function normalizeSearchResult(result: SearchResult): SearchResult {
  const source = normalizeAllowedResourceSource({
    source: result.source,
    type: result.type,
    url: result.url,
  });

  return {
    type: source?.label ?? result.type,
    title: normalizeSearchTitle(result.title),
    url: result.url,
    ...createOptionalSearchResultFields({
      ...result,
      source: source?.id,
    }),
  };
}

function cleanSearchResults(
  results: readonly SearchResult[],
  resourceFilter: ResourceFilter,
): { results: SearchResult[]; truncated: boolean } {
  const filteredResults = resourceFilter.filter(results);
  const deduplicatedResults = deduplicateSearchResults(filteredResults.map(normalizeSearchResult));
  return {
    results: aggregateSearchResults(deduplicatedResults),
    truncated: deduplicatedResults.length > SEARCH_RESULT_LIMIT,
  };
}

function createOptionalSearchResultFields(
  result: SearchResult,
): Pick<SearchResult, 'source' | 'createdAt' | 'updatedAt' | 'resourceTime'> {
  const source = isNonEmptyString(result.source) ? result.source : undefined;

  return {
    ...(source ? { source } : {}),
    ...(isNonEmptyString(result.createdAt) ? { createdAt: result.createdAt.trim() } : {}),
    ...(isNonEmptyString(result.updatedAt) ? { updatedAt: result.updatedAt.trim() } : {}),
    resourceTime: normalizeResourceTime(result),
  };
}

function normalizeSearchTitle(title: string): string {
  const originalSafeTitle = title.trim().replace(/\s+/g, ' ');
  const normalizedTitle = title
    .replace(BRACKETED_TITLE_TAG_PATTERN, (matchedTag, ...groups: Array<string | undefined>) => {
      const tagContent = groups.find((group) => group !== undefined) ?? '';
      return isLowValueTitleTag(tagContent) ? ' ' : matchedTag;
    })
    .replace(DECORATIVE_SYMBOL_PATTERN, ' ')
    .replace(REPEATED_SEPARATOR_PATTERN, ' | ')
    .replace(TITLE_SEGMENT_SEPARATOR_PATTERN, ' | ')
    .replace(REPEATED_SOURCE_LABEL_PATTERN, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  const cleanedSegments: string[] = [];
  const seenSegments = new Set<string>();
  for (const rawSegment of normalizedTitle.split(' | ')) {
    const segment = collapseRepeatedTitleWords(
      rawSegment.replace(PROMOTION_TAIL_PATTERN, '').replace(EDGE_SEPARATOR_PATTERN, '').trim(),
    );
    if (!segment) {
      continue;
    }

    const segmentKey = normalizeText(segment);
    if (!seenSegments.has(segmentKey)) {
      seenSegments.add(segmentKey);
      cleanedSegments.push(segment);
    }
  }

  const cleanedTitle = cleanedSegments.join(' ').replace(/\s+/g, ' ').trim();
  return cleanedTitle.length > 0 ? cleanedTitle : originalSafeTitle;
}

function isLowValueTitleTag(tagContent: string): boolean {
  const compactTag = tagContent
    .trim()
    .toLowerCase()
    .replace(DECORATIVE_SYMBOL_PATTERN, '')
    .replace(/\s+/g, '');

  if (compactTag.length === 0 || /^[\p{P}\p{S}]+$/u.test(compactTag)) {
    return true;
  }

  if (/^(?:\d{4})?最新$/u.test(compactTag)) {
    return true;
  }

  if (/^(?:高清|超清|蓝光|无水印|完整版|完结|全集)$/u.test(compactTag)) {
    return true;
  }

  return false;
}

function deduplicateSearchResults(results: readonly SearchResult[]): SearchResult[] {
  const seenUrls = new Set<string>();
  const uniqueResults: SearchResult[] = [];

  for (const result of results) {
    const urlKey = createUrlDeduplicationKey(result.url);

    if (seenUrls.has(urlKey)) {
      continue;
    }

    seenUrls.add(urlKey);
    uniqueResults.push(result);
  }

  return uniqueResults;
}

function aggregateSearchResults(results: readonly SearchResult[]): SearchResult[] {
  if (results.length <= SEARCH_RESULT_LIMIT) {
    return [...results];
  }

  const selectedResults: SearchResult[] = [];
  const selectedIndexes = new Set<number>();
  const sourceCounts = new Map<string, number>();

  for (const [index, result] of results.entries()) {
    const sourceKey = getSearchResultSourceKey(result);
    const sourceCount = sourceCounts.get(sourceKey) ?? 0;
    if (sourceCount >= SEARCH_RESULT_SOFT_TARGET_PER_SOURCE) {
      continue;
    }

    sourceCounts.set(sourceKey, sourceCount + 1);
    selectedIndexes.add(index);
    selectedResults.push(result);
  }

  for (const [index, result] of results.entries()) {
    if (selectedResults.length >= SEARCH_RESULT_LIMIT) {
      break;
    }
    if (selectedIndexes.has(index)) {
      continue;
    }

    selectedResults.push(result);
  }

  return selectedResults.slice(0, SEARCH_RESULT_LIMIT);
}

function getSearchResultSourceKey(result: SearchResult): string {
  if (isNonEmptyString(result.source)) {
    return normalizeText(result.source);
  }

  const source = normalizeAllowedResourceSource({
    source: result.source,
    type: result.type,
    url: result.url,
  });

  return source?.id ?? normalizeText(result.source ?? result.type);
}

function delay(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function normalizeResourceTime(result: SearchResult): string | null {
  for (const value of [result.resourceTime, result.updatedAt, result.createdAt]) {
    if (!isNonEmptyString(value)) {
      continue;
    }

    const time = Date.parse(value);
    if (Number.isFinite(time) && time >= MINIMUM_CREDIBLE_RESOURCE_TIME) {
      return new Date(time).toISOString();
    }
  }

  return null;
}

function collapseRepeatedTitleWords(value: string): string {
  const words = value.split(/\s+/u).filter(Boolean);
  if (words.length < 2) {
    return value;
  }

  const collapsed: string[] = [];
  for (let index = 0; index < words.length;) {
    let repeatedLength = 0;
    const maxCandidateLength = Math.floor((words.length - index) / 2);

    for (let candidateLength = maxCandidateLength; candidateLength >= 1; candidateLength -= 1) {
      const first = words.slice(index, index + candidateLength).join('\u0000');
      const second = words
        .slice(index + candidateLength, index + candidateLength * 2)
        .join('\u0000');
      if (first === second) {
        repeatedLength = candidateLength;
        break;
      }
    }

    const copyLength = repeatedLength || 1;
    collapsed.push(...words.slice(index, index + copyLength));
    index += repeatedLength ? repeatedLength * 2 : 1;
  }

  return collapsed.join(' ');
}

function createUrlDeduplicationKey(value: string): string {
  const trimmedValue = value.trim();

  try {
    const url = new URL(trimmedValue);
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    return url.toString();
  } catch {
    return trimmedValue;
  }
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function createInitialSearchTiming(
  requestId: string,
  cacheIdentity: SearchCacheIdentity,
): SearchTiming {
  return {
    requestId,
    cacheHit: false,
    keywordHash: cacheIdentity.normalizedQueryHash,
    cacheKeyHash: cacheIdentity.cacheKeyHash,
    cacheVersion: SEARCH_CACHE_VERSION,
    cacheStatus: 'miss',
    memoryCacheMs: 0,
    redisCacheMs: 0,
    queryOptimizeMs: 0,
    panSouMs: 0,
    filterDedupeMs: 0,
    cacheWriteMs: 0,
    totalMs: 0,
    rawCount: 0,
    validCount: 0,
    resultCount: 0,
    panSouStatus: 'not_called',
    timeoutReason: null,
    staleFallback: false,
    finalStatus: 'failed',
    exhausted: false,
    truncated: false,
  };
}

function countSearchResultSources(results: readonly SearchResult[]): SearchSourceCounts {
  const counts: SearchSourceCounts = {
    BAIDU: 0,
    QUARK: 0,
    XUNLEI: 0,
    ALIYUN: 0,
    UC: 0,
  };

  for (const result of results) {
    const source = normalizeAllowedResourceSource({
      source: result.source,
      type: result.type,
      url: result.url,
    });
    if (source) {
      counts[source.id] += 1;
    }
  }

  return counts;
}

function isSearchCacheValue(value: unknown): value is SearchCacheValue {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<SearchCacheValue>;
  return (
    Array.isArray(candidate.items) &&
    Number.isInteger(candidate.rawCount) &&
    Number(candidate.rawCount) >= candidate.items.length &&
    typeof candidate.exhausted === 'boolean' &&
    typeof candidate.truncated === 'boolean' &&
    typeof candidate.sourceCounts === 'object' &&
    candidate.sourceCounts !== null
  );
}
