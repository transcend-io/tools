'use client';

import { useEffect } from 'react';

import type { ReactAirgapScriptProps } from './use-consent-manager.js';

export interface TrackingScriptProps extends ReactAirgapScriptProps {
  /**
   * Wait for this promise before injecting the underlying `<Script>`.
   * Use `Promise.all(...)` or `Promise.race(...)` at the call site to compose
   * multiple conditions. If the promise rejects, the script remains unloaded.
   */
  loadAfter: PromiseLike<unknown>;
  /** External script URL to inject after `loadAfter` resolves. */
  src?: string;
  /** Inline script body. */
  children?: string;
}

/**
 * Client component that injects a script element only after `loadAfter` resolves.
 *
 * @example
 * ```tsx
 * import { TrackingScript } from '@transcend-io/airgap-react';
 *
 * const analyticsReady = new Promise<void>((resolve) => {
 *   if (window.analyticsReady) {
 *     resolve();
 *     return;
 *   }
 *
 *   window.addEventListener('analytics:ready', () => resolve(), { once: true });
 * });
 *
 * <TrackingScript
 *   src="https://cdn.example.com/analytics.js"
 *   loadAfter={analyticsReady}
 * />
 * ```
 */
export function TrackingScript({
  loadAfter,
  children,
  src,
  ...scriptProps
}: TrackingScriptProps): null {
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    void Promise.resolve(loadAfter).then(
      () => {
        if (cancelled || typeof document === 'undefined') return;

        const script = document.createElement('script');
        if (src) script.src = src;
        if (children) script.text = children;
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
        cleanup = () => script.remove();
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [children, loadAfter, scriptProps, src]);

  return null;
}
