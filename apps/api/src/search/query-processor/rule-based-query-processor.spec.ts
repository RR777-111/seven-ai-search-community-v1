import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { RuleBasedQueryProcessor } from './rule-based-query-processor';

describe('RuleBasedQueryProcessor', () => {
  it('trims leading and trailing whitespace', async () => {
    const processor = new RuleBasedQueryProcessor();

    const queries = await processor.process('  普通关键词  ');

    assert.deepEqual(queries, ['普通关键词']);
  });

  it('collapses repeated whitespace', async () => {
    const processor = new RuleBasedQueryProcessor();

    const queries = await processor.process('black   myth\t悟空');

    assert.deepEqual(queries, ['black myth 悟空']);
  });

  it('normalizes latin letters to lowercase', async () => {
    const processor = new RuleBasedQueryProcessor();

    const queries = await processor.process('Black Myth WUKONG');

    assert.deepEqual(queries, ['black myth wukong']);
  });

  it('keeps the normalized original keyword as the base query', async () => {
    const processor = new RuleBasedQueryProcessor();

    const queries = await processor.process('黑神话');

    assert.equal(queries[0], '黑神话');
  });

  it('expands 黑神话 to 黑神话悟空', async () => {
    const processor = new RuleBasedQueryProcessor();

    const queries = await processor.process('黑神话');

    assert.deepEqual(queries, ['黑神话', '黑神话悟空']);
  });

  it('expands gta5 to grand theft auto v', async () => {
    const processor = new RuleBasedQueryProcessor();

    const queries = await processor.process('gta5');

    assert.deepEqual(queries, ['gta5', 'grand theft auto v']);
  });

  it('returns at most two queries', async () => {
    const processor = new RuleBasedQueryProcessor();

    const queries = await processor.process('gta5');

    assert.equal(queries.length, 2);
  });
});
