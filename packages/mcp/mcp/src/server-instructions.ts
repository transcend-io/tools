import { graphqlMutateToolsEnabled, graphqlReadToolsEnabled } from '@transcend-io/mcp-server-base';

const DOCS_INSTRUCTIONS =
  'For how-to, product concepts, setup guides, or "what is X" questions about Transcend ' +
  '(e.g. airgap, consent, DSR): (1) call docs_list with the most distinctive terms for the ' +
  'topic (full-text over titles and article bodies), (2) call docs_fetch on the best matching URL, ' +
  '(3) answer from that content. API tools return data from the signed-in organization; ' +
  'they do not replace product documentation. For transcend.yml push previews, call config_diff and ' +
  'paste its diff before config_push.';

function graphqlFallbackInstructions(): string {
  if (!graphqlReadToolsEnabled()) {
    return '';
  }
  let sentence = ' When no tool covers a task, use graphql_inspect_schema, graphql_query';
  if (graphqlMutateToolsEnabled()) {
    sentence += ', and change data with graphql_mutate';
  }
  sentence += '. Prefer dedicated tools when one exists.';
  return sentence;
}

/** MCP initialize instructions for the unified @transcend-io/mcp server. */
export function buildUmbrellaServerInstructions(): string {
  return DOCS_INSTRUCTIONS + graphqlFallbackInstructions();
}

/** @deprecated Use {@link buildUmbrellaServerInstructions}. Kept for tests that expect a string export. */
export const UMBRELLA_DOCS_SERVER_INSTRUCTIONS = buildUmbrellaServerInstructions();
