import type { ScriptHTMLAttributes } from 'react';

/**
 * Props forwarded onto the injected `<script>` element.
 *
 * Mirrors the transparent passthrough of `next/script`: this extends the
 * standard `ScriptHTMLAttributes`, so any valid `<script>` attribute
 * (`type`, `fetchPriority`, `blocking`, `data-*`, `className`, ...) is set on
 * the element without needing to be enumerated here. `src` and `children` are
 * owned by `<TrackingScript>` and declared there instead.
 *
 * `onLoad`/`onError` are re-typed to receive the native DOM `Event`, because
 * the script is injected imperatively rather than rendered by React. There is
 * intentionally no `onReady`: it is a `next/script`-specific concept with no
 * DOM analog (here a remount re-injects the element and re-fires `load`).
 */
export interface ReactAirgapScriptProps extends Omit<
  ScriptHTMLAttributes<HTMLScriptElement>,
  'src' | 'children' | 'onLoad' | 'onError' | 'dangerouslySetInnerHTML'
> {
  /** Called after the injected script's `load` event fires. */
  onLoad?: (event: Event) => void;
  /** Called if the injected script fails to load. */
  onError?: (event: Event) => void;
  /**
   * Convenience for setting `data-*` attributes. Merged with any `data-*`
   * attributes passed directly as props.
   */
  dataset?: Record<string, string>;
}

export interface AppendScriptElementOptions {
  /** External script URL. */
  src?: string;
  /** Inline script body. */
  text?: string;
  /** Additional script attributes. */
  scriptProps?: ReactAirgapScriptProps;
}

/** React prop names that map to a differently-named DOM attribute. */
const DOM_ATTRIBUTE_NAME_OVERRIDES: Record<string, string> = {
  acceptCharset: 'accept-charset',
  className: 'class',
  htmlFor: 'for',
  httpEquiv: 'http-equiv',
};

/**
 * Props handled explicitly by {@link appendScriptElement} (as DOM properties,
 * dedicated event listeners, or by the caller) and therefore skipped by the
 * generic attribute applier.
 */
const EXPLICITLY_HANDLED_PROPS = new Set([
  'async',
  'defer',
  'nonce',
  'dataset',
  'onLoad',
  'onError',
  'src',
  'children',
  'dangerouslySetInnerHTML',
]);

/**
 * Forward the passthrough props onto a freshly created script element,
 * mirroring how `next/script` reflects `ScriptHTMLAttributes` onto the DOM
 * node. Explicitly-handled props (see {@link EXPLICITLY_HANDLED_PROPS}) are
 * skipped; everything else is set as a string attribute, and any remaining
 * `on*` function is attached as a native event listener.
 */
function applyPassthroughAttributes(
  script: HTMLScriptElement,
  scriptProps: ReactAirgapScriptProps,
): void {
  for (const [key, value] of Object.entries(scriptProps)) {
    if (value === undefined || value === null || EXPLICITLY_HANDLED_PROPS.has(key)) {
      continue;
    }

    // Forward arbitrary event handlers (e.g. `onAbort`) as native listeners.
    if (key.startsWith('on') && typeof value === 'function') {
      script.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
      continue;
    }

    // Skip values we cannot reflect onto a string attribute (e.g. a `style`
    // object or an aria object).
    if (typeof value === 'object') continue;

    const attributeName = DOM_ATTRIBUTE_NAME_OVERRIDES[key] ?? key.toLowerCase();

    if (typeof value === 'boolean') {
      if (value) script.setAttribute(attributeName, '');
      continue;
    }

    script.setAttribute(attributeName, String(value));
  }
}

export function appendScriptElement({
  scriptProps = {},
  src,
  text,
}: AppendScriptElementOptions): () => void {
  if (typeof document === 'undefined' || (!src && !text)) return () => undefined;

  const script = document.createElement('script');
  if (src) script.src = src;
  if (text) script.text = text;

  // Async + defer default to true so gated trackers never block rendering.
  script.async = scriptProps.async ?? true;
  script.defer = scriptProps.defer ?? true;

  // `nonce` must be set via the property; the content attribute is cleared by
  // the browser after parsing for CSP reasons.
  if (scriptProps.nonce) script.nonce = scriptProps.nonce;

  if (scriptProps.onLoad) {
    script.addEventListener('load', scriptProps.onLoad, { once: true });
  }
  if (scriptProps.onError) {
    script.addEventListener('error', scriptProps.onError, { once: true });
  }

  applyPassthroughAttributes(script, scriptProps);

  for (const [key, value] of Object.entries(scriptProps.dataset ?? {})) {
    script.dataset[key] = value;
  }

  const scriptParent = document.head ?? document.body ?? document.documentElement;
  scriptParent.appendChild(script);

  return () => {
    script.remove();
  };
}
