export const SEARCH_CACHE = Symbol('SEARCH_CACHE');

export interface SearchCache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlSeconds: number): void;
  clear(): void;
}
