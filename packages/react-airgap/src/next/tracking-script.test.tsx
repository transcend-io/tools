import type { ReactElement } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import TrackingScript from './tracking-script.js';

const reactMocks = vi.hoisted(() => ({
  useEffect: vi.fn(),
  useState: vi.fn(),
}));

vi.mock('next/script', () => ({
  default: function MockScript(): null {
    return null;
  },
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();

  return {
    ...actual,
    useEffect: reactMocks.useEffect,
    useState: reactMocks.useState,
  };
});

describe('TrackingScript', () => {
  beforeEach(() => {
    reactMocks.useEffect.mockReset();
    reactMocks.useState.mockReset();
  });

  test('renders nothing before loadAfter resolves', async () => {
    let resolveLoad!: () => void;
    const loadAfter = new Promise<void>((resolve) => {
      resolveLoad = resolve;
    });
    const setOpen = vi.fn();
    reactMocks.useState.mockReturnValue([false, setOpen]);
    reactMocks.useEffect.mockImplementation((effect: () => void | (() => void)) => effect());

    const result = TrackingScript({
      loadAfter,
      src: 'https://cdn.example.com/analytics.js',
    });

    expect(result).toBeNull();
    expect(setOpen).not.toHaveBeenCalled();

    resolveLoad();
    await loadAfter;
    await Promise.resolve();

    expect(setOpen).toHaveBeenCalledWith(true);
  });

  test('does not open after unmount', async () => {
    let resolveLoad!: () => void;
    const loadAfter = new Promise<void>((resolve) => {
      resolveLoad = resolve;
    });
    const setOpen = vi.fn();
    const cleanupRef: {
      /** Effect cleanup callback. */
      current?: () => void;
    } = {};
    reactMocks.useState.mockReturnValue([false, setOpen]);
    reactMocks.useEffect.mockImplementation((effect: () => void | (() => void)) => {
      const cleanup = effect();
      if (typeof cleanup === 'function') cleanupRef.current = cleanup;
    });

    TrackingScript({
      loadAfter,
      src: 'https://cdn.example.com/analytics.js',
    });
    cleanupRef.current?.();
    resolveLoad();
    await loadAfter;
    await Promise.resolve();

    expect(setOpen).not.toHaveBeenCalled();
  });

  test('renders the underlying script after loadAfter resolves', () => {
    reactMocks.useState.mockReturnValue([true, vi.fn()]);
    reactMocks.useEffect.mockImplementation(() => undefined);

    const result = TrackingScript({
      children: 'window.analytics = true;',
      id: 'analytics-init',
      loadAfter: Promise.resolve(),
      strategy: 'afterInteractive',
    });
    const scriptElement = result as ReactElement<Record<string, unknown>>;

    expect(scriptElement.props.id).toBe('analytics-init');
    expect(scriptElement.props.strategy).toBe('afterInteractive');
    expect(scriptElement.props.children).toBe('window.analytics = true;');
  });
});
