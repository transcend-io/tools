'use client';

import type { AirgapAPI, PreInitTranscendAPI, TranscendAPI } from '@transcend-io/airgap.js-types';
import Script, { type ScriptProps } from 'next/script';
import {
  type Context,
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

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

export interface ConsentProviderProps {
  /** Child tree that can consume the consent APIs. */
  children: ReactNode;
  /** airgap.js script URL from Transcend's developer settings. */
  airgapSrc: string;
  /** Additional props forwarded to `next/script`. */
  scriptProps?: Omit<ScriptProps, 'children' | 'src'>;
}

/** React context backing `useConsentManager()`. */
export const ConsentContext: Context<ConsentAPI> = createContext<ConsentAPI>({});

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
 * Provides loaded `airgap` and `transcend` APIs to React children while loading
 * airgap.js through `next/script`.
 */
export function ConsentProvider({
  airgapSrc,
  children,
  scriptProps,
}: ConsentProviderProps): ReactElement {
  const [airgap, setAirgap] = useState<AirgapAPI | undefined>();
  const [transcend, setTranscend] = useState<TranscendAPI | undefined>();

  useEffect(() => {
    if (typeof self === 'undefined') return;

    let cancelled = false;
    const consentGlobals = self as typeof self & ConsentGlobals;

    if (isInitializedApi<AirgapAPI>(consentGlobals.airgap)) {
      setAirgap(consentGlobals.airgap);
    } else {
      const airgapReady = ensureReadyApi<AirgapAPI>(consentGlobals.airgap);
      consentGlobals.airgap = airgapReady;
      airgapReady.ready((readyAirgap) => {
        if (!cancelled) setAirgap(readyAirgap);
      });
    }

    if (isInitializedApi<TranscendAPI>(consentGlobals.transcend)) {
      setTranscend(consentGlobals.transcend);
    } else {
      const transcendReady = ensureReadyApi<TranscendAPI>(consentGlobals.transcend);
      consentGlobals.transcend = transcendReady;
      transcendReady.ready((readyTranscend) => {
        if (!cancelled) setTranscend(readyTranscend);
      });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Script src={airgapSrc} {...scriptProps} />
      <ConsentContext.Provider value={{ airgap, transcend }}>{children}</ConsentContext.Provider>
    </>
  );
}

/**
 * Access the Airgap and Transcend Consent APIs loaded by `ConsentProvider`.
 */
export function useConsentManager(): ConsentAPI {
  return useContext(ConsentContext);
}
