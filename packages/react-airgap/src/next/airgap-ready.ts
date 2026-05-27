type AirgapReadyCallback = (airgap: unknown) => void;

interface AirgapReadyApi {
  /** Queue of callbacks to dispatch once airgap.js is ready. */
  readyQueue?: AirgapReadyCallback[];
  /** Subscribe to the airgap.js ready event. */
  ready(callback: AirgapReadyCallback): void;
}

interface GlobalWithAirgap {
  /** Transcend airgap API or preload stub. */
  airgap?: Partial<AirgapReadyApi>;
}

/**
 * Resolves when `self.airgap.ready(...)` fires.
 *
 * If airgap.js has not loaded yet, this creates the documented ready-queue
 * stub so the callback is drained when airgap.js initializes.
 */
export function airgapReady(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof self === 'undefined') return;

    const airgapGlobal = self as typeof self & GlobalWithAirgap;
    const existingAirgap = airgapGlobal.airgap;

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

    const airgap = airgapGlobal.airgap as AirgapReadyApi;
    airgap.ready(() => resolve());
  });
}
