import { describe, it, expect } from 'vitest';

import { isLogWarn } from '@transcend-io/sdk';

describe('isLogWarn', () => {
  it('matches WARN/WARNING case-insensitively', () => {
    expect(isLogWarn('WARN disk low')).toBe(true);
    expect(isLogWarn('warning: heads-up')).toBe(true);
  });

  it('does not match non-warnings', () => {
    expect(isLogWarn('ERROR! nooo')).toBe(false);
    expect(isLogWarn('all good')).toBe(false);
  });
});
