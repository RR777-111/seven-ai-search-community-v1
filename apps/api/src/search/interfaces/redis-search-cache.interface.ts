export const REDIS_SEARCH_CACHE = Symbol('REDIS_SEARCH_CACHE');

export interface RedisSearchCache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  scanKeys(pattern: string): Promise<string[]>;
  ttl(key: string): Promise<number>;
  dbSize(): Promise<number>;
}
