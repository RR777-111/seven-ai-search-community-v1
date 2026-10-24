import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SEARCH_CACHE_MAX_SIZE } from '../../config/app.config';
import type { SearchCache } from '../interfaces/search-cache.interface';

const DEFAULT_SEARCH_CACHE_MAX_SIZE = 100;

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

@Injectable()
export class MemorySearchCache implements SearchCache {
  private readonly entries = new Map<string, CacheEntry>();

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    private readonly now: () => number = () => Date.now(),
  ) {}

  get<T>(key: string): T | undefined {
    this.cleanupExpiredEntries();

    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    const maxSize = this.getMaxSize();
    if (maxSize <= 0 || ttlSeconds <= 0) {
      return;
    }

    this.cleanupExpiredEntries();

    if (this.entries.has(key)) {
      this.entries.delete(key);
    }

    while (this.entries.size >= maxSize) {
      const oldestKey = this.entries.keys().next().value as string | undefined;
      if (!oldestKey) {
        break;
      }
      this.entries.delete(oldestKey);
    }

    this.entries.set(key, {
      expiresAt: this.now() + ttlSeconds * 1000,
      value,
    });
  }

  clear(): void {
    this.entries.clear();
  }

  private cleanupExpiredEntries(): void {
    const now = this.now();
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) {
        this.entries.delete(key);
      }
    }
  }

  private getMaxSize(): number {
    const configuredMaxSize = Number(
      this.configService.get<string>(SEARCH_CACHE_MAX_SIZE) ?? DEFAULT_SEARCH_CACHE_MAX_SIZE,
    );

    return Number.isInteger(configuredMaxSize) && configuredMaxSize > 0
      ? configuredMaxSize
      : DEFAULT_SEARCH_CACHE_MAX_SIZE;
  }
}
