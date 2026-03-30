import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { RateCounter } from './RateCounter.js';

describe('RateCounter', () => {
  const T0 = 1_700_000_000_000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 rate when no buckets exist', () => {
    const rc = new RateCounter();
    expect(rc.rate(60_000)).toBe(0);
    expect(rc.rate(10_000)).toBe(0);
    expect(rc.rate(120_000)).toBe(0);
  });

  it('computes rate over a window including only recent buckets', () => {
    const rc = new RateCounter();

    vi.setSystemTime(T0);
    rc.add(10);

    vi.setSystemTime(T0 + 30_000);
    rc.add(20);

    vi.setSystemTime(T0 + 70_000);
    rc.add(30);

    const r = rc.rate(60_000);
    expect(r).toBeCloseTo(50 / 60, 6);
  });

  it('includes a bucket exactly at the cutoff boundary', () => {
    const rc = new RateCounter();

    vi.setSystemTime(T0);
    rc.add(10);

    vi.setSystemTime(T0 + 60_000);
    const r = rc.rate(60_000);
    expect(r).toBeCloseTo(10 / 60, 6);
  });

  it('prunes buckets older than 120s on add()', () => {
    const rc = new RateCounter();

    vi.setSystemTime(T0);
    rc.add(100);

    vi.setSystemTime(T0 + 150_000);
    rc.add(50);

    const r = rc.rate(600_000);
    expect(r).toBeCloseTo(50 / 600, 6);
  });
});
