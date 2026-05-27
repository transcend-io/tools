'use client';

import Script, { type ScriptProps } from 'next/script';
import { type ReactElement, type ReactNode, useEffect, useState } from 'react';

/**
 * Promise that opens the script gate when it resolves.
 *
 * Use normal promise composition at the call site:
 * - `Promise.all([...])` when every condition must finish.
 * - `Promise.race([...])` when any condition can open the gate.
 */
export type LoadAfter = PromiseLike<unknown>;

/** Resolve the promise that controls when the script is injected. */
export function waitForLoadAfter(loadAfter: LoadAfter): Promise<unknown> {
  return Promise.resolve(loadAfter);
}

export interface TrackingScriptProps extends ScriptProps {
  /**
   * Wait for this promise before injecting the underlying `<Script>`.
   * Use `Promise.all(...)` or `Promise.race(...)` at the call site to compose
   * multiple conditions. If the promise rejects, the script remains unloaded.
   */
  loadAfter: LoadAfter;
  /** Inline script body (for `<TrackingScript id="...">{`...`}</TrackingScript>`). */
  children?: ReactNode;
}

/**
 * Client component that renders `next/script` only after `loadAfter` resolves.
 *
 * Like `strategy="afterInteractive"`, this renders nothing on the server and
 * initially renders nothing on the client. `strategy="beforeInteractive"` is
 * unsupported because the script is gated after hydration.
 *
 * @example
 * ```tsx
 * const airgapSyncPromise = new Promise((resolve) => {
 *   self.airgap.ready((airgap) => {
 *     airgap.addEventListener('sync', resolve, { once: true });
 *   });
 * });
 *
 * <TrackingScript
 *   src="https://cdn.example.com/analytics.js"
 *   strategy="afterInteractive"
 *   loadAfter={Promise.all([analyticsConsentPromise, airgapSyncPromise])}
 * />
 * ```
 */
export default function TrackingScript({
  loadAfter,
  children,
  ...scriptProps
}: TrackingScriptProps): ReactElement | null {
  const [open, setOpen] = useState(false);

  // Dev-only guard: `beforeInteractive` requires the script to be SSR'd, which
  // this wrapper deliberately prevents. Warn loudly rather than silently
  // degrade.
  if (process.env.NODE_ENV !== 'production' && scriptProps.strategy === 'beforeInteractive') {
    // eslint-disable-next-line no-console
    console.warn(
      '[TrackingScript] strategy="beforeInteractive" is not supported — the script is gated client-side and cannot appear in SSR HTML. Use "afterInteractive" or "lazyOnload".',
    );
  }

  useEffect(() => {
    let cancelled = false;
    void waitForLoadAfter(loadAfter).then(
      () => {
        if (!cancelled) setOpen(true);
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [loadAfter]);

  if (!open) return null;

  // Support both external (`src`) and inline (`children`) forms.
  return <Script {...scriptProps}>{children}</Script>;
}
