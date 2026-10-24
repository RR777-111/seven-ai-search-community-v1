import type { SearchResult } from '@/types/search';

export interface SearchResultCardFields {
  copyButtonLabel: string;
  sourceLabel: string;
  title: string;
  updatedAtText: string;
  url: string;
}

interface SearchResultsEmptyMessageOptions {
  selectedSource?: string;
  sourceLabel?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  BAIDU: '百度网盘',
  QUARK: '夸克网盘',
  XUNLEI: '迅雷云盘',
  ALIYUN: '阿里云盘',
  UC: 'UC 网盘',
  baidu: '百度网盘',
  quark: '夸克网盘',
  uc: 'UC 网盘',
  xunlei: '迅雷云盘',
  thunder: '迅雷云盘',
  ali: '阿里云盘',
  aliyun: '阿里云盘',
};

export function formatSearchResultsEmptyMessage({
  selectedSource = 'all',
  sourceLabel = '',
}: SearchResultsEmptyMessageOptions = {}): string {
  if (selectedSource !== 'all' && sourceLabel.trim()) {
    return `当前筛选下暂无 ${sourceLabel.trim()} 网盘资源，请切换全部或其他网盘查看。`;
  }

  return '暂未找到相关资源，请换个关键词试试。';
}

export function getSearchResultsEndLabel(): string {
  return '客官，已经没有了哦～';
}

export function getSearchResultCardFields(result: SearchResult): SearchResultCardFields {
  const resourceTime =
    result.resourceTime === undefined
      ? (result.updatedAt ?? result.createdAt)
      : result.resourceTime;

  return {
    sourceLabel: formatSourceLabel(result),
    title: result.title,
    updatedAtText: formatUpdatedAt(resourceTime),
    url: result.url,
    copyButtonLabel: '复制链接',
  };
}

function formatSourceLabel(result: SearchResult): string {
  const source = result.source?.trim();
  if (!source) {
    return result.type;
  }

  return SOURCE_LABELS[source] ?? SOURCE_LABELS[source.toLowerCase()] ?? source;
}

export function formatUpdatedAt(resourceTime: string | null | undefined): string {
  if (!resourceTime?.trim()) {
    return '未知时间';
  }

  const time = Date.parse(resourceTime);
  return Number.isNaN(time) ? '未知时间' : new Date(time).toISOString().slice(0, 10);
}
