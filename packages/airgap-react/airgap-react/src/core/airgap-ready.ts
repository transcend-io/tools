import type { AirgapAPI } from '@transcend-io/airgap.js-types';

import { type ReadyApi, observeReadyApi } from './ready-api.js';

interface GlobalWithAirgap {
  /** Transcend airgap API or preload stub. */
  airgap?: AirgapAPI | Partial<ReadyApi<AirgapAPI>>;
}

let airgapReadyPromise: Promise<AirgapAPI> | undefined;

/**
 * Resolves when `self.airgap.ready(...)` fires.
 *
 * If airgap.js has not loaded yet, this creates the documented ready-queue
 * stub so the callback is drained when airgap.js initializes.
 */
export function airgapReady(): Promise<AirgapAPI> {
  airgapReadyPromise ??= new Promise((resolve) => {
    if (typeof self === 'undefined') return;

    const airgapGlobal = self as typeof self & GlobalWithAirgap;
    observeReadyApi<AirgapAPI>({
      api: airgapGlobal.airgap,
      onReady: resolve,
      setApi(airgap) {
        airgapGlobal.airgap = airgap;
      },
    });
  });

  return airgapReadyPromise;
}
