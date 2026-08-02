import { MCP_APP_MIME_TYPE, MCP_UI_EXTENSION_ID } from '../capabilities/types.js';

// Declared with the capability layer, which reads them during the handshake, and
// surfaced here too because callers reaching for them usually think of them as
// part of the view surface.
export { MCP_APP_MIME_TYPE, MCP_UI_EXTENSION_ID };

/** URI scheme reserved by the MCP Apps spec for UI resources. */
export const UI_URI_SCHEME = 'ui://';

/**
 * Content Security Policy origins a UI needs. Omitting a field means "none",
 * which is the secure default the host applies.
 */
export interface UiResourceCsp {
  /** Origins for network requests, mapped to CSP `connect-src` */
  connectDomains?: readonly string[];
  /** Origins for scripts, styles, images, fonts, and media */
  resourceDomains?: readonly string[];
  /** Origins for nested iframes, mapped to CSP `frame-src` */
  frameDomains?: readonly string[];
  /** Allowed document base URIs, mapped to CSP `base-uri` */
  baseUriDomains?: readonly string[];
}

/**
 * Browser capabilities a UI requests. The wire format uses empty objects as
 * presence flags; booleans are friendlier to author, so
 * {@link buildUiResourceMeta} converts them.
 *
 * A UI must not assume a permission was granted — hosts may decline any of
 * these, so feature-detect before use.
 */
export interface UiResourcePermissions {
  /** Request camera access */
  camera?: boolean;
  /** Request microphone access */
  microphone?: boolean;
  /** Request geolocation access */
  geolocation?: boolean;
  /** Request clipboard write access */
  clipboardWrite?: boolean;
}

export interface UiResourceDefinition {
  /** Resource URI; must use the `ui://` scheme */
  uri: string;
  /** Human-readable name shown when hosts enumerate resources */
  name: string;
  /** What the view does and when a host should render it */
  description?: string;
  /**
   * The view's HTML, either a literal document or a factory invoked on each
   * `resources/read`. Use the factory form when the markup depends on state
   * that is not known at construction time.
   */
  html: string | (() => Promise<string>);
  /** External origins the view needs; omitted means no external access */
  csp?: UiResourceCsp;
  /** Browser capabilities the view requests */
  permissions?: UiResourcePermissions;
  /**
   * Dedicated sandbox origin for the view. Useful when a view needs a stable
   * origin for OAuth callbacks or API key allowlists.
   */
  domain?: string;
  /** Whether the host should draw a visible border; omitted lets the host decide */
  prefersBorder?: boolean;
}

/**
 * Serializes the host-facing `_meta.ui` object for a resource, converting our
 * boolean permission flags into the spec's empty-object presence markers and
 * dropping empty sections so the payload stays minimal.
 */
export function buildUiResourceMeta(
  /** Resource whose rendering and security preferences should be serialized */
  resource: UiResourceDefinition,
): Record<string, unknown> | undefined {
  const permissionEntries = Object.entries({
    camera: resource.permissions?.camera,
    microphone: resource.permissions?.microphone,
    geolocation: resource.permissions?.geolocation,
    clipboardWrite: resource.permissions?.clipboardWrite,
  }).filter(([, enabled]) => enabled === true);

  const ui: Record<string, unknown> = {};
  if (resource.csp && Object.keys(resource.csp).length > 0) {
    ui.csp = resource.csp;
  }
  if (permissionEntries.length > 0) {
    ui.permissions = Object.fromEntries(permissionEntries.map(([name]) => [name, {}]));
  }
  if (resource.domain !== undefined) {
    ui.domain = resource.domain;
  }
  if (resource.prefersBorder !== undefined) {
    ui.prefersBorder = resource.prefersBorder;
  }

  return Object.keys(ui).length > 0 ? { ui } : undefined;
}

/** Resolves a resource's HTML, invoking the factory form when present. */
export async function readUiResourceHtml(
  /** Resource whose markup should be produced */
  resource: UiResourceDefinition,
): Promise<string> {
  return typeof resource.html === 'string' ? resource.html : await resource.html();
}

/**
 * Validating factory for MCP App UI resources.
 *
 * Mirrors {@link defineTool}'s fail-loud-at-construction stance: a malformed
 * URI or a fragment that is not a full HTML document renders as a blank iframe
 * with no error anywhere, which is painful to diagnose in a host. Throwing here
 * surfaces the mistake during local dev and CI instead.
 */
export function defineUiResource(config: UiResourceDefinition): UiResourceDefinition {
  if (!config.uri.startsWith(UI_URI_SCHEME)) {
    throw new Error(
      `UI resource "${config.name}" has uri "${config.uri}", which does not use the ` +
        `${UI_URI_SCHEME} scheme. MCP Apps requires it so hosts can tell UI resources ` +
        'apart from ordinary ones.',
    );
  }
  if (config.uri === UI_URI_SCHEME) {
    throw new Error(
      `UI resource "${config.name}" has an empty path after ${UI_URI_SCHEME}. Use ` +
        'something like ui://my-server/my-view so the URI identifies the view.',
    );
  }
  if (config.name.trim() === '') {
    throw new Error(`UI resource "${config.uri}" needs a non-empty name.`);
  }
  if (typeof config.html === 'string') {
    assertHtmlDocument(config.uri, config.html);
  }
  return config;
}

/**
 * Rejects markup a host would render as a blank panel.
 *
 * Exported for the dev view loader, which reads documents from disk after
 * construction and so cannot rely on {@link defineUiResource} having checked them.
 */
export function assertHtmlDocument(uri: string, html: string): void {
  if (html.trim() === '') {
    throw new Error(`UI resource "${uri}" has empty HTML; hosts would render a blank iframe.`);
  }
  if (!/^\s*<!doctype html/i.test(html)) {
    throw new Error(
      `UI resource "${uri}" must be a complete HTML5 document starting with ` +
        '<!DOCTYPE html>. Hosts render the content as a standalone document, so an ' +
        'HTML fragment will not display reliably.',
    );
  }
}
