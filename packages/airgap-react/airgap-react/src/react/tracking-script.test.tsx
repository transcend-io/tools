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
    createElement: vi.fn(() => {
      const attributes: Record<string, string> = {};
      const listeners: Record<string, EventListener[]> = {};
      return {
        dataset: {} as Record<string, string>,
        attributes,
        listeners,
        setAttribute(name: string, value: string): void {
          attributes[name] = value;
        },
        addEventListener(type: string, handler: EventListener): void {
          (listeners[type] ??= []).push(handler);
        },
        remove: vi.fn(),
      };
    }),
    head: {
      appendChild: vi.fn((script: unknown) => appendedScripts.push(script)),
    },
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

  test('does not re-inject after rerender when script props are unchanged', async () => {
    const loadAfter = Promise.resolve();
    const appendedScripts = stubDocument();
    let previousDeps: readonly unknown[] | undefined;
    let previousCleanup: (() => void) | undefined;
    reactMocks.useEffect.mockImplementation(
      (effect: () => void | (() => void), deps?: readonly unknown[]) => {
        const depsChanged =
          !previousDeps ||
          !deps ||
          deps.length !== previousDeps.length ||
          deps.some((dep, index) => dep !== previousDeps?.[index]);

        if (depsChanged) {
          previousCleanup?.();
          const cleanup = effect();
          previousCleanup = typeof cleanup === 'function' ? cleanup : undefined;
          previousDeps = deps;
        }
      },
    );

    TrackingScript({
      dataset: { purpose: 'analytics' },
      id: 'analytics',
      loadAfter,
      src: 'https://cdn.example.com/analytics.js',
    });
    await Promise.resolve();

    TrackingScript({
      dataset: { purpose: 'analytics' },
      id: 'analytics',
      loadAfter,
      src: 'https://cdn.example.com/analytics.js',
    });
    await Promise.resolve();

    const [scriptElement] = appendedScripts as Array<{
      /** Removes the script element. */
      remove: ReturnType<typeof vi.fn>;
    }>;
    expect(appendedScripts).toHaveLength(1);
    expect(scriptElement?.remove).not.toHaveBeenCalled();
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
      /** Recorded string attributes. */
      attributes: Record<string, string>;
      /** Inline script body. */
      text: string;
    }>;

    expect(result).toBeNull();
    expect(scriptElement?.attributes.id).toBe('analytics-init');
    expect(scriptElement?.text).toBe('window.analytics = true;');
  });

  test('forwards passthrough attributes and fires onLoad', async () => {
    const appendedScripts = stubDocument();
    reactMocks.useEffect.mockImplementation((effect: () => void | (() => void)) => effect());
    const onLoad = vi.fn();

    TrackingScript({
      dataset: { purpose: 'analytics' },
      fetchPriority: 'high',
      integrity: 'sha384-abc',
      loadAfter: Promise.resolve(),
      onLoad,
      src: 'https://cdn.example.com/analytics.js',
      type: 'text/javascript',
    });

    await Promise.resolve();
    const [scriptElement] = appendedScripts as Array<{
      /** Recorded string attributes. */
      attributes: Record<string, string>;
      /** Recorded `data-*` attributes. */
      dataset: Record<string, string>;
      /** Recorded event listeners keyed by event type. */
      listeners: Record<string, EventListener[]>;
    }>;

    // Attributes outside the old hand-written allow-list flow through now.
    expect(scriptElement?.attributes.fetchpriority).toBe('high');
    expect(scriptElement?.attributes.type).toBe('text/javascript');
    expect(scriptElement?.attributes.integrity).toBe('sha384-abc');
    expect(scriptElement?.dataset.purpose).toBe('analytics');

    scriptElement?.listeners.load?.forEach((handler) => handler(new Event('load')));
    expect(onLoad).toHaveBeenCalledTimes(1);
  });
});
