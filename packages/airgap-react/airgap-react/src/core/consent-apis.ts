import type { AirgapAPI, PreInitTranscendAPI, TranscendAPI } from '@transcend-io/airgap.js-types';

type PreInitAirgapAPI = Pick<AirgapAPI, 'ready' | 'readyQueue'>;

type ReadyApi<TApi> = {
  /** Queue of callbacks to dispatch once the API is ready. */
  readyQueue?: Array<(api: TApi) => void>;
  /** Subscribe to the API ready event. */
  ready(callback: (api: TApi) => void): void;
};

interface ConsentGlobals {
  /** airgap.js interface or preload stub. */
  airgap?: AirgapAPI | Partial<PreInitAirgapAPI>;
  /** Transcend consent manager interface or preload stub. */
  transcend?: TranscendAPI | Partial<PreInitTranscendAPI>;
}

/** The loaded Airgap and Transcend Consent APIs. */
export interface ConsentAPI {
  /** The airgap.js core API, once loaded. */
  airgap?: AirgapAPI;
  /** The Transcend Consent Manager UI API, once loaded. */
  transcend?: TranscendAPI;
}

export interface ConsentApiSubscriptionHandlers {
  /** Called when airgap.js is ready. */
  onAirgap(airgap: AirgapAPI): void;
  /** Called when the Transcend Consent Manager API is ready. */
  onTranscend(transcend: TranscendAPI): void;
}

function ensureReadyApi<TApi>(existing: Partial<ReadyApi<TApi>> | undefined): ReadyApi<TApi> {
  if (existing?.ready) {
    return existing as ReadyApi<TApi>;
  }

  const readyQueue = existing?.readyQueue ?? [];

  return {
    ...existing,
    readyQueue,
    ready(callback) {
      readyQueue.push(callback);
    },
  };
}

function isInitializedApi<TApi extends EventTarget>(
  api: TApi | Partial<ReadyApi<TApi>> | undefined,
): api is TApi {
  return (
    typeof (api as { addEventListener?: unknown } | undefined)?.addEventListener === 'function'
  );
}

/**
 * Subscribe to the global Airgap and Transcend ready APIs, creating documented
 * ready-queue stubs when airgap.js has not initialized yet.
 */
export function subscribeConsentApis({
  onAirgap,
  onTranscend,
}: ConsentApiSubscriptionHandlers): () => void {
  if (typeof self === 'undefined') return () => undefined;

  let cancelled = false;
  const consentGlobals = self as typeof self & ConsentGlobals;

  if (isInitializedApi<AirgapAPI>(consentGlobals.airgap)) {
    onAirgap(consentGlobals.airgap);
  } else {
    const airgapReady = ensureReadyApi<AirgapAPI>(consentGlobals.airgap);
    consentGlobals.airgap = airgapReady;
    airgapReady.ready((readyAirgap) => {
      if (!cancelled) onAirgap(readyAirgap);
    });
  }

  if (isInitializedApi<TranscendAPI>(consentGlobals.transcend)) {
    onTranscend(consentGlobals.transcend);
  } else {
    const transcendReady = ensureReadyApi<TranscendAPI>(consentGlobals.transcend);
    consentGlobals.transcend = transcendReady;
    transcendReady.ready((readyTranscend) => {
      if (!cancelled) onTranscend(readyTranscend);
    });
  }

  return () => {
    cancelled = true;
  };
}
