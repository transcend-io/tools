'use client';

import { useEffect } from 'react';

import { type ReactAirgapScriptProps, appendScriptElement } from './script-element.js';

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

        cleanup = appendScriptElement({
          scriptProps,
          src,
          text: children,
        });
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
