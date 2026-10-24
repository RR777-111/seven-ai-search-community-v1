import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PANSOU_BASE_URL, PANSOU_TIMEOUT_MS } from '../../config/app.config';
import type {
  SearchProvider,
  SearchProviderOptions,
} from '../interfaces/search-provider.interface';
import { SearchProviderTimeoutException } from '../interfaces/search-provider.interface';
import type { SearchResult } from '../interfaces/search-result.interface';
import { normalizeAllowedResourceSource } from '../resource-source/resource-source.config';

const PANSOU_SEARCH_PATH = '/api/search';
const PANSOU_ALLOWED_CLOUD_TYPES = ['baidu', 'quark', 'xunlei', 'aliyun', 'uc'] as const;
const SUPPORTED_LINK_PROTOCOLS = new Set(['http:', 'https:']);
const RESULT_LIST_FIELDS = ['results', 'items', 'list', 'data'] as const;
const TITLE_FIELDS = ['title', 'name', 'note'] as const;
const URL_FIELDS = ['url', 'link', 'share_url', 'shareUrl'] as const;
const SOURCE_FIELDS = ['source'] as const;
const TYPE_FIELDS = ['type', 'provider', 'category', 'drive', 'diskType', 'channel'] as const;
const CREATED_AT_FIELDS = [
  'createdAt',
  'created_at',
  'createTime',
  'create_time',
  'datetime',
] as const;
const UPDATED_AT_FIELDS = [
  'updatedAt',
  'updated_at',
  'updateTime',
  'update_time',
  'modifiedAt',
  'modified_at',
] as const;
const MINIMUM_CREDIBLE_RESOURCE_TIME = Date.UTC(1970, 0, 1);

type UnknownRecord = Record<string, unknown>;

@Injectable()
export class PanSouAdapter implements SearchProvider {
  constructor(private readonly configService: ConfigService) {}

  async search(keyword: string, options: SearchProviderOptions = {}): Promise<SearchResult[]> {
    const response = await this.fetchSearchResponse(keyword, options);
    return this.mapResults(response);
  }

  private async fetchSearchResponse(
    keyword: string,
    options: SearchProviderOptions,
  ): Promise<unknown> {
    let response: Response;

    try {
      response = await fetch(this.getSearchUrl(), {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          kw: keyword,
          res: 'merge',
          cloud_types: PANSOU_ALLOWED_CLOUD_TYPES,
        }),
        redirect: 'error',
        signal: AbortSignal.timeout(this.getTimeoutMs(options)),
      });
    } catch (error) {
      if (isTimeoutError(error)) {
        throw new SearchProviderTimeoutException();
      }
      throw new ServiceUnavailableException('PanSou service is unavailable.');
    }

    if (!response.ok) {
      throw new ServiceUnavailableException('PanSou service is unavailable.');
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new BadGatewayException('PanSou service returned an invalid response.');
    }

    if (!isRecord(payload) || payload.code !== 0 || !isSearchData(payload.data)) {
      throw new BadGatewayException('PanSou service returned an invalid response.');
    }

    return payload.data;
  }

  private mapResults(data: unknown): SearchResult[] {
    if (Array.isArray(data)) {
      return data.flatMap((link) => this.mapLink('', link));
    }

    if (!isRecord(data)) {
      throw new BadGatewayException('PanSou service returned an invalid response.');
    }

    const directResults = this.mapResultList(data);
    if (directResults.length > 0) {
      return directResults;
    }

    const mergedByType = data.merged_by_type;
    if (mergedByType === undefined) {
      return this.mapNestedResultLists(data);
    }

    if (!isRecord(mergedByType)) {
      throw new BadGatewayException('PanSou service returned an invalid response.');
    }

    return Object.entries(mergedByType).flatMap(([providerType, links]) => {
      if (!Array.isArray(links)) {
        throw new BadGatewayException('PanSou service returned an invalid response.');
      }

      return links.flatMap((link) => this.mapLink(providerType, link));
    });
  }

  private mapResultList(data: UnknownRecord): SearchResult[] {
    for (const field of RESULT_LIST_FIELDS) {
      const value = data[field];
      if (Array.isArray(value)) {
        return value.flatMap((link) => this.mapLink('', link));
      }
    }

    return [];
  }

  private mapNestedResultLists(data: UnknownRecord): SearchResult[] {
    return Object.entries(data).flatMap(([providerType, value]) => {
      if (!Array.isArray(value)) {
        return [];
      }

      return value.flatMap((link) => this.mapLink(providerType, link));
    });
  }

  private mapLink(providerType: string, link: unknown): SearchResult[] {
    if (!isRecord(link)) {
      return [];
    }

    const title = getFirstNonEmptyString(link, TITLE_FIELDS);
    const url = getFirstNonEmptyString(link, URL_FIELDS);
    if (!title || !url || !isSupportedLinkUrl(url)) {
      return [];
    }

    const rawSource = getFirstNonEmptyString(link, SOURCE_FIELDS);
    const rawType = getFirstNonEmptyString(link, TYPE_FIELDS);
    const sourceContext = providerType.trim();
    const source = normalizeAllowedResourceSource({
      source: rawSource,
      type: rawType,
      sourceContext: sourceContext.length > 0 ? sourceContext : undefined,
      url,
    });
    if (!source) {
      return [];
    }

    return [
      {
        source: source.id,
        type: source.label,
        title,
        url,
        ...createOptionalTimestampFields(link),
      },
    ];
  }

  private getSearchUrl(): URL {
    const baseUrl = this.configService.getOrThrow<string>(PANSOU_BASE_URL);
    return new URL(PANSOU_SEARCH_PATH, baseUrl);
  }

  private getTimeoutMs(options: SearchProviderOptions): number {
    const configuredTimeoutMs = Number(this.configService.getOrThrow<string>(PANSOU_TIMEOUT_MS));
    const requestedTimeoutMs = options.timeoutMs;

    return Number.isInteger(requestedTimeoutMs) && Number(requestedTimeoutMs) > 0
      ? Math.min(configuredTimeoutMs, Number(requestedTimeoutMs))
      : configuredTimeoutMs;
  }
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSearchData(value: unknown): boolean {
  return Array.isArray(value) || isRecord(value);
}

function getNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function getFirstNonEmptyString(
  record: UnknownRecord,
  fields: readonly string[],
): string | undefined {
  for (const field of fields) {
    const value = getNonEmptyString(record[field]);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function createOptionalTimestampFields(
  record: UnknownRecord,
): Pick<SearchResult, 'createdAt' | 'updatedAt'> {
  const createdAt = getFirstTimestampString(record, CREATED_AT_FIELDS);
  const updatedAt = getFirstTimestampString(record, UPDATED_AT_FIELDS);

  return {
    ...(createdAt ? { createdAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  };
}

function getFirstTimestampString(
  record: UnknownRecord,
  fields: readonly string[],
): string | undefined {
  for (const field of fields) {
    const value = getTimestampString(record[field]);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function getTimestampString(value: unknown): string | undefined {
  const stringValue = getNonEmptyString(value);
  if (stringValue) {
    const timestamp = Date.parse(stringValue);
    return isCredibleResourceTimestamp(timestamp) ? stringValue : undefined;
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  const timestampMs = value > 1_000_000_000_000 ? value : value * 1000;
  const date = new Date(timestampMs);

  return isCredibleResourceTimestamp(date.getTime()) ? date.toISOString() : undefined;
}

function isCredibleResourceTimestamp(timestamp: number): boolean {
  return Number.isFinite(timestamp) && timestamp >= MINIMUM_CREDIBLE_RESOURCE_TIME;
}

function isSupportedLinkUrl(value: string): boolean {
  try {
    return SUPPORTED_LINK_PROTOCOLS.has(new URL(value).protocol);
  } catch {
    return false;
  }
}
