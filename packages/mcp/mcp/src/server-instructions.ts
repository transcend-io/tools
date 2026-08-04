/**
 * MCP initialize instructions for the unified @transcend-io/mcp server.
 *
 * These reach the model on every session, which makes them the only reliable
 * place to route a request to the right tool before the model commits to an
 * approach. The dashboard rule is here because without it models answer a
 * "show me a dashboard" request by writing their own HTML or matplotlib
 * artifact — minutes of work, off-brand, and not interactive — while ui_render
 * produces the same thing from the design system in about a second.
 */
export const UMBRELLA_DOCS_SERVER_INSTRUCTIONS =
  'For how-to, product concepts, setup guides, or "what is X" questions about Transcend ' +
  '(e.g. airgap, consent, DSR): (1) call docs_list with a keyword, ' +
  '(2) call docs_fetch on the best matching URL, (3) answer from that content. ' +
  'API tools return data from the signed-in organization; they do not replace product documentation. ' +
  'For any request to visualize Transcend data — a dashboard, overview, summary, breakdown, ' +
  'or report: (1) call ui_guide with topic "dashboards", (2) fetch the data with the tools it ' +
  'names, (3) call ui_render with a spec. Never hand-build the visual in HTML, React, Python, ' +
  'or a markdown table; ui_render is the only supported way to show one.';
