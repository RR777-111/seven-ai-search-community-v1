import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getInitialVisibleResultCount,
  getNextVisibleResultCount,
  SEARCH_RESULTS_BATCH_SIZE,
  shouldLoadMoreSearchResults,
} from './search-results-pagination.ts';

describe('search results pagination helpers', () => {
  it('shows 15 results initially when more are available', () => {
    assert.equal(SEARCH_RESULTS_BATCH_SIZE, 15);
    assert.equal(getInitialVisibleResultCount(300), 15);
  });

  it('shows every result when fewer than 15 are available', () => {
    assert.equal(getInitialVisibleResultCount(8), 8);
    assert.equal(getInitialVisibleResultCount(0), 0);
  });

  it('loads one 15-result batch at a time and stops at the filtered total', () => {
    assert.equal(getNextVisibleResultCount(15, 44), 30);
    assert.equal(getNextVisibleResultCount(30, 44), 44);
    assert.equal(getNextVisibleResultCount(44, 44), 44);
  });

  it('resets a changed filter to the first 15 results', () => {
    assert.equal(getInitialVisibleResultCount(80), 15);
    assert.equal(getInitialVisibleResultCount(12), 12);
  });

  it('blocks duplicate observer callbacks while a batch is being applied', () => {
    assert.equal(
      shouldLoadMoreSearchResults({
        hasMore: true,
        isIntersecting: true,
        isLoadingBatch: false,
      }),
      true,
    );
    assert.equal(
      shouldLoadMoreSearchResults({
        hasMore: true,
        isIntersecting: true,
        isLoadingBatch: true,
      }),
      false,
    );
    assert.equal(
      shouldLoadMoreSearchResults({
        hasMore: false,
        isIntersecting: true,
        isLoadingBatch: false,
      }),
      false,
    );
  });
});
