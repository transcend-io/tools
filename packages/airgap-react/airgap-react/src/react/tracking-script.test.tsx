import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { TrackingScript } from './tracking-script.js';

const reactMocks = vi.hoisted(() => ({
  useEffect: vi.fn(),
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();

  return {
    ...actual,
    useEffect: reactMocks.useEffect,
  };
});

const originalDocumentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');

function setDocument(value: unknown): void {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value,
  });
}

function stubDocument(): unknown[] {
  const appendedScripts: unknown[] = [];
  setDocument({
    createElement: vi.fn(() => ({
      dataset: {},
      remove: vi.fn(),
    })),
    documentElement: {
      appendChild: vi.fn((script: unknown) => appendedScripts.push(script)),
    },
  });

  return appendedScripts;
}

describe('TrackingScript', () => {
  beforeEach(() => {
    reactMocks.useEffect.mockReset();
  });

  afterEach(() => {
    if (originalDocumentDescriptor) {
      Object.defineProperty(globalThis, 'document', originalDocumentDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'document');
    }
  });

  test('injects nothing before loadAfter resolves', async () => {
    let resolveLoad!: () => void;
    const loadAfter = new Promise<void>((resolve) => {
      resolveLoad = resolve;
    });
    const appendedScripts = stubDocument();
    reactMocks.useEffect.mockImplementation((effect: () => void | (() => void)) => effect());

    const result = TrackingScript({
      loadAfter,
      src: 'https://cdn.example.com/analytics.js',
    });

    expect(result).toBeNull();
    expect(appendedScripts).toHaveLength(0);

    resolveLoad();
    await loadAfter;
    await Promise.resolve();

    expect(appendedScripts).toHaveLength(1);
  });

  test('does not inject after unmount', async () => {
    let resolveLoad!: () => void;
    const loadAfter = new Promise<void>((resolve) => {
      resolveLoad = resolve;
    });
    const appendedScripts = stubDocument();
    const cleanupRef: {
      /** Effect cleanup callback. */
      current?: () => void;
    } = {};
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

    expect(appendedScripts).toHaveLength(0);
  });

  test('injects inline script after loadAfter resolves', async () => {
    const appendedScripts = stubDocument();
    reactMocks.useEffect.mockImplementation((effect: () => void | (() => void)) => effect());

    const result = TrackingScript({
      children: 'window.analytics = true;',
      id: 'analytics-init',
      loadAfter: Promise.resolve(),
    });

    await Promise.resolve();
    const [scriptElement] = appendedScripts as Array<{
      /** Script element ID. */
      id: string;
      /** Inline script body. */
      text: string;
    }>;

    expect(result).toBeNull();
    expect(scriptElement?.id).toBe('analytics-init');
    expect(scriptElement?.text).toBe('window.analytics = true;');
  });
});
