export interface RateLimitRule {
  scope: string;
  identifiers: Record<string, string | number | undefined>;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds: number;
}

export interface RateLimitLogContext {
  route: string;
  scope: string;
  userId?: string;
  ipHash?: string;
  emailHash?: string;
  retryAfterSeconds?: number;
}

export interface RateLimitStore {
  increment(key: string, windowSeconds: number): Promise<{ count: number; ttlSeconds: number }>;
  setIfAbsent?(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  consumeIfValue?(key: string, expectedValue: string): Promise<boolean>;
  renewIfValue?(key: string, expectedValue: string, ttlSeconds: number): Promise<boolean>;
}
