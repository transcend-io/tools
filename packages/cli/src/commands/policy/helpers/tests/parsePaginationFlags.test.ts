import { describe, expect, it } from 'vitest';

import { MAX_POLICY_LIMIT, parseLimitParam, parseOffsetParam } from '../parsePaginationFlags.js';

describe('parseLimitParam', () => {
  it('accepts a positive integer', () => {
    expect(parseLimitParam('50')).toBe(50);
  });

  it('accepts the maximum page size', () => {
    expect(parseLimitParam(String(MAX_POLICY_LIMIT))).toBe(MAX_POLICY_LIMIT);
  });

  it('rejects non-numeric input', () => {
    expect(() => parseLimitParam('abc')).toThrow(/--limit must be a positive integer/i);
  });

  it('rejects fractional values', () => {
    expect(() => parseLimitParam('2.5')).toThrow(/--limit must be a positive integer/i);
  });

  it('rejects zero and negative values', () => {
    expect(() => parseLimitParam('0')).toThrow(/--limit must be a positive integer/i);
    expect(() => parseLimitParam('-5')).toThrow(/--limit must be a positive integer/i);
  });

  it('rejects values above the server-side cap', () => {
    expect(() => parseLimitParam(String(MAX_POLICY_LIMIT + 1))).toThrow(
      new RegExp(`--limit must be at most ${MAX_POLICY_LIMIT}`),
    );
  });
});

describe('parseOffsetParam', () => {
  it('accepts zero', () => {
    expect(parseOffsetParam('0')).toBe(0);
  });

  it('accepts a positive integer', () => {
    expect(parseOffsetParam('25')).toBe(25);
  });

  it('rejects non-numeric input', () => {
    expect(() => parseOffsetParam('abc')).toThrow(/--offset must be a non-negative integer/i);
  });

  it('rejects fractional values', () => {
    expect(() => parseOffsetParam('2.5')).toThrow(/--offset must be a non-negative integer/i);
  });

  it('rejects negative values', () => {
    expect(() => parseOffsetParam('-1')).toThrow(/--offset must be a non-negative integer/i);
  });
});
