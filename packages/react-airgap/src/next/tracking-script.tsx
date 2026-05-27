'use client';

/**
 * TrackingScript — a drop-in wrapper around `next/script` that defers script
 * injection until one or more triggers fire (custom events, promises, or
 * Transcend airgap consent).
 *
 * Supports both forms of `next/script`:
 *   <TrackingScript src="https://cdn.example.com/tag.js" loadAfter={...} />
 *   <TrackingScript id="gtm-init" loadAfter={...}>{`...inline JS...`}</TrackingScript>
 *
 * SSR: like `<Script strategy="afterInteractive">`, this renders nothing
 * server-side. Initial client render also returns null, so there is no
 * hydration mismatch. `strategy="beforeInteractive"` is unsupported (the
 * component will warn in development) because gating happens after hydration.
 */

import Script, { type ScriptProps } from 'next/script';
import { type ReactElement, type ReactNode, useEffect, useState } from 'react';

/* -------------------------------------------------------------------------- */
/*                                  Triggers                                  */
/* -------------------------------------------------------------------------- */

/**
 * A subscription function: receives a `load` callback, calls it when the gate
 * opens, optionally returns a cleanup. This shape handles already-fired
 * events, promises, observables, and airgap's ready queue with one API.
 */
export type LoadTrigger = (load: () => void) => void | (() => void);

export interface OnEventOptions {
  /** Event target to subscribe to. Defaults to `window` in the browser. */
  target?: EventTarget;
  /** Returns true when the trigger condition already happened before mount. */
  latch?: () => boolean;
}

interface AirgapConsentApi {
  /** Resolve consent status for the required tracking purposes. */
  isConsented(trackingPurposes: Set<string>): boolean;
  /** Subscribe to airgap changes that may affect consent resolution. */
  watch?: (callback: () => void) => void | (() => void);
}

type AirgapReadyCallback = (airgap: AirgapConsentApi) => void;

interface AirgapReadyApi {
  /** Queue of callbacks to dispatch once airgap is ready. */
  readyQueue?: AirgapReadyCallback[];
  /** Subscribe to the airgap ready event. */
  ready(callback: AirgapReadyCallback): void;
}

interface WindowWithAirgap extends Window {
  /** Transcend airgap API or preload stub. */
  airgap?: Partial<AirgapReadyApi>;
}

/**
 * Fire on a DOM event. Pass `latch` to short-circuit if the condition is
 * already true (handy for events that may have already fired before mount).
 */
export const onEvent =
  (name: string, opts?: OnEventOptions): LoadTrigger =>
  (load) => {
    const target = opts?.target ?? (typeof window !== 'undefined' ? window : null);
    if (!target) return;
    if (opts?.latch?.()) {
      load();
      return;
    }
    const handler = () => load();
    target.addEventListener(name, handler, { once: true });
    return () => target.removeEventListener(name, handler);
  };

/** Fire when a Promise resolves. */
export const onPromise =
  (promise: Promise<unknown>): LoadTrigger =>
  (load) => {
    let cancelled = false;
    void promise.then(
      () => {
        if (!cancelled) load();
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  };

/**
 * Fire when Transcend airgap.js is ready AND (optionally) the listed purposes
 * are consented. Subscribes to `airgap.watch` so the gate re-evaluates when
 * the user changes consent — e.g. opt-in later causes the script to load.
 */
export const onConsent =
  (purposes?: string[]): LoadTrigger =>
  (load) => {
    if (typeof window === 'undefined') return;
    // `airgap.ready` handles "already loaded" via its readyQueue, so this is
    // safe whether airgap has arrived yet or not.
    const w = window as WindowWithAirgap;
    if (!w.airgap?.ready) {
      // Stub the ready queue so we don't drop the callback if airgap hasn't
      // attached yet. The real airgap will drain `readyQueue` on load.
      const queue: AirgapReadyCallback[] = [];
      w.airgap = {
        ...w.airgap,
        readyQueue: queue,
        ready(callback) {
          queue.push(callback);
        },
      };
    }
    let fired = false;
    let unwatch: undefined | (() => void);
    const airgapReady = w.airgap as AirgapReadyApi;
    airgapReady.ready((airgap) => {
      const required = purposes ? new Set(purposes) : null;
      const check = () => {
        if (fired) return;
        if (!required || airgap.isConsented(required)) {
          fired = true;
          load();
          unwatch?.();
        }
      };
      check();
      if (!fired) {
        const cleanup = airgap.watch?.(check);
        if (typeof cleanup === 'function') unwatch = cleanup;
      }
    });
    return () => {
      unwatch?.();
    };
  };

/** Fire when ANY of the given triggers fires (logical OR). */
export const anyOf =
  (...triggers: LoadTrigger[]): LoadTrigger =>
  (load) => {
    let fired = false;
    const fireOnce = () => {
      if (!fired) {
        fired = true;
        load();
      }
    };
    const cleanups = triggers.map((t) => t(fireOnce));
    return () => cleanups.forEach((c) => typeof c === 'function' && c());
  };

/** Fire only when ALL of the given triggers have fired (logical AND). */
export const allOf =
  (...triggers: LoadTrigger[]): LoadTrigger =>
  (load) => {
    if (triggers.length === 0) {
      load();
      return;
    }
    const fired = new Set<number>();
    const cleanups = triggers.map((trigger, index) =>
      trigger(() => {
        if (fired.has(index)) return;
        fired.add(index);
        if (fired.size === triggers.length) load();
      }),
    );
    return () => cleanups.forEach((c) => typeof c === 'function' && c());
  };

/* -------------------------------------------------------------------------- */
/*                                 Component                                  */
/* -------------------------------------------------------------------------- */

export interface TrackingScriptProps extends ScriptProps {
  /**
   * Wait for these triggers before injecting the underlying `<Script>`.
   * - Single trigger: fire when it opens.
   * - Array: fires when ALL open (logical AND). Use `anyOf(...)` for OR.
   */
  loadAfter: LoadTrigger | LoadTrigger[];
  /** Called once if the gate later closes (e.g. user revokes consent). */
  onUnload?: () => void;
  /** Inline script body (for `<TrackingScript id="...">{`...`}</TrackingScript>`). */
  children?: ReactNode;
}

export default function TrackingScript({
  loadAfter,
  onUnload,
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
    const triggers = Array.isArray(loadAfter) ? loadAfter : [loadAfter];
    let cancelled = false;
    const fired = new Set<number>();
    if (triggers.length === 0) {
      setOpen(true);
      return;
    }
    const cleanups = triggers.map((trigger, index) =>
      trigger(() => {
        if (cancelled || fired.has(index)) return;
        fired.add(index);
        if (fired.size === triggers.length) setOpen(true);
      }),
    );
    return () => {
      cancelled = true;
      cleanups.forEach((c) => typeof c === 'function' && c());
    };
    // `loadAfter` should be referentially stable. Memoize triggers at the
    // call site if they depend on changing values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fire onUnload if the component unmounts after the script was injected.
  useEffect(() => {
    return () => {
      if (open) onUnload?.();
    };
  }, [open, onUnload]);

  if (!open) return null;

  // Support both external (`src`) and inline (`children`) forms.
  return <Script {...scriptProps}>{children}</Script>;
}

/* -------------------------------------------------------------------------- */
/*                                  Examples                                  */
/* -------------------------------------------------------------------------- */

/*
import TrackingScript, { onEvent, onConsent, onPromise, anyOf, allOf } from './tracking-script';

// 1. External script gated on a custom event
<TrackingScript
  src="https://example.com/heavy.js"
  strategy="lazyOnload"
  loadAfter={onEvent('app:bootstrapped')}
/>

// 2. External script gated on airgap + Analytics consent
<TrackingScript
  src="https://cdn.intake-lr.com/logger-1.min.js"
  strategy="afterInteractive"
  loadAfter={onConsent(['Analytics'])}
/>

// 3. Inline GTM bootstrap gated on consent (note: requires `id`)
<TrackingScript
  id="gtm-init"
  strategy="afterInteractive"
  loadAfter={onConsent(['Analytics', 'Advertising'])}
>{`
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
  var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;
  j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-XXXX');
`}</TrackingScript>

// 4. Compound: consent AND (custom event OR 5s timeout)
<TrackingScript
  src="https://s.go-mpulse.net/boomerang/3C8QM-..."
  loadAfter={allOf(
    onConsent(['Analytics']),
    anyOf(
      onEvent('route:settled'),
      onPromise(new Promise((r) => setTimeout(r, 5000))),
    ),
  )}
/>
*/
