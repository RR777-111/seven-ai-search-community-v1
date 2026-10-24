import type { SearchResult } from '@/types/search';

export type DriveSource = 'all' | 'BAIDU' | 'QUARK' | 'XUNLEI' | 'ALIYUN' | 'UC';

export interface DriveSourceOption {
  label: string;
  value: DriveSource;
}

export type SearchResultLike = Pick<SearchResult, 'source' | 'title' | 'type' | 'url'>;

export const DRIVE_SOURCE_OPTIONS: readonly DriveSourceOption[] = [
  { label: '全部', value: 'all' },
  { label: '百度', value: 'BAIDU' },
  { label: '夸克', value: 'QUARK' },
  { label: '迅雷', value: 'XUNLEI' },
  { label: '阿里', value: 'ALIYUN' },
  { label: 'UC', value: 'UC' },
];

const ALLOWED_DRIVE_SOURCES = new Set<DriveSource>(
  DRIVE_SOURCE_OPTIONS.filter((option) => option.value !== 'all').map((option) => option.value),
);

const DRIVE_SOURCE_ALIASES: Record<string, DriveSource> = {
  BAIDU: 'BAIDU',
  百度: 'BAIDU',
  百度网盘: 'BAIDU',
  QUARK: 'QUARK',
  夸克: 'QUARK',
  夸克网盘: 'QUARK',
  XUNLEI: 'XUNLEI',
  迅雷: 'XUNLEI',
  迅雷云盘: 'XUNLEI',
  ALI: 'ALIYUN',
  ALIYUN: 'ALIYUN',
  阿里: 'ALIYUN',
  阿里云盘: 'ALIYUN',
  UC: 'UC',
  UC网盘: 'UC',
  'UC 网盘': 'UC',
};

export function filterResultsByDriveSource<TSearchResult extends SearchResultLike>(
  results: readonly TSearchResult[],
  selectedSource: DriveSource,
): TSearchResult[] {
  if (selectedSource === 'all') {
    return results.filter((result) => {
      const source = normalizeDriveSource(result);
      return source ? ALLOWED_DRIVE_SOURCES.has(source) : false;
    });
  }

  return results.filter((result) => normalizeDriveSource(result) === selectedSource);
}

export function getDriveSourceOption(value: DriveSource): DriveSourceOption {
  return DRIVE_SOURCE_OPTIONS.find((option) => option.value === value) ?? DRIVE_SOURCE_OPTIONS[0];
}

export function getDriveSourceCounts(
  results: readonly SearchResultLike[],
): Record<DriveSource, number> {
  const counts: Record<DriveSource, number> = {
    all: 0,
    BAIDU: 0,
    QUARK: 0,
    XUNLEI: 0,
    ALIYUN: 0,
    UC: 0,
  };

  for (const result of results) {
    const source = normalizeDriveSource(result);
    if (!source || source === 'all') {
      continue;
    }

    counts[source] += 1;
    counts.all += 1;
  }

  return counts;
}

export function normalizeDriveSource(result: SearchResultLike): DriveSource | null {
  const source = getDriveSourceAlias(result.source);
  if (source) return source;

  return getDriveSourceAlias(result.type);
}

function getDriveSourceAlias(value: string | undefined): DriveSource | null {
  const normalized = value?.trim();
  if (!normalized) return null;

  return DRIVE_SOURCE_ALIASES[normalized] ?? DRIVE_SOURCE_ALIASES[normalized.toUpperCase()] ?? null;
}
