import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ConfigService } from '@nestjs/config';
import type { SearchSourceId } from '@seven-ai-search/types';
import { MemorySearchCache } from '../cache/memory-search-cache';
import type { RedisSearchCache } from '../interfaces/redis-search-cache.interface';
import type { SearchMetrics } from '../interfaces/search-metrics.interface';
import type { SearchProvider } from '../interfaces/search-provider.interface';
import { SearchProviderTimeoutException } from '../interfaces/search-provider.interface';
import type { SearchResult } from '../interfaces/search-result.interface';
import { RuleBasedQueryProcessor } from '../query-processor/rule-based-query-processor';
import { ResourceFilter } from '../resource-filter/resource-filter.service';
import { SEARCH_CACHE_VERSION, SEARCH_RESULT_LIMIT, SEARCH_RESULT_SOFT_TARGET_PER_SOURCE, SearchService, normalizeSearchResult } from './search.service';

const SOURCES: Record<SearchSourceId, { type: string; base: string }> = {
  BAIDU: { type: '百度网盘', base: 'https://pan.baidu.com/s/' },
  QUARK: { type: '夸克网盘', base: 'https://pan.quark.cn/s/' },
  XUNLEI: { type: '迅雷云盘', base: 'https://pan.xunlei.com/s/' },
  ALIYUN: { type: '阿里云盘', base: 'https://www.aliyundrive.com/s/' },
  UC: { type: 'UC网盘', base: 'https://drive.uc.cn/s/' },
};

function makeResult(source: SearchSourceId, index: number, title = `计算机基础教程 ${index}`): SearchResult {
  return { source, type: SOURCES[source].type, title, url: `${SOURCES[source].base}${source}-${index}` };
}

function makeResults(counts: Partial<Record<SearchSourceId, number>>): SearchResult[] {
  return (Object.keys(SOURCES) as SearchSourceId[]).flatMap((source) =>
    Array.from({ length: counts[source] ?? 0 }, (_, index) => makeResult(source, index)));
}

function createHarness(initialResults: SearchResult[]) {
  let providerResults = initialResults;
  let providerError: Error | null = null;
  let providerCalls = 0;
  const config = { get: (key: string) => key === 'SEARCH_FETCH_TIME_BUDGET_MS' ? '100' : undefined } as ConfigService;
  const memory = new MemorySearchCache(config);
  const redisValues = new Map<string, string>();
  const redis: RedisSearchCache = {
    get: async (key) => redisValues.get(key) ?? null,
    set: async (key, value) => { redisValues.set(key, value); },
    scanKeys: async () => [],
    ttl: async () => -1,
    dbSize: async () => redisValues.size,
  };
  const provider: SearchProvider = {
    search: async () => {
      providerCalls += 1;
      if (providerError) throw providerError;
      return providerResults;
    },
  };
  const metrics: SearchMetrics = {
    recordProviderDuration: () => undefined,
    recordQueryCount: () => undefined,
    recordSearchTiming: () => undefined,
  };
  const service = new SearchService(
    provider, new ResourceFilter(), new RuleBasedQueryProcessor(), metrics, memory, config, redis,
  );
  return {
    service, memory, redisValues,
    get providerCalls() { return providerCalls; },
    setProviderResults(value: SearchResult[]) { providerResults = value; },
    setProviderError(value: Error) { providerError = value; },
  };
}

describe('Community search quality and 500-result allocation', () => {
  it('preserves technical title symbols through fresh, memory, Redis and stale results', async () => {
    for (const [keyword, titles, noise] of [
      ['C++', ['C++ Primer', 'C++17入门'], 'C语言 Primer'],
      ['.NET', ['.NET Core教程', '.NET8.0实战'], 'Internet Core教程'],
    ] as const) {
      const harness = createHarness([
        ...titles.map((title, index) => makeResult('QUARK', index, title)),
        makeResult('BAIDU', 9, noise),
      ]);
      assert.equal(normalizeSearchResult(makeResult('QUARK', 0, titles[0])).title, titles[0]);
      const first = await harness.service.search(keyword);
      assert.deepEqual(first.data.map(({ title }) => title), [...titles]);
      const memoryHit = await harness.service.search(keyword);
      assert.equal(memoryHit.cacheStatus, 'memory_fresh');
      assert.deepEqual(memoryHit.data, first.data);

      harness.memory.clear();
      const redisHit = await harness.service.search(keyword);
      assert.equal(redisHit.cacheStatus, 'redis_fresh');
      assert.deepEqual(redisHit.data, first.data);

      harness.memory.clear();
      const [key, raw] = [...harness.redisValues.entries()][0];
      const stale = JSON.parse(raw) as Record<string, unknown>;
      stale.freshUntil = new Date(Date.now() - 1000).toISOString();
      harness.redisValues.set(key, JSON.stringify(stale));
      harness.setProviderError(new SearchProviderTimeoutException());
      const fallback = await harness.service.search(keyword);
      assert.equal(fallback.cacheStatus, 'redis_stale');
      assert.deepEqual(fallback.data, first.data);
    }
  });

  it('filters noise before deduplication and repeats the cleaned result on memory and Redis hits', async () => {
    const book = makeResult('QUARK', 1);
    const harness = createHarness([
      makeResult('XUNLEI', 1, '海绵宝宝：皮老板大电影 (2025)'),
      book,
      { ...book, title: '计算机专业课程' },
      { ...makeResult('BAIDU', 1), url: 'https://example.com/not-a-drive' },
    ]);
    const first = await harness.service.search('计算机');
    assert.equal(first.total, 1);
    assert.equal(first.data[0]?.url, book.url);
    assert.deepEqual(first.sourceCounts, { BAIDU: 0, QUARK: 1, XUNLEI: 0, ALIYUN: 0, UC: 0 });
    assert.equal(first.timing?.rawCount, 4);
    assert.equal(first.timing?.validLinkCount, 3);
    assert.equal(first.timing?.relevantCount, 2);
    assert.equal(first.timing?.deduplicatedCount, 1);
    assert.equal(first.maxResults, 500);
    assert.equal(first.pageSize, 500);

    const memoryHit = await harness.service.search('计算机');
    assert.equal(memoryHit.cacheStatus, 'memory_fresh');
    assert.deepEqual(memoryHit.data, first.data);
    assert.equal(memoryHit.timing?.validLinkCount, 3);
    assert.equal(memoryHit.timing?.relevantCount, 2);
    assert.equal(harness.providerCalls, 1);

    harness.memory.clear();
    const redisHit = await harness.service.search('计算机');
    assert.equal(redisHit.cacheStatus, 'redis_fresh');
    assert.deepEqual(redisHit.data, first.data);
    assert.equal(redisHit.timing?.validLinkCount, 3);
    assert.equal(redisHit.timing?.relevantCount, 2);
    assert.equal(harness.providerCalls, 1);
  });

  it('keeps stale fallback relevant and ignores the previous 300-result cache version', async () => {
    const harness = createHarness([
      makeResult('XUNLEI', 1, '海绵宝宝：皮老板大电影 (2025)'),
      makeResult('BAIDU', 2),
    ]);
    await harness.service.search('计算机');
    harness.memory.clear();
    const [key, raw] = [...harness.redisValues.entries()][0];
    const stale = JSON.parse(raw) as Record<string, unknown>;
    stale.freshUntil = new Date(Date.now() - 1000).toISOString();
    harness.redisValues.set(key, JSON.stringify(stale));
    harness.setProviderError(new SearchProviderTimeoutException());
    const fallback = await harness.service.search('计算机');
    assert.equal(fallback.cacheStatus, 'redis_stale');
    assert.equal(fallback.staleFallback, true);
    assert.deepEqual(fallback.data.map(({ title }) => title), ['计算机基础教程 2']);

    harness.memory.clear();
    stale.cacheVersion = 'v5';
    harness.redisValues.set(key, JSON.stringify(stale));
    harness.setProviderError(new Error('provider unavailable'));
    await assert.rejects(harness.service.search('计算机'));
    assert.equal(SEARCH_CACHE_VERSION, 'v6');
  });

  for (const [name, distribution] of [
    ['even', { BAIDU: 100, QUARK: 100, XUNLEI: 100, ALIYUN: 100, UC: 100 }],
    ['uneven', { BAIDU: 30, QUARK: 250, XUNLEI: 140, ALIYUN: 60, UC: 20 }],
    ['one source has 400', { BAIDU: 0, QUARK: 400, XUNLEI: 50, ALIYUN: 30, UC: 20 }],
    ['single source', { BAIDU: 0, QUARK: 500, XUNLEI: 0, ALIYUN: 0, UC: 0 }],
  ] as const) {
    it(`allows ${name} when all 500 items are relevant`, async () => {
      const response = await createHarness(makeResults(distribution)).service.search('计算机');
      assert.equal(response.total, 500);
      assert.equal(response.truncated, false);
      assert.deepEqual(response.sourceCounts, distribution);
      assert.equal(new Set(response.data.map(({ url }) => url)).size, 500);
    });
  }

  it('returns only the available relevant items, including zero', async () => {
    const few = await createHarness(makeResults({ BAIDU: 30, QUARK: 80, XUNLEI: 27 })).service.search('计算机');
    assert.equal(few.total, 137);
    assert.equal(few.exhausted, true);
    const empty = await createHarness(makeResults({})).service.search('计算机');
    assert.equal(empty.total, 0);
    assert.deepEqual(empty.data, []);
  });

  it('caps an oversupplied source at 500 and shares same-rank surplus fairly', async () => {
    const single = await createHarness(makeResults({ QUARK: 610 })).service.search('计算机');
    assert.equal(single.total, SEARCH_RESULT_LIMIT);
    assert.equal(single.sourceCounts?.QUARK, 500);
    assert.equal(single.truncated, true);
    assert.equal(single.timing?.deduplicatedCount, 610);

    const balanced = await createHarness(makeResults({ QUARK: 600, XUNLEI: 600 })).service.search('计算机');
    assert.deepEqual(balanced.sourceCounts, { BAIDU: 0, QUARK: 250, XUNLEI: 250, ALIYUN: 0, UC: 0 });
    assert.equal(SEARCH_RESULT_SOFT_TARGET_PER_SOURCE, 100);
  });

  it('redistributes unused source targets when the candidate pool exceeds 500', async () => {
    const even = await createHarness(makeResults({
      BAIDU: 120, QUARK: 120, XUNLEI: 120, ALIYUN: 120, UC: 120,
    })).service.search('计算机');
    assert.deepEqual(even.sourceCounts, {
      BAIDU: 100, QUARK: 100, XUNLEI: 100, ALIYUN: 100, UC: 100,
    });

    const uneven = await createHarness(makeResults({
      BAIDU: 30, QUARK: 600, XUNLEI: 140, ALIYUN: 60, UC: 20,
    })).service.search('计算机');
    assert.deepEqual(uneven.sourceCounts, {
      BAIDU: 30, QUARK: 250, XUNLEI: 140, ALIYUN: 60, UC: 20,
    });

    const absent = await createHarness(makeResults({
      BAIDU: 0, QUARK: 600, XUNLEI: 50, ALIYUN: 30, UC: 20,
    })).service.search('计算机');
    assert.deepEqual(absent.sourceCounts, {
      BAIDU: 0, QUARK: 400, XUNLEI: 50, ALIYUN: 30, UC: 20,
    });
  });

  it('never fills the 500 cap with unrelated valid links', async () => {
    const relevant = makeResults({ QUARK: 137 });
    const noise = Array.from({ length: 500 }, (_, index) =>
      makeResult('XUNLEI', index, `海绵宝宝：皮老板大电影 ${index}`));
    const response = await createHarness([...relevant, ...noise]).service.search('计算机');
    assert.equal(response.timing?.rawCount, 637);
    assert.equal(response.timing?.validLinkCount, 637);
    assert.equal(response.timing?.relevantCount, 137);
    assert.equal(response.total, 137);
    assert.equal(response.sourceCounts?.XUNLEI, 0);
    assert.equal(response.truncated, false);
  });

  it('chooses stronger matches before a weaker source and keeps complete Xunlei URLs', async () => {
    const weak = Array.from({ length: 200 }, (_, index) =>
      makeResult('BAIDU', index, `电脑教材 ${index}`));
    const strong = Array.from({ length: 500 }, (_, index) =>
      makeResult('QUARK', index, `计算机课程 ${index}`));
    const xunlei = makeResult('XUNLEI', 1, '计算机网络课程');
    xunlei.url = 'https://pan.xunlei.com/s/VP-eCePgQ_VoGtfqTv4g6SadA1?pwd=tnjx#';
    const response = await createHarness([...weak, ...strong, xunlei]).service.search('计算机');
    assert.equal(response.total, 500);
    assert.equal(response.sourceCounts?.BAIDU, 0);
    assert.equal(response.sourceCounts?.QUARK, 499);
    assert.equal(response.sourceCounts?.XUNLEI, 1);
    assert.equal(response.data.find(({ source }) => source === 'XUNLEI')?.url, xunlei.url);
  });
});
