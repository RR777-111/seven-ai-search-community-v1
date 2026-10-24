import {
  Inject,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NODE_ENV } from '../config/app.config';
import { encodeKeySegment } from './identifier';
import { RATE_LIMIT_STORE } from './rate-limit.tokens';
import type {
  RateLimitDecision,
  RateLimitLogContext,
  RateLimitRule,
  RateLimitStore,
} from './rate-limit.types';

export const RATE_LIMIT_MESSAGE = '操作过于频繁，请稍后再试';

interface RateLimitReadableStore extends RateLimitStore {
  get(key: string): Promise<string | null>;
  ttl(key: string): Promise<number>;
}

interface RateLimitMutableStore extends RateLimitReadableStore {
  delete(key: string): Promise<void>;
}

export class RateLimitExceededException extends HttpException {
  constructor(retryAfterSeconds: number, message = RATE_LIMIT_MESSAGE) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        code: 'RATE_LIMITED',
        message,
        retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  getResponseHeaders(): Record<string, string> {
    const response = this.getResponse();
    const retryAfterSeconds =
      typeof response === 'object' &&
      response !== null &&
      'retryAfterSeconds' in response &&
      Number.isInteger((response as { retryAfterSeconds?: unknown }).retryAfterSeconds)
        ? String((response as { retryAfterSeconds: number }).retryAfterSeconds)
        : '1';

    return { 'Retry-After': retryAfterSeconds };
  }
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly env: string;

  constructor(
    @Inject(RATE_LIMIT_STORE) private readonly store: RateLimitStore,
    configService: ConfigService,
  ) {
    this.env = normalizeEnvironment(configService.get<string>(NODE_ENV) ?? 'development');
  }

  async check(rules: RateLimitRule[]): Promise<RateLimitDecision> {
    if (rules.length === 0) {
      const now = new Date();
      return {
        allowed: true,
        limit: 0,
        remaining: 0,
        resetAt: now,
        retryAfterSeconds: 0,
      };
    }

    const now = Date.now();
    let decision: RateLimitDecision | undefined;

    for (const rule of rules) {
      const result = await this.store.increment(this.buildKey(rule), rule.windowSeconds);
      const ttlSeconds = result.ttlSeconds > 0 ? result.ttlSeconds : rule.windowSeconds;
      const nextDecision: RateLimitDecision = {
        allowed: result.count <= rule.limit,
        limit: rule.limit,
        remaining: Math.max(0, rule.limit - result.count),
        resetAt: new Date(now + ttlSeconds * 1000),
        retryAfterSeconds: ttlSeconds,
      };

      if (!nextDecision.allowed) {
        return nextDecision;
      }

      if (!decision || nextDecision.remaining < decision.remaining) {
        decision = nextDecision;
      }
    }

    return decision!;
  }

  async assertAllowed(
    rules: RateLimitRule[],
    context: RateLimitLogContext,
  ): Promise<RateLimitDecision> {
    let decision: RateLimitDecision;
    try {
      decision = await this.check(rules);
    } catch (error) {
      this.logger.error(
        {
          route: context.route,
          scope: context.scope,
          decision: 'error',
          userId: context.userId,
          ipHash: context.ipHash,
          emailHash: context.emailHash,
          error: error instanceof Error ? error.message : 'unknown',
        },
        'rate limit failed closed',
      );
      throw new ServiceUnavailableException(RATE_LIMIT_MESSAGE);
    }

    const logContext = {
      route: context.route,
      scope: context.scope,
      decision: decision.allowed ? 'allowed' : 'blocked',
      userId: context.userId,
      ipHash: context.ipHash,
      emailHash: context.emailHash,
      retryAfterSeconds: decision.retryAfterSeconds,
    };

    if (!decision.allowed) {
      this.logger.warn(logContext, 'rate limit blocked request');
      throw new RateLimitExceededException(decision.retryAfterSeconds);
    }

    this.logger.log(logContext, 'rate limit allowed request');
    return decision;
  }

  async assertBelowLimit(rule: RateLimitRule, context: RateLimitLogContext): Promise<void> {
    let decision: RateLimitDecision;
    try {
      decision = await this.readCounter(rule);
    } catch (error) {
      this.logStoreFailure(context, error);
      throw new ServiceUnavailableException(RATE_LIMIT_MESSAGE);
    }

    if (!decision.allowed) {
      this.logger.warn(
        {
          ...context,
          decision: 'blocked',
          retryAfterSeconds: decision.retryAfterSeconds,
        },
        'rate limit blocked request',
      );
      throw new RateLimitExceededException(decision.retryAfterSeconds);
    }
  }

  async incrementFailure(rule: RateLimitRule, context: RateLimitLogContext): Promise<void> {
    let decision: RateLimitDecision;
    try {
      decision = await this.incrementRule(rule, true);
    } catch (error) {
      this.logStoreFailure(context, error);
      throw new ServiceUnavailableException(RATE_LIMIT_MESSAGE);
    }

    if (!decision.allowed) {
      this.logger.warn(
        {
          ...context,
          decision: 'blocked',
          retryAfterSeconds: decision.retryAfterSeconds,
        },
        'rate limit blocked request',
      );
      throw new RateLimitExceededException(decision.retryAfterSeconds);
    }
  }

  async clear(rule: RateLimitRule, context: RateLimitLogContext): Promise<void> {
    try {
      const store = this.store as Partial<RateLimitMutableStore>;
      if (typeof store.delete !== 'function') {
        throw new Error('Rate limit store does not support delete.');
      }
      await store.delete(this.buildKey(rule));
    } catch (error) {
      this.logStoreFailure(context, error);
      throw new ServiceUnavailableException(RATE_LIMIT_MESSAGE);
    }
  }

  buildKey(rule: RateLimitRule): string {
    const segments = Object.entries(rule.identifiers)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, value]) => encodeKeySegment(name, value));

    return ['seven-community', this.env, 'rl', rule.scope, ...segments].join(':');
  }

  private async incrementRule(
    rule: RateLimitRule,
    blockAtLimit: boolean,
  ): Promise<RateLimitDecision> {
    const now = Date.now();
    const result = await this.store.increment(this.buildKey(rule), rule.windowSeconds);
    const ttlSeconds = result.ttlSeconds > 0 ? result.ttlSeconds : rule.windowSeconds;
    const allowed = blockAtLimit ? result.count < rule.limit : result.count <= rule.limit;

    return {
      allowed,
      limit: rule.limit,
      remaining: Math.max(0, rule.limit - result.count),
      resetAt: new Date(now + ttlSeconds * 1000),
      retryAfterSeconds: ttlSeconds,
    };
  }

  private async readCounter(rule: RateLimitRule): Promise<RateLimitDecision> {
    const store = this.store as Partial<RateLimitReadableStore>;
    if (typeof store.get !== 'function' || typeof store.ttl !== 'function') {
      throw new Error('Rate limit store does not support reading counters.');
    }

    const key = this.buildKey(rule);
    const value = await store.get(key);
    const count = value === null ? 0 : Number(value);
    if (!Number.isInteger(count) || count < 0) {
      throw new Error('Invalid rate limit counter value.');
    }

    const ttl = value === null ? rule.windowSeconds : await store.ttl(key);
    const ttlSeconds = ttl > 0 ? ttl : rule.windowSeconds;

    return {
      allowed: count < rule.limit,
      limit: rule.limit,
      remaining: Math.max(0, rule.limit - count),
      resetAt: new Date(Date.now() + ttlSeconds * 1000),
      retryAfterSeconds: ttlSeconds,
    };
  }

  private logStoreFailure(context: RateLimitLogContext, error: unknown): void {
    this.logger.error(
      {
        route: context.route,
        scope: context.scope,
        decision: 'error',
        userId: context.userId,
        ipHash: context.ipHash,
        emailHash: context.emailHash,
        error: error instanceof Error ? error.message : 'unknown',
      },
      'rate limit failed closed',
    );
  }
}

function normalizeEnvironment(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_') || 'development'
  );
}
