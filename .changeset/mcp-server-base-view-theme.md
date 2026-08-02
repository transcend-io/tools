---
'@transcend-io/mcp-server-base': minor
---

Publish `@transcend-io/mcp-server-base/ui/theme.css`, the Tailwind theme MCP App views are styled with.

Stock Tailwind is deliberately absent — the default theme is never imported, so `bg-red-500` does not exist and every utility resolves to a host value, a Transcend design token, or a literal fallback. Surfaces, typography, radii, and shadows follow the style variables the host sends at handshake time, so a view looks native in light or dark Claude; brand and status colors come from `@transcend-io/design-tokens` so it still reads as ours; spacing stays on Tailwind's scale, which the MCP Apps spec omits on purpose because layouts break when it shifts underneath them.

The theme also replaces Tailwind's Preflight, because a view lives in an iframe the host measures: the body has to stay transparent and nothing may trap content in its own scroller. `tailwindcss` and `@transcend-io/design-tokens` are optional peer dependencies, so packages that ship no view install nothing new.
