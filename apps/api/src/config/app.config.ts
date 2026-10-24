import type { ConfigService } from '@nestjs/config';
export const APP_PORT = 'APP_PORT';
export const CORS_ORIGIN = 'CORS_ORIGIN';
export const NODE_ENV = 'NODE_ENV';
export const TRUST_PROXY_HOPS = 'TRUST_PROXY_HOPS';
export const PANSOU_BASE_URL = 'PANSOU_BASE_URL';
export const PANSOU_TIMEOUT_MS = 'PANSOU_TIMEOUT_MS';
export const REDIS_URL = 'REDIS_URL';
export const SEARCH_TIMEOUT = 'SEARCH_TIMEOUT';
export const SEARCH_FETCH_TIME_BUDGET_MS = 'SEARCH_FETCH_TIME_BUDGET_MS';
export const SEARCH_IN_FLIGHT_TTL_SECONDS = 'SEARCH_IN_FLIGHT_TTL_SECONDS';
export const SEARCH_CACHE_ENABLED = 'SEARCH_CACHE_ENABLED';
export const SEARCH_CACHE_TTL = 'SEARCH_CACHE_TTL';
export const SEARCH_CACHE_MAX_SIZE = 'SEARCH_CACHE_MAX_SIZE';
export function getAppPort(config: ConfigService): number { return Number(config.get<string>(APP_PORT) || '3001'); }
export function getTrustProxyHops(config: ConfigService): number { const value = Number(config.get<string>(TRUST_PROXY_HOPS) || '0'); return Number.isInteger(value) && value >= 0 && value <= 1 ? value : 0; }
