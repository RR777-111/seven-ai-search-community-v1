import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_URL } from '../../config/app.config';
import type { RedisSearchCache } from '../interfaces/redis-search-cache.interface';

@Injectable()
export class IoredisSearchCache implements RedisSearchCache, OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(IoredisSearchCache.name);
  private readonly client: Redis;

  constructor(configService: ConfigService) {
    this.client = new Redis(configService.get<string>(REDIS_URL) ?? '', {
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
    });
    this.client.on('error', (error) => {
      this.logger.warn(
        { errorCategory: getErrorCategory(error) },
        'Redis search cache client error',
      );
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
      this.logger.log('Redis search cache client connected');
    } catch (error) {
      this.logger.warn(
        { errorCategory: getErrorCategory(error) },
        'Redis search cache client failed to connect; searches continue without L2 cache',
      );
    }
  }

  async onApplicationShutdown(): Promise<void> {
    this.client.disconnect();
  }

  get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, batch] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== '0');

    return keys;
  }

  ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  dbSize(): Promise<number> {
    return this.client.dbsize();
  }
}

function getErrorCategory(error: unknown): string {
  return error instanceof Error && error.name.trim().length > 0 ? error.name : 'unknown';
}
