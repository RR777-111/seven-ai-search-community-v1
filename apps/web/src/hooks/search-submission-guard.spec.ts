import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { acquireSearchSubmission, releaseSearchSubmission } from './search-submission-guard.ts';

describe('search submission guard', () => {
  it('allows only the first of ten pending submit attempts', () => {
    const pending = { current: false };
    const attempts = Array.from({ length: 10 }, () => acquireSearchSubmission(pending));

    assert.deepEqual(attempts, [
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it('allows a new search after the active request releases the guard', () => {
    const pending = { current: false };

    assert.equal(acquireSearchSubmission(pending), true);
    releaseSearchSubmission(pending);
    assert.equal(acquireSearchSubmission(pending), true);
  });
});
