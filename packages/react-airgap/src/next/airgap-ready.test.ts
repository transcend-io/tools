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
    const ready = airgapReady();

    expect(airgapGlobal.airgap?.readyQueue).toHaveLength(1);

    airgapGlobal.airgap?.readyQueue?.[0]?.({});
    await expect(ready).resolves.toBeUndefined();
  });

  test('resolves from an existing airgap ready API', async () => {
    const { airgapReady } = await import('./airgap-ready.js');
    setSelf({
      airgap: {
        ready(callback: (airgap: unknown) => void) {
          callback({});
        },
      },
    });

    await expect(airgapReady()).resolves.toBeUndefined();
  });

  test('resolves immediately when airgap is already initialized', async () => {
    const { airgapReady } = await import('./airgap-ready.js');
    const ready = vi.fn();
    setSelf({
      airgap: {
        addEventListener() {
          // Initialized airgap.js API is an EventTarget.
        },
        ready,
      },
    });

    await expect(airgapReady()).resolves.toBeUndefined();
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

    const firstReady = airgapReady();
    const secondReady = airgapReady();

    expect(secondReady).toBe(firstReady);
    expect(airgapGlobal.airgap?.readyQueue).toHaveLength(1);

    airgapGlobal.airgap?.readyQueue?.[0]?.({});
    await expect(firstReady).resolves.toBeUndefined();
  });
});
