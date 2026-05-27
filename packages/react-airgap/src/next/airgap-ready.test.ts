import { afterEach, describe, expect, test } from 'vitest';

import { airgapReady } from './airgap-ready.js';

const originalSelfDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'self');

function setSelf(value: unknown): void {
  Object.defineProperty(globalThis, 'self', {
    configurable: true,
    value,
  });
}

afterEach(() => {
  if (originalSelfDescriptor) {
    Object.defineProperty(globalThis, 'self', originalSelfDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, 'self');
  }
});

describe('airgapReady', () => {
  test('creates a ready queue stub when airgap is not ready yet', async () => {
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
    setSelf({
      airgap: {
        ready(callback: (airgap: unknown) => void) {
          callback({});
        },
      },
    });

    await expect(airgapReady()).resolves.toBeUndefined();
  });
});
