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

export interface AppendScriptElementOptions {
  /** External script URL. */
  src?: string;
  /** Inline script body. */
  text?: string;
  /** Additional script attributes. */
  scriptProps?: ReactAirgapScriptProps;
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

  const scriptParent = document.head ?? document.body ?? document.documentElement;
  scriptParent.appendChild(script);

  return () => {
    script.remove();
  };
}
