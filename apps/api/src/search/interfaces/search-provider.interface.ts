import { ServiceUnavailableException } from '@nestjs/common';
import type { SearchResult } from './search-result.interface';

export const SEARCH_PROVIDER = Symbol('SEARCH_PROVIDER');

export interface SearchProviderOptions {
  timeoutMs?: number;
}

export interface SearchProvider {
  search(keyword: string, options?: SearchProviderOptions): Promise<SearchResult[]>;
}

export class SearchProviderTimeoutException extends ServiceUnavailableException {
  constructor() {
    super('Search provider timed out.');
  }
}
