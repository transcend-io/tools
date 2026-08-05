import { describe, expect, it } from 'vitest';

import { DsrRequestOutcome } from './index.js';

describe('DsrRequestOutcome', () => {
  it('exports the four bulk submission outcomes', () => {
    expect(Object.values(DsrRequestOutcome)).toEqual([
      'CREATED',
      'ALREADY_OPEN',
      'DROP_RECORDS_LINKED',
      'RESTARTED',
    ]);
  });
});
