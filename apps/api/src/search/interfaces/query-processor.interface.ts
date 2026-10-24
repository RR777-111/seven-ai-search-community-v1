export const QUERY_PROCESSOR = Symbol('QUERY_PROCESSOR');

export interface QueryProcessor {
  process(keyword: string): Promise<string[]>;
}
