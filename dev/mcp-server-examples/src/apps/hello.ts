import { defineUiResource, type UiResourceDefinition } from '@transcend-io/mcp-server-base';

// Built from src/ui/hello/ by this package's `prebuild` and inlined here as a
// string by tsdown's `.html` text loader. The document is fully self-contained —
// React, the view's CSS, and the design tokens are all inlined — because hosts
// render views in a sandboxed iframe with no same-origin server to fetch
// anything from.
import HELLO_APP_HTML from '../ui/generated/hello.html';

/** URI hosts fetch to render the hello-world view. */
export const HELLO_APP_URI = 'ui://transcend-examples/hello';

/** Hello-world view proving the MCP Apps render path end to end. */
export const HELLO_APP_RESOURCE: UiResourceDefinition = defineUiResource({
  uri: HELLO_APP_URI,
  name: 'Transcend MCP App hello world',
  description:
    'Minimal interactive view that confirms a host can fetch, sandbox, and render a ui:// resource.',
  html: HELLO_APP_HTML,
  prefersBorder: false,
});
