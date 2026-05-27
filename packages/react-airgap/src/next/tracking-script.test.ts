import { describe, expect, test, vi } from 'vitest';

import { allOf, anyOf, onEvent, onPromise, type LoadTrigger } from './tracking-script.js';

describe('tracking script triggers', () => {
  test('onEvent loads once when the event fires', () => {
    const target = new EventTarget();
    const load = vi.fn();
    const cleanup = onEvent('ready', { target })(load);

    target.dispatchEvent(new Event('ready'));
    target.dispatchEvent(new Event('ready'));

    expect(load).toHaveBeenCalledTimes(1);
    cleanup?.();
  });

  test('onEvent loads immediately when the latch is already open', () => {
    const target = new EventTarget();
    const load = vi.fn();

    onEvent('ready', { target, latch: () => true })(load);

    expect(load).toHaveBeenCalledTimes(1);
  });

  test('onPromise loads when the promise resolves', async () => {
    const load = vi.fn();

    onPromise(Promise.resolve())(load);
    await Promise.resolve();

    expect(load).toHaveBeenCalledTimes(1);
  });

  test('anyOf loads once when the first trigger fires and cleans up every trigger', () => {
    const triggerCallbacks: Array<() => void> = [];
    const firstCleanup = vi.fn();
    const secondCleanup = vi.fn();
    const first: LoadTrigger = (load) => {
      triggerCallbacks[0] = load;
      return firstCleanup;
    };
    const second: LoadTrigger = (load) => {
      triggerCallbacks[1] = load;
      return secondCleanup;
    };
    const load = vi.fn();

    const cleanup = anyOf(first, second)(load);
    triggerCallbacks[0]?.();
    triggerCallbacks[1]?.();
    cleanup?.();

    expect(load).toHaveBeenCalledTimes(1);
    expect(firstCleanup).toHaveBeenCalledTimes(1);
    expect(secondCleanup).toHaveBeenCalledTimes(1);
  });

  test('allOf waits for every trigger and ignores duplicate trigger calls', () => {
    const triggerCallbacks: Array<() => void> = [];
    const first: LoadTrigger = (load) => {
      triggerCallbacks[0] = load;
    };
    const second: LoadTrigger = (load) => {
      triggerCallbacks[1] = load;
    };
    const load = vi.fn();

    allOf(first, second)(load);
    triggerCallbacks[0]?.();
    triggerCallbacks[0]?.();
    expect(load).not.toHaveBeenCalled();

    triggerCallbacks[1]?.();

    expect(load).toHaveBeenCalledTimes(1);
  });
});
