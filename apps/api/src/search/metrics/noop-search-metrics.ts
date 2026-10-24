import { Injectable } from '@nestjs/common';
import type { SearchMetrics } from '../interfaces/search-metrics.interface';

@Injectable()
export class NoopSearchMetrics implements SearchMetrics {
  recordProviderDuration(): void {
    // Intentionally empty: production metrics can replace this provider.
  }

  recordQueryCount(): void {
    // Intentionally empty: production metrics can replace this provider.
  }

  recordSearchTiming(): void {
    // Intentionally empty: structured logs are the default local timing sink.
  }
}
