import { describe, expect, test } from 'vitest';

import { waitForLoadAfter } from './tracking-script.js';

describe('waitForLoadAfter', () => {
  test('resolves after a single promise resolves', async () => {
    const value = {};

    const result = await waitForLoadAfter(Promise.resolve(value));

    expect(result).toBe(value);
  });

  test('waits for promise composition from the caller', async () => {
    let resolveFirst!: () => void;
    let resolveSecond!: () => void;
    const first = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    const second = new Promise<void>((resolve) => {
      resolveSecond = resolve;
    });
    let resolved = false;

    void waitForLoadAfter(Promise.all([first, second])).then(() => {
      resolved = true;
    });
    resolveFirst();
    await Promise.resolve();
    expect(resolved).toBe(false);

    resolveSecond();
    await Promise.all([first, second]);
    await Promise.resolve();
    expect(resolved).toBe(true);
  });

  test('rejects when a load promise rejects', async () => {
    const error = new Error('gate failed');

    await expect(waitForLoadAfter(Promise.reject(error))).rejects.toThrow(error);
  });
});
