import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_URL } from '../config/app.config';
import type { RateLimitStore } from './rate-limit.types';

const INCREMENT_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("TTL", KEYS[1])
return { current, ttl }
`;

const CONSUME_IF_VALUE_SCRIPT = `
local current = redis.call("GET", KEYS[1])
if current == ARGV[1] then
  redis.call("DEL", KEYS[1])
  return 1
end
return 0
`;

const RENEW_IF_VALUE_SCRIPT = `
local current = redis.call("GET", KEYS[1])
if current == ARGV[1] then
  redis.call("EXPIRE", KEYS[1], ARGV[2])
  return 1
end
return 0
`;

@Injectable()
export class RedisRateLimitStore implements RateLimitStore, OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RedisRateLimitStore.name);
  private readonly client: Redis;

  constructor(configService: ConfigService) {
    const redisUrl = configService.get<string>(REDIS_URL);
    this.client = new Redis(redisUrl ?? '', {
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
    });
    this.client.on('error', (error) => {
      this.logger.error({ error: error.message }, 'Redis rate limit client error');
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
      this.logger.log('Redis rate limit client connected');
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : 'unknown' },
        'Redis rate limit client failed to connect; protected routes fail closed',
      );
    }
  }

  async onApplicationShutdown(): Promise<void> {
    this.client.disconnect();
  }

  async increment(
    key: string,
    windowSeconds: number,
  ): Promise<{ count: number; ttlSeconds: number }> {
    const result = await this.client.eval(INCREMENT_SCRIPT, 1, key, String(windowSeconds));
    if (!Array.isArray(result) || result.length < 2) {
      throw new Error('Unexpected Redis rate limit response.');
    }

    const count = Number(result[0]);
    const ttlSeconds = Math.max(0, Number(result[1]));
    if (!Number.isFinite(count) || !Number.isFinite(ttlSeconds)) {
      throw new Error('Invalid Redis rate limit response.');
    }

    return { count, ttlSeconds };
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async consumeIfValue(key: string, expectedValue: string): Promise<boolean> {
    const result = await this.client.eval(CONSUME_IF_VALUE_SCRIPT, 1, key, expectedValue);
    return result === 1;
  }

  async renewIfValue(key: string, expectedValue: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.eval(
      RENEW_IF_VALUE_SCRIPT,
      1,
      key,
      expectedValue,
      String(ttlSeconds),
    );
    return result === 1;
  }
}
