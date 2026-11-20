/** MCP initialize instructions for the unified @transcend-io/mcp server. */
export const UMBRELLA_DOCS_SERVER_INSTRUCTIONS =
  'For how-to, product concepts, setup guides, or "what is X" questions about Transcend ' +
  '(e.g. airgap, consent, DSR): (1) call docs_list with the most distinctive terms for the ' +
  'topic (full-text over titles and article bodies), (2) call docs_fetch on the best matching URL, ' +
  '(3) answer from that content. Rows from docs_list have an access field. A signedIn page ' +
  'returns only a preview from docs_fetch unless the caller is signed in; the preview text ' +
  'says how to sign in, so pass that on instead of guessing the article. ' +
  'API tools return data from the signed-in organization; they do not replace product ' +
  'documentation.';
