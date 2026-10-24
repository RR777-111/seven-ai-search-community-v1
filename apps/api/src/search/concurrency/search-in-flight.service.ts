import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import {
  NODE_ENV,
  SEARCH_FETCH_TIME_BUDGET_MS,
  SEARCH_IN_FLIGHT_TTL_SECONDS,
} from '../../config/app.config';
import {
  DEFAULT_SEARCH_FETCH_TIME_BUDGET_MS,
  DEFAULT_SEARCH_IN_FLIGHT_TTL_SECONDS,
  getMinimumSearchInFlightTtlSeconds,
} from '../../config/search-budget';
import { hashIdentifier, normalizeIdentifier } from '../../rate-limit/identifier';
import { RATE_LIMIT_STORE } from '../../rate-limit/rate-limit.tokens';
import type { RateLimitStore } from '../../rate-limit/rate-limit.types';

export const SEARCH_IN_PROGRESS_CODE = 'SEARCH_IN_PROGRESS';
export const SEARCH_IN_PROGRESS_MESSAGE = '正在搜索，请勿重复提交';

export interface SearchInFlightLease {
  key: string;
  token: string;
  ttlSeconds: number;
}

export type StopSearchInFlightRenewal = () => Promise<void>;

@Injectable()
export class SearchInFlightService {
  private readonly logger = new Logger(SearchInFlightService.name);

  constructor(
    @Inject(RATE_LIMIT_STORE) private readonly store: RateLimitStore,
    private readonly configService: ConfigService,
  ) {}

  async acquire(clientIdentity: string, query: string): Promise<SearchInFlightLease | null> {
    if (
      typeof this.store.setIfAbsent !== 'function' ||
      typeof this.store.consumeIfValue !== 'function' ||
      typeof this.store.renewIfValue !== 'function'
    ) {
      throw new ServiceUnavailableException('搜索服务暂时不可用，请稍后再试');
    }

    const ttlSeconds = this.getTtlSeconds();
    const lease = {
      key: this.createKey(clientIdentity, query),
      token: randomUUID(),
      ttlSeconds,
    };
    const acquired = await this.store.setIfAbsent(lease.key, lease.token, ttlSeconds);

    return acquired ? lease : null;
  }

  async renew(lease: SearchInFlightLease): Promise<boolean> {
    if (typeof this.store.renewIfValue !== 'function') {
      return false;
    }

    return this.store.renewIfValue(lease.key, lease.token, lease.ttlSeconds);
  }

  startRenewal(lease: SearchInFlightLease): StopSearchInFlightRenewal {
    const renewalIntervalMs = Math.max(1000, Math.floor((lease.ttlSeconds * 1000) / 3));
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let activeRenewal: Promise<void> | undefined;

    const schedule = () => {
      if (stopped) {
        return;
      }

      timer = setTimeout(() => {
        if (stopped) {
          return;
        }

        activeRenewal = this.renew(lease)
          .then((renewed) => {
            if (!renewed) {
              this.logger.error('search in-flight lock ownership was lost before completion');
            }
          })
          .catch((error) => {
            this.logger.error(
              { error: error instanceof Error ? error.message : 'unknown' },
              'search in-flight lock renewal failed',
            );
          })
          .finally(() => {
            activeRenewal = undefined;
            schedule();
          });
      }, renewalIntervalMs);
      timer.unref?.();
    };

    schedule();

    return async () => {
      stopped = true;
      if (timer) {
        clearTimeout(timer);
      }
      await activeRenewal;
    };
  }

  async release(lease: SearchInFlightLease): Promise<void> {
    if (typeof this.store.consumeIfValue !== 'function') {
      this.logger.error('search in-flight store does not support owned release');
      return;
    }

    try {
      await this.store.consumeIfValue(lease.key, lease.token);
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : 'unknown' },
        'search in-flight lock release failed',
      );
    }
  }

  createInProgressException(): ConflictException {
    return new ConflictException({
      code: SEARCH_IN_PROGRESS_CODE,
      message: SEARCH_IN_PROGRESS_MESSAGE,
    });
  }

  private createKey(clientIdentity: string, query: string): string {
    const env = normalizeIdentifier(this.configService.get<string>(NODE_ENV) ?? 'development');
    return [
      'seven-community',
      env.replace(/[^a-z0-9_-]/g, '_') || 'development',
      'search-inflight',
      hashIdentifier(clientIdentity),
      hashIdentifier(normalizeSearchQuery(query)),
    ].join(':');
  }

  private getTtlSeconds(): number {
    const configuredTtl = Number(
      this.configService.get<string>(SEARCH_IN_FLIGHT_TTL_SECONDS) ??
        DEFAULT_SEARCH_IN_FLIGHT_TTL_SECONDS,
    );

    const safeConfiguredTtl =
      Number.isInteger(configuredTtl) && configuredTtl > 0
        ? configuredTtl
        : DEFAULT_SEARCH_IN_FLIGHT_TTL_SECONDS;

    return Math.max(safeConfiguredTtl, this.getMinimumTtlSeconds());
  }

  private getMinimumTtlSeconds(): number {
    const fetchTimeBudgetMs = getPositiveInteger(
      this.configService.get<string>(SEARCH_FETCH_TIME_BUDGET_MS),
      DEFAULT_SEARCH_FETCH_TIME_BUDGET_MS,
    );

    return getMinimumSearchInFlightTtlSeconds(fetchTimeBudgetMs);
  }
}

function normalizeSearchQuery(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getPositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
