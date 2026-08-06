import {
  defineUiResource,
  viewHtml,
  type UiResourceDefinition,
} from '@transcend-io/mcp-server-base';

// Built from src/ui/cookie-triage/ by this package's `prebuild` and inlined here as a
// string by tsdown's `.html` text loader. The document is fully self-contained
// because hosts render views in a sandboxed iframe with no same-origin server to
// fetch anything from.
import COOKIE_TRIAGE_APP_HTML from '../ui/generated/cookie-triage.html';

/** URI hosts fetch to render the cookie-triage view. */
export const COOKIE_TRIAGE_APP_URI = 'ui://transcend-consent/cookie-triage';

/** Interactive cookie / data-flow triage review card. */
export const COOKIE_TRIAGE_APP_RESOURCE: UiResourceDefinition = defineUiResource({
  uri: COOKIE_TRIAGE_APP_URI,
  name: 'Transcend Cookie triage',
  description:
    'Interactive review card for classifying cookies and data flows — purpose, service, ' +
    'suggested action, and approve / junk (including bulk siblings).',
  // Reads from disk instead when TRANSCEND_MCP_DEV_VIEWS is set, so `pnpm mcp:inspect`
  // picks up a view rebuild without restarting the server.
  html: viewHtml({
    bundled: COOKIE_TRIAGE_APP_HTML,
    moduleUrl: import.meta.url,
    view: 'cookie-triage',
  }),
  prefersBorder: false,
});
