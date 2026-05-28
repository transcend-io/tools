import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { ConsentProvider } from './consent-manager.js';

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

const originalSelfDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'self');

function setSelf(value: unknown): void {
  Object.defineProperty(globalThis, 'self', {
    configurable: true,
    value,
  });
}

function useUndefinedConsentState(): {
  /** Airgap setState mock. */
  setAirgap: ReturnType<typeof vi.fn>;
  /** Transcend setState mock. */
  setTranscend: ReturnType<typeof vi.fn>;
} {
  const setAirgap = vi.fn();
  const setTranscend = vi.fn();

  reactMocks.useState
    .mockReturnValueOnce([undefined, setAirgap])
    .mockReturnValueOnce([undefined, setTranscend]);

  return { setAirgap, setTranscend };
}

describe('ConsentProvider', () => {
  beforeEach(() => {
    reactMocks.useEffect.mockReset();
    reactMocks.useState.mockReset();
  });

  afterEach(() => {
    if (originalSelfDescriptor) {
      Object.defineProperty(globalThis, 'self', originalSelfDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'self');
    }
  });

  test('stubs airgap and transcend ready queues', () => {
    setSelf({});
    const { setAirgap, setTranscend } = useUndefinedConsentState();
    reactMocks.useEffect.mockImplementation((effect: () => void | (() => void)) => effect());

    ConsentProvider({
      airgapSrc: 'https://transcend-cdn.com/cm/example/airgap.js',
      children: 'children',
    });
    const consentGlobals = self as typeof self & {
      /** airgap.js preload stub. */
      airgap?: { readyQueue?: Array<(api: unknown) => void> };
      /** Transcend preload stub. */
      transcend?: { readyQueue?: Array<(api: unknown) => void> };
    };

    expect(consentGlobals.airgap?.readyQueue).toHaveLength(1);
    expect(consentGlobals.transcend?.readyQueue).toHaveLength(1);

    const readyAirgap = {};
    const readyTranscend = {};
    consentGlobals.airgap?.readyQueue?.[0]?.(readyAirgap);
    consentGlobals.transcend?.readyQueue?.[0]?.(readyTranscend);

    expect(setAirgap).toHaveBeenCalledWith(readyAirgap);
    expect(setTranscend).toHaveBeenCalledWith(readyTranscend);
  });

  test('preserves existing ready queues', () => {
    const existingAirgapReady = vi.fn();
    const existingTranscendReady = vi.fn();
    setSelf({
      airgap: { readyQueue: [existingAirgapReady] },
      transcend: { readyQueue: [existingTranscendReady] },
    });
    useUndefinedConsentState();
    reactMocks.useEffect.mockImplementation((effect: () => void | (() => void)) => effect());

    ConsentProvider({
      airgapSrc: 'https://transcend-cdn.com/cm/example/airgap.js',
      children: 'children',
    });
    const consentGlobals = self as typeof self & {
      /** airgap.js preload stub. */
      airgap?: { readyQueue?: unknown[] };
      /** Transcend preload stub. */
      transcend?: { readyQueue?: unknown[] };
    };

    expect(consentGlobals.airgap?.readyQueue?.[0]).toBe(existingAirgapReady);
    expect(consentGlobals.airgap?.readyQueue).toHaveLength(2);
    expect(consentGlobals.transcend?.readyQueue?.[0]).toBe(existingTranscendReady);
    expect(consentGlobals.transcend?.readyQueue).toHaveLength(2);
  });

  test('does not set state after unmount', () => {
    setSelf({});
    const { setAirgap, setTranscend } = useUndefinedConsentState();
    const cleanupRef: {
      /** Effect cleanup callback. */
      current?: () => void;
    } = {};
    reactMocks.useEffect.mockImplementation((effect: () => void | (() => void)) => {
      const cleanup = effect();
      if (typeof cleanup === 'function') cleanupRef.current = cleanup;
    });

    ConsentProvider({
      airgapSrc: 'https://transcend-cdn.com/cm/example/airgap.js',
      children: 'children',
    });
    const consentGlobals = self as typeof self & {
      /** airgap.js preload stub. */
      airgap?: { readyQueue?: Array<(api: unknown) => void> };
      /** Transcend preload stub. */
      transcend?: { readyQueue?: Array<(api: unknown) => void> };
    };

    cleanupRef.current?.();
    consentGlobals.airgap?.readyQueue?.[0]?.({});
    consentGlobals.transcend?.readyQueue?.[0]?.({});

    expect(setAirgap).not.toHaveBeenCalled();
    expect(setTranscend).not.toHaveBeenCalled();
  });

  test('sets state immediately when APIs are already initialized', () => {
    const readyAirgap = {
      addEventListener() {
        // Initialized APIs are EventTargets.
      },
    };
    const readyTranscend = {
      addEventListener() {
        // Initialized APIs are EventTargets.
      },
    };
    setSelf({
      airgap: readyAirgap,
      transcend: readyTranscend,
    });
    const { setAirgap, setTranscend } = useUndefinedConsentState();
    reactMocks.useEffect.mockImplementation((effect: () => void | (() => void)) => effect());

    ConsentProvider({
      airgapSrc: 'https://transcend-cdn.com/cm/example/airgap.js',
      children: 'children',
    });

    expect(setAirgap).toHaveBeenCalledWith(readyAirgap);
    expect(setTranscend).toHaveBeenCalledWith(readyTranscend);
  });

  test('renders Script with the provided airgap source', () => {
    useUndefinedConsentState();
    reactMocks.useEffect.mockImplementation(() => undefined);

    const result = ConsentProvider({
      airgapSrc: 'https://transcend-cdn.com/cm/example/airgap.js',
      children: 'children',
      scriptProps: { id: 'airgap', strategy: 'afterInteractive' },
    }) as ReactElement<{ children: ReactElement<Record<string, unknown>>[] }>;
    const [scriptElement] = result.props.children;

    expect(scriptElement?.props.src).toBe('https://transcend-cdn.com/cm/example/airgap.js');
    expect(scriptElement?.props.id).toBe('airgap');
    expect(scriptElement?.props.strategy).toBe('afterInteractive');
  });
});
