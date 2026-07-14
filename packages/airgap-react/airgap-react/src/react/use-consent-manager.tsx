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

import {
  type ConsentAPI,
  getInitializedConsentApis,
  subscribeConsentApis,
} from '../core/consent-apis.js';
import { type ReactAirgapScriptProps, appendScriptElement } from './script-element.js';

export interface ConsentProviderProps {
  /** Child tree that can consume the consent APIs. */
  children: ReactNode;
  /** airgap.js script URL from Transcend's developer settings. */
  airgapSrc?: string;
  /** Additional attributes for the injected airgap.js script element. */
  scriptProps?: ReactAirgapScriptProps;
}

/** React context backing `useConsentManager()`. */
const ConsentContext: Context<ConsentAPI | undefined> = createContext<ConsentAPI | undefined>(
  undefined,
);

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

  useEffect(() => appendScriptElement({ scriptProps, src: airgapSrc }), [airgapSrc, scriptProps]);

  return (
    <ConsentContext.Provider value={{ airgap, transcend }}>{children}</ConsentContext.Provider>
  );
}

/**
 * Access the Airgap and Transcend Consent APIs loaded by `ConsentProvider`.
 */
export function useConsentManager(): ConsentAPI {
  const consentContext = useContext(ConsentContext);
  const [observedConsentApis, setObservedConsentApis] =
    useState<ConsentAPI>(getInitializedConsentApis);

  useEffect(() => {
    if (consentContext) return;

    return subscribeConsentApis({
      onAirgap(airgap) {
        setObservedConsentApis((current) => ({ ...current, airgap }));
      },
      onTranscend(transcend) {
        setObservedConsentApis((current) => ({ ...current, transcend }));
      },
    });
  }, [consentContext]);

  return consentContext ?? observedConsentApis;
}
