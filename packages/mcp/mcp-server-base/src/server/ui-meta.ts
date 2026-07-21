/** Legacy flat key still expected by some MCP Apps hosts. */
export const UI_RESOURCE_URI_META_KEY = 'ui/resourceUri';

/** MIME type for MCP App HTML resources. */
export const MCP_APP_RESOURCE_MIME_TYPE = 'text/html;profile=mcp-app';

/**
 * Normalize tool `_meta` so both `_meta.ui.resourceUri` and the legacy
 * `_meta["ui/resourceUri"]` key are present when either is set.
 */
export function normalizeUiToolMeta(
  meta: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!meta) return undefined;

  const ui = meta.ui as { resourceUri?: string } | undefined;
  const legacyUri = meta[UI_RESOURCE_URI_META_KEY] as string | undefined;

  if (ui?.resourceUri && !legacyUri) {
    return { ...meta, [UI_RESOURCE_URI_META_KEY]: ui.resourceUri };
  }
  if (legacyUri && !ui?.resourceUri) {
    return { ...meta, ui: { ...ui, resourceUri: legacyUri } };
  }
  return meta;
}
