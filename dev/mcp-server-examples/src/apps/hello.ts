import {
  defineUiResource,
  viewHtml,
  type UiResourceDefinition,
} from '@transcend-io/mcp-server-base';

// Built from src/ui/hello/ by `prebuild`, then inlined as a string by tsdown's
// `.html` text loader. Self-contained down to React and the tokens, because hosts
// render views in a sandboxed iframe with nothing to fetch from.
import HELLO_APP_HTML from '../ui/generated/hello.html';

/** URI hosts fetch to render the hello-world view. */
export const HELLO_APP_URI = 'ui://transcend-examples/hello';

/** Hello-world view proving the MCP Apps render path end to end. */
export const HELLO_APP_RESOURCE: UiResourceDefinition = defineUiResource({
  uri: HELLO_APP_URI,
  name: 'Transcend MCP App hello world',
  description:
    'Minimal interactive view that confirms a host can fetch, sandbox, and render a ui:// resource.',
  // Reads from disk instead when TRANSCEND_MCP_DEV_VIEWS is set, so a rebuild needs
  // no restart.
  html: viewHtml({
    bundled: HELLO_APP_HTML,
    moduleUrl: import.meta.url,
    view: 'hello',
  }),
  prefersBorder: false,
});
