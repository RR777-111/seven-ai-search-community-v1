import { Module } from '@nestjs/common';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { PanSouAdapter } from './adapters/pansou.adapter';
import { MemorySearchCache } from './cache/memory-search-cache';
import { IoredisSearchCache } from './cache/redis-search-cache';
import { SearchInFlightService } from './concurrency/search-in-flight.service';
import { SearchController } from './controller/search.controller';
import { QUERY_PROCESSOR } from './interfaces/query-processor.interface';
import { SEARCH_CACHE } from './interfaces/search-cache.interface';
import { REDIS_SEARCH_CACHE } from './interfaces/redis-search-cache.interface';
import { SEARCH_PROVIDER } from './interfaces/search-provider.interface';
import { SEARCH_METRICS } from './interfaces/search-metrics.interface';
import { NoopSearchMetrics } from './metrics/noop-search-metrics';
import { RuleBasedQueryProcessor } from './query-processor/rule-based-query-processor';
import { ResourceFilter } from './resource-filter/resource-filter.service';
import { SearchService } from './service/search.service';

@Module({ imports: [RateLimitModule], controllers: [SearchController], providers: [SearchService, SearchInFlightService, MemorySearchCache, IoredisSearchCache, ResourceFilter, RuleBasedQueryProcessor, NoopSearchMetrics, { provide: QUERY_PROCESSOR, useExisting: RuleBasedQueryProcessor }, { provide: SEARCH_PROVIDER, useClass: PanSouAdapter }, { provide: SEARCH_METRICS, useExisting: NoopSearchMetrics }, { provide: SEARCH_CACHE, useExisting: MemorySearchCache }, { provide: REDIS_SEARCH_CACHE, useExisting: IoredisSearchCache }] })
export class SearchModule {}
