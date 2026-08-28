import {
  defineUiResource,
  viewHtml,
  type UiResourceDefinition,
} from '@transcend-io/mcp-server-base';

// Built from src/ui/cookie-triage/ by this package's `prebuild` and inlined here as a
// string by tsdown's `.html` text loader. Self-contained, because hosts render a
// view in a sandboxed iframe with no server to fetch anything from.
import COOKIE_TRIAGE_APP_HTML from '../ui/generated/cookie-triage.html';

/** URI hosts fetch to render the cookie-triage view. */
export const COOKIE_TRIAGE_APP_URI = 'ui://transcend-consent/cookie-triage';

/** Cookie triage review UI for `consent_cookie_triage_review_app`. */
export const COOKIE_TRIAGE_APP_RESOURCE: UiResourceDefinition = defineUiResource({
  uri: COOKIE_TRIAGE_APP_URI,
  name: 'Cookie triage review',
  description:
    'Interactive review of agent-researched cookie classification suggestions grouped by purpose.',
  html: viewHtml({
    bundled: COOKIE_TRIAGE_APP_HTML,
    moduleUrl: import.meta.url,
    view: 'cookie-triage',
  }),
  prefersBorder: false,
});
