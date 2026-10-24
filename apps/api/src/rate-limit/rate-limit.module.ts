import { Module } from '@nestjs/common';
import { RATE_LIMIT_STORE } from './rate-limit.tokens';
import { RateLimitService } from './rate-limit.service';
import { RedisRateLimitStore } from './redis-rate-limit.store';

@Module({
  providers: [
    RateLimitService,
    RedisRateLimitStore,
    {
      provide: RATE_LIMIT_STORE,
      useExisting: RedisRateLimitStore,
    },
  ],
  exports: [RateLimitService, RATE_LIMIT_STORE],
})
export class RateLimitModule {}
