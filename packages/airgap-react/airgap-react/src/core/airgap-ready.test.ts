import { afterEach, describe, expect, test, vi } from 'vitest';

const originalSelfDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'self');

function setSelf(value: unknown): void {
  Object.defineProperty(globalThis, 'self', {
    configurable: true,
    value,
  });
}

afterEach(() => {
  vi.resetModules();
  if (originalSelfDescriptor) {
    Object.defineProperty(globalThis, 'self', originalSelfDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, 'self');
  }
});

describe('airgapReady', () => {
  test('creates a ready queue stub when airgap is not ready yet', async () => {
    const { airgapReady } = await import('./airgap-ready.js');
    const airgapGlobal = {} as {
      /** Transcend airgap API or preload stub. */
      airgap?: {
        /** Queue of callbacks to dispatch once airgap.js is ready. */
        readyQueue?: Array<(airgap: unknown) => void>;
      };
    };
    setSelf(airgapGlobal);
    const readyAirgap = {};
    const ready = airgapReady();

    expect(airgapGlobal.airgap?.readyQueue).toHaveLength(1);

    airgapGlobal.airgap?.readyQueue?.[0]?.(readyAirgap);
    await expect(ready).resolves.toBe(readyAirgap);
  });

  test('resolves from an existing airgap ready API', async () => {
    const { airgapReady } = await import('./airgap-ready.js');
    const readyAirgap = {};
    setSelf({
      airgap: {
        ready(callback: (airgap: unknown) => void) {
          callback(readyAirgap);
        },
      },
    });

    await expect(airgapReady()).resolves.toBe(readyAirgap);
  });

  test('resolves immediately when airgap is already initialized', async () => {
    const { airgapReady } = await import('./airgap-ready.js');
    const ready = vi.fn();
    const initializedAirgap = {
      addEventListener() {
        // Initialized airgap.js API is an EventTarget.
      },
      ready,
    };
    setSelf({
      airgap: initializedAirgap,
    });

    await expect(airgapReady()).resolves.toBe(initializedAirgap);
    expect(ready).not.toHaveBeenCalled();
  });

  test('reuses the same ready promise across calls', async () => {
    const { airgapReady } = await import('./airgap-ready.js');
    const airgapGlobal = {} as {
      /** Transcend airgap API or preload stub. */
      airgap?: {
        /** Queue of callbacks to dispatch once airgap.js is ready. */
        readyQueue?: Array<(airgap: unknown) => void>;
      };
    };
    setSelf(airgapGlobal);
    const readyAirgap = {};

    const firstReady = airgapReady();
    const secondReady = airgapReady();

    expect(secondReady).toBe(firstReady);
    expect(airgapGlobal.airgap?.readyQueue).toHaveLength(1);

    airgapGlobal.airgap?.readyQueue?.[0]?.(readyAirgap);
    await expect(firstReady).resolves.toBe(readyAirgap);
  });
});
