import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { ApiResponsePayload } from '../../common/response/response-payload';
import { getClientIp } from '../../rate-limit/ip-address';
import { hashIdentifier } from '../../rate-limit/identifier';
import { RateLimitService } from '../../rate-limit/rate-limit.service';
import { SearchRequestDto } from '../dto/search-request.dto';
import type { SearchResult } from '../interfaces/search-result.interface';
import { SearchInFlightService, type SearchInFlightLease } from '../concurrency/search-in-flight.service';
import { SearchService } from '../service/search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService, private readonly rateLimitService: RateLimitService, private readonly searchInFlightService: SearchInFlightService) {}

  @Post() @HttpCode(HttpStatus.OK)
  async search(@Body() dto: SearchRequestDto, @Req() request: Request): Promise<ApiResponsePayload<SearchResult[]>> {
    const ip = getClientIp(request);
    await this.rateLimitService.assertAllowed([
      { scope: 'community-search-ip-minute', identifiers: { ip }, limit: 6, windowSeconds: 60 },
      { scope: 'community-search-ip-hour', identifiers: { ip }, limit: 60, windowSeconds: 3600 },
    ], { route: 'POST /search', scope: 'community-search', ipHash: hashIdentifier(ip) });

    const leases: SearchInFlightLease[] = [];
    let stopRenewal: Array<() => Promise<void>> = [];
    try {
      const queryLease = await this.searchInFlightService.acquire(ip, dto.keyword);
      if (!queryLease) throw this.searchInFlightService.createInProgressException();
      leases.push(queryLease);
      const ipSlot = await this.acquireSlot(`ip:${ip}`, 2);
      if (!ipSlot) throw this.searchInFlightService.createInProgressException();
      leases.push(ipSlot);
      const globalSlot = await this.acquireSlot('community:global', 8);
      if (!globalSlot) throw this.searchInFlightService.createInProgressException();
      leases.push(globalSlot);
      stopRenewal = leases.map((lease) => this.searchInFlightService.startRenewal(lease));
      return await this.searchService.search(dto.keyword);
    } finally {
      await Promise.all(stopRenewal.map((stop) => stop()));
      await Promise.all(leases.map((lease) => this.searchInFlightService.release(lease)));
    }
  }

  private async acquireSlot(identity: string, count: number): Promise<SearchInFlightLease | null> {
    for (let index = 0; index < count; index++) {
      const lease = await this.searchInFlightService.acquire(identity, `slot:${index}`);
      if (lease) return lease;
    }
    return null;
  }
}
