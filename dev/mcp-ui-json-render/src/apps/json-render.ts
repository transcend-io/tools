import {
  defineUiResource,
  viewHtml,
  type UiResourceDefinition,
} from '@transcend-io/mcp-server-base';

// Built from src/ui/json-render/ by this package's `prebuild` and inlined here as a
// string by tsdown's `.html` text loader. The document is fully self-contained
// because hosts render views in a sandboxed iframe with no same-origin server to
// fetch anything from.
import RENDER_UI_APP_HTML from '../ui/generated/json-render.html';

/** URI hosts fetch to render the json-render view. */
export const RENDER_UI_APP_URI = 'ui://transcend-ui/json-render';

/** Generic json-render host view bound to the `ui_render` tool. */
export const RENDER_UI_APP_RESOURCE: UiResourceDefinition = defineUiResource({
  uri: RENDER_UI_APP_URI,
  name: 'Transcend json-render dashboard',
  description:
    'Renders an agent-authored json-render spec with Heading, MetricCard, ProgressBar, and Grid.',
  // Reads from disk instead when TRANSCEND_MCP_DEV_VIEWS is set, so `pnpm mcp:inspect`
  // picks up a view rebuild without restarting the server.
  html: viewHtml({
    bundled: RENDER_UI_APP_HTML,
    moduleUrl: import.meta.url,
    view: 'json-render',
  }),
  prefersBorder: false,
});
