import { Injectable } from '@nestjs/common';
import type { SearchResult } from '../interfaces/search-result.interface';
import { normalizeAllowedResourceSource } from '../resource-source/resource-source.config';
const BLOCKED_RESOURCE_PROTOCOLS = new Set(['ed2k:', 'magnet:', 'torrent:']);
const BLOCKED_RESOURCE_TYPES = new Set([
  'ed2k',
  'ed2k:',
  'magnet',
  'magnet:',
  'torrent',
  'torrent:',
  '电驴链接',
  '磁力链接',
  '种子',
]);

@Injectable()
export class ResourceFilter {
  filter(results: readonly SearchResult[]): SearchResult[] {
    return results.filter((result) => isAllowedResource(result));
  }
}

function isAllowedResource(result: SearchResult): boolean {
  if (isBlockedResourceType(result.type)) {
    return false;
  }

  const rawUrl = result.url.trim();
  if (hasBlockedProtocol(rawUrl)) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }

  if (BLOCKED_RESOURCE_PROTOCOLS.has(url.protocol)) {
    return false;
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return false;
  }

  return (
    !isTorrentUrl(url) &&
    normalizeAllowedResourceSource({ source: result.source, type: result.type, url: rawUrl }) !==
      undefined
  );
}

function hasBlockedProtocol(value: string): boolean {
  const normalizedValue = value.toLowerCase();
  return [...BLOCKED_RESOURCE_PROTOCOLS].some((protocol) => normalizedValue.startsWith(protocol));
}

function isBlockedResourceType(value: string): boolean {
  const normalizedValue = value.trim().toLowerCase();
  return BLOCKED_RESOURCE_TYPES.has(normalizedValue);
}

function isTorrentUrl(url: URL): boolean {
  return url.pathname.toLowerCase().endsWith('.torrent');
}
