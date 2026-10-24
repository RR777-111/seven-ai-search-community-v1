export type ResourceSourceId = 'BAIDU' | 'QUARK' | 'XUNLEI' | 'ALIYUN' | 'UC';

export type ResourceSourceDefinition = {
  id: ResourceSourceId;
  label: string;
  aliases: readonly string[];
  hosts: readonly string[];
};

export const ALLOWED_DRIVE_TYPES = ['BAIDU', 'QUARK', 'XUNLEI', 'ALIYUN', 'UC'] as const;

export const SOURCE_ALLOW_LIST = new Set<ResourceSourceId>(ALLOWED_DRIVE_TYPES);

const BLOCKED_RESOURCE_SOURCE_ALIASES = new Set([
  '115',
  '115pan',
  '115网盘',
  'tianyi',
  '189',
  'cloud189',
  '天翼',
  '天翼云盘',
  'cloud.189.cn',
  'other',
  'unknown',
  '未知',
  '未知来源',
  '其他',
  '其他网盘',
  '网盘',
]);

export const RESOURCE_SOURCES = [
  {
    id: 'BAIDU',
    label: '百度网盘',
    aliases: ['baidu', 'baidupan', 'bd', '百度', '百度网盘'],
    hosts: ['pan.baidu.com'],
  },
  {
    id: 'QUARK',
    label: '夸克网盘',
    aliases: ['quark', 'quarkpan', '夸克', '夸克网盘'],
    hosts: ['pan.quark.cn'],
  },
  {
    id: 'XUNLEI',
    label: '迅雷云盘',
    aliases: ['thunder', 'xunlei', 'xl', '迅雷', '迅雷云盘', '迅雷网盘'],
    hosts: ['pan.xunlei.com'],
  },
  {
    id: 'ALIYUN',
    label: '阿里云盘',
    aliases: ['aliyun', 'ali', 'alipan', '阿里', '阿里云', '阿里云盘', 'aliyundrive'],
    hosts: ['alipan.com', 'aliyundrive.com'],
  },
  {
    id: 'UC',
    label: 'UC网盘',
    aliases: ['uc', 'UC', 'uc网盘', 'UC网盘', 'uc cloud', 'ucpan', 'ucdrive'],
    hosts: ['drive.uc.cn'],
  },
] as const satisfies readonly ResourceSourceDefinition[];

export const SUPPORTED_SEARCH_SOURCES = RESOURCE_SOURCES;

export function normalizeResourceSource(value: string): ResourceSourceId | undefined {
  return getResourceSourceByAlias(value)?.id;
}

export function normalizeAllowedResourceSource(input: {
  source?: string | undefined;
  type?: string | undefined;
  sourceContext?: string | undefined;
  url?: string | undefined;
}): ResourceSourceDefinition | undefined {
  const explicitValues = [input.source, input.type, input.sourceContext].filter(isNonEmptyString);
  if (explicitValues.some(isBlockedResourceSourceAlias)) {
    return undefined;
  }

  const explicitSources = explicitValues
    .map(getResourceSourceByAlias)
    .filter((source): source is ResourceSourceDefinition => source !== undefined);
  const explicitSource = explicitSources[0];

  if (explicitSources.some((source) => source.id !== explicitSource?.id)) {
    return undefined;
  }

  const sourceFromUrl = input.url ? getResourceSourceByUrl(input.url) : undefined;
  if (!explicitSource) {
    return sourceFromUrl;
  }

  if (!input.url || !sourceFromUrl) {
    return undefined;
  }

  return explicitSource.id === sourceFromUrl.id ? explicitSource : undefined;
}

export function getSupportedSearchSourceLabel(value: string): string | undefined {
  return getResourceSourceByAlias(value)?.label;
}

export function isSupportedSearchSourceType(value: string): boolean {
  return getSupportedSearchSourceLabel(value) !== undefined;
}

export function isSupportedSearchSourceHost(value: string): boolean {
  return getResourceSourceByHostname(value) !== undefined;
}

function getResourceSourceByAlias(value: string): ResourceSourceDefinition | undefined {
  const normalizedValue = normalizeResourceSourceAlias(value);
  return RESOURCE_SOURCES.find(
    (source) =>
      SOURCE_ALLOW_LIST.has(source.id) &&
      source.aliases.some((alias) => alias.toLowerCase() === normalizedValue),
  );
}

function isBlockedResourceSourceAlias(value: string): boolean {
  return BLOCKED_RESOURCE_SOURCE_ALIASES.has(normalizeResourceSourceAlias(value));
}

function normalizeResourceSourceAlias(value: string): string {
  return value.trim().toLowerCase();
}

function isNonEmptyString(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function getResourceSourceByUrl(value: string): ResourceSourceDefinition | undefined {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }

  return getResourceSourceByHostname(url.hostname);
}

function getResourceSourceByHostname(value: string): ResourceSourceDefinition | undefined {
  const hostname = value.toLowerCase();
  return RESOURCE_SOURCES.find(
    (source) =>
      SOURCE_ALLOW_LIST.has(source.id) &&
      source.hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`)),
  );
}
