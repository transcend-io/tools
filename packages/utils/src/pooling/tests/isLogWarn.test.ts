import { isLogWarn } from '@transcend-io/utils';
import { describe, it, expect } from 'vitest';

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
