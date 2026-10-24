import type { RateLimitStore } from './rate-limit.types';

export const RATE_LIMIT_STORE = Symbol('RATE_LIMIT_STORE');

export type RateLimitStoreToken = typeof RATE_LIMIT_STORE;
export type { RateLimitStore };
