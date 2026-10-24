import { Injectable } from '@nestjs/common';
import type { QueryProcessor } from '../interfaces/query-processor.interface';

const MAX_QUERIES = 2;

type QueryExpansionRule = {
  readonly match: string;
  readonly expansions: readonly string[];
};

const QUERY_EXPANSION_RULES: readonly QueryExpansionRule[] = [
  {
    match: '黑神话',
    expansions: ['黑神话悟空'],
  },
  {
    match: 'gta5',
    expansions: ['grand theft auto v', 'gta v'],
  },
] as const;

@Injectable()
export class RuleBasedQueryProcessor implements QueryProcessor {
  async process(keyword: string): Promise<string[]> {
    const baseQuery = normalizeQuery(keyword);
    const expandedQueries = QUERY_EXPANSION_RULES.filter(
      (rule) => rule.match === baseQuery,
    ).flatMap((rule) => rule.expansions);

    return uniqueQueries([baseQuery, ...expandedQueries]).slice(0, MAX_QUERIES);
  }
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

function uniqueQueries(queries: readonly string[]): string[] {
  const unique = new Set<string>();

  for (const query of queries) {
    const normalizedQuery = normalizeQuery(query);

    if (normalizedQuery.length > 0) {
      unique.add(normalizedQuery);
    }
  }

  return [...unique];
}
