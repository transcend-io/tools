'use client';

import type { AirgapAPI, TranscendAPI } from '@transcend-io/airgap.js-types';
import {
  type Context,
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

import { type ConsentAPI, subscribeConsentApis } from '../core/consent-manager.js';

export interface ConsentProviderProps {
  /** Child tree that can consume the consent APIs. */
  children: ReactNode;
  /** airgap.js script URL from Transcend's developer settings. */
  airgapSrc: string;
  /** Additional attributes for the injected airgap.js script element. */
  scriptProps?: ReactAirgapScriptProps;
}

export interface ReactAirgapScriptProps {
  /** Script element ID. */
  id?: string;
  /** Whether to load the script asynchronously. Defaults to true. */
  async?: boolean;
  /** Whether to defer script execution. Defaults to true. */
  defer?: boolean;
  /** Script nonce for CSP. */
  nonce?: string;
  /** Subresource integrity metadata. */
  integrity?: string;
  /** CORS setting for the script request. */
  crossOrigin?: HTMLScriptElement['crossOrigin'];
  /** Referrer policy for the script request. */
  referrerPolicy?: HTMLScriptElement['referrerPolicy'];
  /** Additional data attributes to set on the script element. */
  dataset?: Record<string, string>;
}

/** React context backing `useConsentManager()`. */
export const ConsentContext: Context<ConsentAPI> = createContext<ConsentAPI>({});

function appendAirgapScript(src: string, scriptProps: ReactAirgapScriptProps = {}): () => void {
  if (typeof document === 'undefined') return () => undefined;

  const script = document.createElement('script');
  script.src = src;
  script.async = scriptProps.async ?? true;
  script.defer = scriptProps.defer ?? true;

  if (scriptProps.id) script.id = scriptProps.id;
  if (scriptProps.nonce) script.nonce = scriptProps.nonce;
  if (scriptProps.integrity) script.integrity = scriptProps.integrity;
  if (scriptProps.crossOrigin) script.crossOrigin = scriptProps.crossOrigin;
  if (scriptProps.referrerPolicy) script.referrerPolicy = scriptProps.referrerPolicy;

  for (const [key, value] of Object.entries(scriptProps.dataset ?? {})) {
    script.dataset[key] = value;
  }

  document.documentElement.appendChild(script);

  return () => {
    script.remove();
  };
}

/**
 * Provides loaded `airgap` and `transcend` APIs to React children while loading
 * airgap.js through a DOM script element.
 */
export function ConsentProvider({
  airgapSrc,
  children,
  scriptProps,
}: ConsentProviderProps): ReactElement {
  const [airgap, setAirgap] = useState<AirgapAPI | undefined>();
  const [transcend, setTranscend] = useState<TranscendAPI | undefined>();

  useEffect(() => {
    return subscribeConsentApis({
      onAirgap: setAirgap,
      onTranscend: setTranscend,
    });
  }, []);

  useEffect(() => appendAirgapScript(airgapSrc, scriptProps), [airgapSrc, scriptProps]);

  return (
    <ConsentContext.Provider value={{ airgap, transcend }}>{children}</ConsentContext.Provider>
  );
}

/**
 * Access the Airgap and Transcend Consent APIs loaded by `ConsentProvider`.
 */
export function useConsentManager(): ConsentAPI {
  return useContext(ConsentContext);
}
