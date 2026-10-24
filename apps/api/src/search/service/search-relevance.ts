export type SearchRelevanceRank = 0 | 1 | 2;

const GENERIC_QUERY_SUFFIXES = [
  '完整版', '中文版', '教程', '课程', '教学', '入门', '基础', '资料', '资源', '下载',
] as const;

const RELATED_CONCEPTS = [
  {
    equivalents: ['计算机', '电脑', 'computer', 'computing'],
    related: ['编程', '程序设计', '程序', '操作系统', '数据结构', '软件工程', '计算机网络',
      'linux', '数据库', '网络安全'],
  },
  {
    equivalents: ['人工智能', 'ai', 'artificial intelligence'],
    related: ['机器学习', '深度学习', '神经网络'],
  },
  {
    equivalents: ['gta5', 'gta v', 'grand theft auto v'],
    related: [],
  },
] as const;

const AI_ENTERTAINMENT_FORMAT = /(?:恋综|综艺|电视剧|动漫|动画|短剧|网剧)/u;
const AI_FILM_FORMAT = /电影/u;
const MEDIA_PACKAGE = /(?:1080p|2160p|4k|字幕|蓝光|全集|全\d+期|更新\d+期|第\d+集|s\d+e\d+)/iu;
const AI_TECHNICAL_CONTEXT =
  /(?:教程|教学|课程|实战|制作|剪辑|创作|原理|技术|应用|提示词|模型|工具|开发|训练|科普|入门|分析|生成|指南|工作流|教材|从零到精通)/u;

export function getTitleRelevanceRank(title: string, keyword: string): SearchRelevanceRank | null {
  const normalizedTitle = normalize(title);
  const normalizedKeyword = normalize(keyword);
  if (!normalizedTitle || !normalizedKeyword) return null;

  if (isAiConceptQuery(normalizedKeyword) && isAiAbbreviationInEntertainmentTitle(normalizedTitle)) {
    return null;
  }

  if (containsTerm(normalizedTitle, normalizedKeyword)) return 0;

  const concept = RELATED_CONCEPTS.find(({ equivalents }) =>
    equivalents.some((equivalent) => normalize(equivalent) === normalizedKeyword));
  if (concept) {
    if (concept.equivalents.some((equivalent) => containsTerm(normalizedTitle, equivalent))) {
      return 1;
    }
    if (concept.related.some((related) => containsTerm(normalizedTitle, related))) {
      return 2;
    }
  }

  const coreTerms = getCoreTerms(normalizedKeyword);
  if (coreTerms.length === 0) return null;

  if (coreTerms.length === 1) {
    const core = coreTerms[0];
    const coreConcept = RELATED_CONCEPTS.find(({ equivalents }) =>
      equivalents.some((equivalent) => normalize(equivalent) === core));
    if (coreConcept) {
      if (coreConcept.equivalents.some((equivalent) => containsTerm(normalizedTitle, equivalent))) {
        return 1;
      }
      if (coreConcept.related.some((related) => containsTerm(normalizedTitle, related))) {
        return 2;
      }
    }

    // “Python教程” can match a Python title without requiring the generic word “教程”.
    return core !== normalizedKeyword && containsTerm(normalizedTitle, core) ? 2 : null;
  }

  return coreTerms.every((term) => containsTerm(normalizedTitle, term)) ? 1 : null;
}

function isAiConceptQuery(keyword: string): boolean {
  if (['人工智能', 'ai', 'artificial intelligence'].includes(keyword)) return true;
  const coreTerms = getCoreTerms(keyword);
  return coreTerms.length === 1 && (coreTerms[0] === '人工智能' || coreTerms[0] === 'ai');
}

function isAiAbbreviationInEntertainmentTitle(title: string): boolean {
  if (!containsTerm(title, 'ai') || containsTerm(title, '人工智能') ||
    containsTerm(title, 'artificial intelligence') || AI_TECHNICAL_CONTEXT.test(title)) {
    return false;
  }
  return (AI_ENTERTAINMENT_FORMAT.test(title) || AI_FILM_FORMAT.test(title)) &&
    MEDIA_PACKAGE.test(title);
}

function getCoreTerms(keyword: string): string[] {
  const terms = keyword.match(/\.net|[a-z0-9]+(?:\+\+|#)?|[\p{Script=Han}]+/gu) ?? [];
  const core: string[] = [];

  for (const term of terms) {
    let remaining = term;
    while (remaining.length > 0) {
      const suffix = GENERIC_QUERY_SUFFIXES.find((value) =>
        remaining.length > value.length && remaining.endsWith(value));
      if (!suffix) break;
      remaining = remaining.slice(0, -suffix.length);
    }
    if (remaining && !GENERIC_QUERY_SUFFIXES.includes(remaining as never)) core.push(remaining);
  }

  return core;
}

function containsTerm(title: string, term: string): boolean {
  const normalizedTerm = normalize(term);
  if (!normalizedTerm || !compact(normalizedTerm)) return false;

  if (/[+#]/u.test(normalizedTerm) || normalizedTerm.startsWith('.')) {
    const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\s+/g, '[\\s\\p{P}]*');
    if (new RegExp(`(?<![a-z0-9.+#])${escaped}(?![a-z0-9.+#])`, 'u').test(title)) return true;
    if (/^(?:[a-z0-9]+(?:\+\+|#)|\.[a-z0-9]+)$/u.test(normalizedTerm)) {
      return new RegExp(`(?<![a-z0-9.+#])${escaped}[0-9]+(?:\\.[0-9]+)*(?![a-z0-9.+#])`, 'u').test(title);
    }
    return false;
  }

  if (/^[a-z0-9\s]+$/u.test(normalizedTerm)) {
    const pattern = normalizedTerm.replace(/\s+/g, '[\\s\\p{P}]*');
    if (new RegExp(`(?<![a-z0-9])${pattern}(?![a-z0-9])`, 'u').test(title)) return true;
    // Named software can have a numeric release suffix, such as Python3 or Windows11.
    if (normalizedTerm === 'python' || normalizedTerm === 'windows') {
      return new RegExp(`(?<![a-z0-9])${pattern}[0-9]+(?:\\.[0-9]+)*(?![a-z0-9])`, 'u').test(title);
    }
    return false;
  }

  return compact(title).includes(compact(normalizedTerm));
}

function normalize(value: string): string {
  return value.normalize('NFKC').toLowerCase().trim().replace(/\s+/g, ' ');
}

function compact(value: string): string {
  return value.replace(/[^\p{L}\p{N}]/gu, '');
}
