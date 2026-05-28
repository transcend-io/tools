import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { ConsentProvider, useConsentManager } from './use-consent-manager.js';

const reactMocks = vi.hoisted(() => ({
  useEffect: vi.fn(),
  useContext: vi.fn(),
  useState: vi.fn(),
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();

  return {
    ...actual,
    useEffect: reactMocks.useEffect,
    useContext: reactMocks.useContext,
    useState: reactMocks.useState,
  };
});

const originalSelfDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'self');
const originalDocumentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');

function setSelf(value: unknown): void {
  Object.defineProperty(globalThis, 'self', {
    configurable: true,
    value,
  });
}

function setDocument(value: unknown): void {
  Object.defineProperty(globalThis, 'document', {
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
    reactMocks.useContext.mockReset();
    reactMocks.useState.mockReset();
  });

  afterEach(() => {
    if (originalSelfDescriptor) {
      Object.defineProperty(globalThis, 'self', originalSelfDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'self');
    }
    if (originalDocumentDescriptor) {
      Object.defineProperty(globalThis, 'document', originalDocumentDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'document');
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
    const cleanups: Array<() => void> = [];
    reactMocks.useEffect.mockImplementation((effect: () => void | (() => void)) => {
      const cleanup = effect();
      if (typeof cleanup === 'function') cleanups.push(cleanup);
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

    for (const cleanup of cleanups) cleanup();
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

  test('injects a script with the provided airgap source', () => {
    setSelf({});
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
    useUndefinedConsentState();
    reactMocks.useEffect.mockImplementation((effect: () => void | (() => void)) => effect());

    ConsentProvider({
      airgapSrc: 'https://transcend-cdn.com/cm/example/airgap.js',
      children: 'children',
      scriptProps: { id: 'airgap' },
    });
    const [scriptElement] = appendedScripts as Array<{
      /** Script async attribute. */
      async: boolean;
      /** Script defer attribute. */
      defer: boolean;
      /** Script element ID. */
      id: string;
      /** Script source URL. */
      src: string;
    }>;

    expect(scriptElement?.src).toBe('https://transcend-cdn.com/cm/example/airgap.js');
    expect(scriptElement?.id).toBe('airgap');
    expect(scriptElement?.async).toBe(true);
    expect(scriptElement?.defer).toBe(true);
  });

  test('observes consent APIs without injecting a script when airgapSrc is omitted', () => {
    setSelf({});
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
    useUndefinedConsentState();
    reactMocks.useEffect.mockImplementation((effect: () => void | (() => void)) => effect());

    ConsentProvider({
      children: 'children',
    });
    const consentGlobals = self as typeof self & {
      /** airgap.js preload stub. */
      airgap?: { readyQueue?: Array<(api: unknown) => void> };
      /** Transcend preload stub. */
      transcend?: { readyQueue?: Array<(api: unknown) => void> };
    };

    expect(appendedScripts).toHaveLength(0);
    expect(consentGlobals.airgap?.readyQueue).toHaveLength(1);
    expect(consentGlobals.transcend?.readyQueue).toHaveLength(1);
  });
});

describe('useConsentManager', () => {
  beforeEach(() => {
    reactMocks.useEffect.mockReset();
    reactMocks.useContext.mockReset();
    reactMocks.useState.mockReset();
  });

  afterEach(() => {
    if (originalSelfDescriptor) {
      Object.defineProperty(globalThis, 'self', originalSelfDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'self');
    }
  });

  test('returns consent APIs from provider context', () => {
    const consentApis = {
      airgap: {},
      transcend: {},
    };
    reactMocks.useContext.mockReturnValue(consentApis);
    reactMocks.useState.mockReturnValue([{}, vi.fn()]);
    reactMocks.useEffect.mockImplementation(() => undefined);

    expect(useConsentManager()).toBe(consentApis);
  });

  test('falls back to initialized globals without a provider', () => {
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
    reactMocks.useContext.mockReturnValue(undefined);
    reactMocks.useState.mockImplementation((initializer: () => unknown) => [
      initializer(),
      vi.fn(),
    ]);
    reactMocks.useEffect.mockImplementation(() => undefined);

    expect(useConsentManager()).toEqual({
      airgap: readyAirgap,
      transcend: readyTranscend,
    });
  });

  test('observes ready queues without a provider', () => {
    setSelf({});
    const setObservedConsentApis = vi.fn();
    reactMocks.useContext.mockReturnValue(undefined);
    reactMocks.useState.mockReturnValue([{}, setObservedConsentApis]);
    reactMocks.useEffect.mockImplementation((effect: () => void | (() => void)) => effect());

    useConsentManager();
    const consentGlobals = self as typeof self & {
      /** airgap.js preload stub. */
      airgap?: { readyQueue?: Array<(api: unknown) => void> };
      /** Transcend preload stub. */
      transcend?: { readyQueue?: Array<(api: unknown) => void> };
    };
    const readyAirgap = {};
    const readyTranscend = {};

    consentGlobals.airgap?.readyQueue?.[0]?.(readyAirgap);
    consentGlobals.transcend?.readyQueue?.[0]?.(readyTranscend);

    expect(setObservedConsentApis).toHaveBeenCalledTimes(2);
    expect(setObservedConsentApis).toHaveBeenNthCalledWith(1, expect.any(Function));
    expect(setObservedConsentApis).toHaveBeenNthCalledWith(2, expect.any(Function));

    const airgapUpdater = setObservedConsentApis.mock.calls[0]?.[0] as (
      current: unknown,
    ) => unknown;
    const transcendUpdater = setObservedConsentApis.mock.calls[1]?.[0] as (
      current: unknown,
    ) => unknown;

    expect(airgapUpdater({})).toEqual({ airgap: readyAirgap });
    expect(transcendUpdater({})).toEqual({ transcend: readyTranscend });
  });

  test('does not update fallback state after unmount', () => {
    setSelf({});
    const setObservedConsentApis = vi.fn();
    const cleanupRef: {
      /** Effect cleanup callback. */
      current?: () => void;
    } = {};
    reactMocks.useContext.mockReturnValue(undefined);
    reactMocks.useState.mockReturnValue([{}, setObservedConsentApis]);
    reactMocks.useEffect.mockImplementation((effect: () => void | (() => void)) => {
      const cleanup = effect();
      if (typeof cleanup === 'function') cleanupRef.current = cleanup;
    });

    useConsentManager();
    const consentGlobals = self as typeof self & {
      /** airgap.js preload stub. */
      airgap?: { readyQueue?: Array<(api: unknown) => void> };
      /** Transcend preload stub. */
      transcend?: { readyQueue?: Array<(api: unknown) => void> };
    };

    cleanupRef.current?.();
    consentGlobals.airgap?.readyQueue?.[0]?.({});
    consentGlobals.transcend?.readyQueue?.[0]?.({});

    expect(setObservedConsentApis).not.toHaveBeenCalled();
  });
});
