import { describe, expect, it } from 'vitest';

import { normalizeIssuer } from '../src/oauth/normalize-issuer.js';

describe('normalizeIssuer', () => {
  it('strips trailing slashes', () => {
    expect(normalizeIssuer('https://yo.com:4001')).toBe('https://yo.com:4001');
    expect(normalizeIssuer('https://yo.com:4001/')).toBe('https://yo.com:4001');
    expect(normalizeIssuer('https://yo.com:4001///')).toBe('https://yo.com:4001');
  });
});
