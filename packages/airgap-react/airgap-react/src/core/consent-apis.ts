import type { AirgapAPI, PreInitTranscendAPI, TranscendAPI } from '@transcend-io/airgap.js-types';

import { type ReadyApi, isInitializedReadyApi, observeReadyApi } from './ready-api.js';

type PreInitAirgapAPI = ReadyApi<AirgapAPI>;

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

export function getInitializedConsentApis(): ConsentAPI {
  if (typeof self === 'undefined') return {};

  const consentGlobals = self as typeof self & ConsentGlobals;

  return {
    airgap: isInitializedReadyApi<AirgapAPI>(consentGlobals.airgap)
      ? consentGlobals.airgap
      : undefined,
    transcend: isInitializedReadyApi<TranscendAPI>(consentGlobals.transcend)
      ? consentGlobals.transcend
      : undefined,
  };
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

  const cleanupAirgap = observeReadyApi({
    api: consentGlobals.airgap,
    onReady(airgap) {
      if (!cancelled) onAirgap(airgap);
    },
    setApi(airgap) {
      consentGlobals.airgap = airgap;
    },
  });
  const cleanupTranscend = observeReadyApi({
    api: consentGlobals.transcend,
    onReady(transcend) {
      if (!cancelled) onTranscend(transcend);
    },
    setApi(transcend) {
      consentGlobals.transcend = transcend;
    },
  });

  return () => {
    cancelled = true;
    cleanupAirgap();
    cleanupTranscend();
  };
}
