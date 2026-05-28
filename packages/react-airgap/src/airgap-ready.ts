import type { AirgapAPI } from '@transcend-io/airgap.js-types';

type PreInitAirgapAPI = Pick<AirgapAPI, 'ready' | 'readyQueue'>;

interface GlobalWithAirgap {
  /** Transcend airgap API or preload stub. */
  airgap?: AirgapAPI | Partial<PreInitAirgapAPI>;
}

let airgapReadyPromise: Promise<AirgapAPI> | undefined;

function isInitializedAirgapApi(
  airgap: AirgapAPI | Partial<PreInitAirgapAPI> | undefined,
): airgap is AirgapAPI {
  return (
    typeof (airgap as { addEventListener?: unknown } | undefined)?.addEventListener === 'function'
  );
}

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
    const existingAirgap = airgapGlobal.airgap;

    if (isInitializedAirgapApi(existingAirgap)) {
      resolve(existingAirgap);
      return;
    }

    if (!existingAirgap?.ready) {
      const readyQueue = existingAirgap?.readyQueue ?? [];
      airgapGlobal.airgap = {
        ...existingAirgap,
        readyQueue,
        ready(callback) {
          readyQueue.push(callback);
        },
      };
    }

    const airgap = airgapGlobal.airgap as PreInitAirgapAPI;
    airgap.ready((readyAirgap) => resolve(readyAirgap));
  });

  return airgapReadyPromise;
}
