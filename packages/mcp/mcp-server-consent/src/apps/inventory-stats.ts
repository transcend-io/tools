import {
  defineUiResource,
  viewHtml,
  type UiResourceDefinition,
} from '@transcend-io/mcp-server-base';

// Built from src/ui/inventory-stats/ by this package's `prebuild` and inlined here as a
// string by tsdown's `.html` text loader. Self-contained, because hosts render a
// view in a sandboxed iframe with no server to fetch anything from.
import INVENTORY_STATS_APP_HTML from '../ui/generated/inventory-stats.html';

/** URI hosts fetch to render the inventory-stats view. */
export const INVENTORY_STATS_APP_URI = 'ui://transcend-consent/inventory-stats';

/** Cookie and data-flow triage dashboard for `consent_get_inventory_stats`. */
export const INVENTORY_STATS_APP_RESOURCE: UiResourceDefinition = defineUiResource({
  uri: INVENTORY_STATS_APP_URI,
  name: 'Consent inventory triage stats',
  description: 'Interactive dashboard of cookie and data-flow live, needs-review, and junk counts.',
  // Reads from disk instead when TRANSCEND_MCP_DEV_VIEWS is set, so `pnpm mcp:inspect`
  // picks up a view rebuild without restarting the server.
  html: viewHtml({
    bundled: INVENTORY_STATS_APP_HTML,
    moduleUrl: import.meta.url,
    view: 'inventory-stats',
  }),
  prefersBorder: false,
});
