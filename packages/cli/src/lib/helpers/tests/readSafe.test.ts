import { describe, it, expect, vi } from 'vitest';

import { readSafe } from '../readSafe.js';

describe('readSafe', () => {
  /**
   * When path is undefined, it should return an empty string
   * and not call fs at all.
   */
  it('returns empty string when path is undefined', () => {
    const readFile = vi.fn();
    const out = readSafe(undefined, readFile);
    expect(out).toBe('');
    expect(readFile).not.toHaveBeenCalled();
  });

  /**
   * When given a valid path, it returns the file contents
   * and calls fs.readFileSync with 'utf8' encoding.
   */
  it('reads and returns file contents with utf8', () => {
    const readFile = vi.fn().mockReturnValue('hello world');
    const out = readSafe('/tmp/test.txt', readFile);
    expect(out).toBe('hello world');
    expect(readFile).toHaveBeenCalledTimes(1);
    expect(readFile).toHaveBeenCalledWith('/tmp/test.txt', 'utf8');
  });

  /**
   * If fs.readFileSync throws, the function should swallow the error
   * and return an empty string.
   */
  it('returns empty string when readFileSync throws', () => {
    const readFile = vi.fn(() => {
      throw new Error('boom');
    });
    const out = readSafe('/tmp/missing.txt', readFile);
    expect(out).toBe('');
    expect(readFile).toHaveBeenCalledTimes(1);
  });

  /**
   * Empty string path is treated as "no path" (falsy) and returns empty,
   * without calling fs.
   */
  it('returns empty string when path is an empty string', () => {
    const readFile = vi.fn();
    const out = readSafe('', readFile);
    expect(out).toBe('');
    expect(readFile).not.toHaveBeenCalled();
  });
});
