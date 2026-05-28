'use client';

import type { TrackingConsent, TrackingPurpose } from '@transcend-io/airgap.js-types';
import {
  type MouseEventHandler,
  type ReactElement,
  type ReactNode,
  useEffect,
  useState,
} from 'react';

import { getMissingConsentPurposesForUrls } from '../core/consent-boundary.js';
import { useConsentManager } from './use-consent-manager.js';

type ConsentBoundaryState =
  | { status: 'pending' }
  | { status: 'allowed' }
  | {
      /** Missing-consent state. */
      status: 'blocked';
      /** Purposes that must be consented before children can render. */
      missingConsentPurposes: Set<TrackingPurpose>;
    }
  | {
      /** Error state while resolving URL purposes. */
      status: 'error';
      /** Error thrown by the Airgap API. */
      error: unknown;
      /** Purposes resolved before the error, if any. */
      missingConsentPurposes: Set<TrackingPurpose>;
    };

export type ConsentBoundaryFallbackStatus = Exclude<ConsentBoundaryState['status'], 'allowed'>;

export interface ConsentBoundaryFallbackProps {
  /** Current boundary state. */
  status: ConsentBoundaryFallbackStatus;
  /** Purposes that are missing consent. */
  missingConsentPurposes: Set<TrackingPurpose>;
  /** Error thrown while checking consent, when status is `error`. */
  error?: unknown;
  /** Opt into the missing consent purposes. */
  onConsentGiven: MouseEventHandler<HTMLButtonElement>;
}

export interface ConsentBoundaryProps {
  /** Children that should only mount after consent allows the required URLs. */
  children: ReactNode;
  /** URLs that must be allowed by Airgap before children render. */
  urlsRequiredForRender: readonly string[];
  /** Fallback rendered while checking consent or when consent is missing. */
  fallback?: (props: ConsentBoundaryFallbackProps) => ReactNode;
}

function DefaultConsentBoundaryFallback({
  error,
  missingConsentPurposes,
  onConsentGiven,
  status,
}: ConsentBoundaryFallbackProps): ReactElement {
  if (status === 'pending') {
    return <p>Checking consent...</p>;
  }

  const purposeList = Array.from(missingConsentPurposes).join(', ');

  return (
    <div>
      <p>
        {error
          ? 'Unable to check consent for this content.'
          : 'This content requires additional consent to load.'}
      </p>
      {purposeList ? <p>Required purposes: {purposeList}</p> : null}
      <button type="button" onClick={onConsentGiven}>
        Opt in
      </button>
    </div>
  );
}

/**
 * Renders children only after Airgap allows the URLs required by that subtree.
 */
export function ConsentBoundary({
  children,
  fallback = DefaultConsentBoundaryFallback,
  urlsRequiredForRender,
}: ConsentBoundaryProps): ReactNode {
  const { airgap } = useConsentManager();
  const [state, setState] = useState<ConsentBoundaryState>({ status: 'pending' });

  useEffect(() => {
    let cancelled = false;

    if (!airgap) {
      setState({ status: 'pending' });
      return () => {
        cancelled = true;
      };
    }

    setState({ status: 'pending' });
    void getMissingConsentPurposesForUrls(airgap, urlsRequiredForRender).then(
      (missingConsentPurposes) => {
        if (cancelled) return;

        setState(
          missingConsentPurposes.size === 0
            ? { status: 'allowed' }
            : { status: 'blocked', missingConsentPurposes },
        );
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({
            error,
            missingConsentPurposes: new Set(),
            status: 'error',
          });
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [airgap, urlsRequiredForRender]);

  if (state.status === 'allowed') {
    return <>{children}</>;
  }

  const missingConsentPurposes =
    state.status === 'pending' ? new Set<TrackingPurpose>() : state.missingConsentPurposes;

  const onConsentGiven: MouseEventHandler<HTMLButtonElement> = async (event) => {
    if (!airgap || missingConsentPurposes.size === 0) return;

    const consent: TrackingConsent = { ...airgap.getConsent().purposes };
    for (const purpose of missingConsentPurposes) {
      consent[purpose] = true;
    }

    const consentUpdated = await airgap.setConsent(event.nativeEvent, consent);
    if (consentUpdated === false) return;

    const remainingConsentPurposes = await getMissingConsentPurposesForUrls(
      airgap,
      urlsRequiredForRender,
    );
    setState(
      remainingConsentPurposes.size === 0
        ? { status: 'allowed' }
        : {
            missingConsentPurposes: remainingConsentPurposes,
            status: 'blocked',
          },
    );
  };

  return fallback({
    error: state.status === 'error' ? state.error : undefined,
    missingConsentPurposes,
    onConsentGiven,
    status: state.status,
  });
}
