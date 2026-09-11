/** MCP initialize instructions for the Policy Engine server. */
export const POLICY_SERVER_INSTRUCTIONS =
  'Policy Engine tools operate on the signed-in organization. ' +
  'Use policy_status to list bundles and versions; use policy_publish to upload a new ' +
  'version, then policy_set_live to activate it. Uploaded versions are inert until activated.';
