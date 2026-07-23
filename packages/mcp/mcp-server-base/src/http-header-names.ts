/** Streamable HTTP MCP session id (request and response) */
export const MCP_SESSION_ID_HEADER = 'mcp-session-id';

/** Transcend API key when not using `Authorization: Bearer` */
export const TRANSCEND_API_KEY_HEADER = 'x-transcend-api-key';

/** Active organization id for session-based dashboard auth */
export const TRANSCEND_ACTIVE_ORG_ID_HEADER = 'x-transcend-active-organization-id';

/** MCP client identity for inbound HTTP and outbound API attribution */
export const MCP_CALLER_HEADER = 'x-transcend-mcp-caller';

/** Transcend REST API dated version */
export const TRANSCEND_VERSION_HEADER = 'X-Transcend-Version';

/** Value for {@link TRANSCEND_VERSION_HEADER} on Sombra REST calls */
export const TRANSCEND_VERSION_HEADER_VALUE = '2021-11-15';

/** Correlates outbound Transcend requests to a single MCP `tools/call` */
export const TOOLCALL_ID_HEADER = 'x-toolcall-id';

/**
 * Optional Sombra customer-ingress API key (self-hosted / STS).
 * Sent as `X-Sombra-Authorization: Bearer …` when `SOMBRA_CUSTOMER_KEY` is set.
 */
export const SOMBRA_AUTHORIZATION_HEADER = 'X-Sombra-Authorization';
