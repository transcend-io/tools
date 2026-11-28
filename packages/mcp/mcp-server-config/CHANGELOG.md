# @transcend-io/mcp-server-config

## 0.5.0

### Minor Changes

- 11136a9: When you run an MCP server with public HTTP mode (`--public-url` or `TRANSCEND_MCP_PUBLIC_URL`), the CLI now enforces multi-tenant Sombra only. Self-hosted Sombra organizations are refused so the hosted endpoint does not read data behind a customer-managed Sombra.

### Patch Changes

- 2eb3a57: Public hosted mode of the MCP HTTP transport (`TRANSCEND_MCP_PUBLIC_URL`) now accepts verified OAuth access tokens only. The server checks each `Authorization: Bearer` token with the authorization server (OAuth 2.0 Token Introspection) and requires the token to be active, unexpired, and issued for this server. API keys and session cookies are not accepted in this mode.
  - Set `TRANSCEND_MCP_INTROSPECTION_CLIENT_ID` and `TRANSCEND_MCP_INTROSPECTION_CLIENT_SECRET` when you set a public URL. The server does not start without them.
  - A missing or invalid token gets `401` with a `WWW-Authenticate` challenge. If the authorization server cannot be reached, the request gets `503`.
  - Sombra-backed tools run only for organizations on the multi-tenant Sombra. Organizations that self-host Sombra get an error that points them to the locally installed server (`npx @transcend-io/mcp`).

  Nothing changes when no public URL is set.

- Updated dependencies [ba3f495]
- Updated dependencies [793e0b7]
- Updated dependencies [2eb3a57]
- Updated dependencies [564d964]
- Updated dependencies [2093f0e]
  - @transcend-io/mcp-server-base@3.6.0

## 0.4.0

### Minor Changes

- 94c3666: Add the MCP `openWorldHint` tool annotation. `defineTool` defaults it to `false`, and every tool now sets it explicitly (`true` for tools that email data subjects or assignees, trigger downstream integrations, run user code, or read external documentation).

### Patch Changes

- Updated dependencies [adf2a3e]
- Updated dependencies [281045c]
- Updated dependencies [d9e212f]
- Updated dependencies [94c3666]
- Updated dependencies [792e187]
  - @transcend-io/mcp-server-base@3.4.0
  - @transcend-io/privacy-types@7.5.0
  - @transcend-io/sdk@3.8.2

## 0.3.0

### Minor Changes

- 3a70163: Add `TRANSCEND_MCP_SERVERS` to `@transcend-io/mcp` to register a subset of domains (for example `config,consent`) and request only their OAuth scopes. `@transcend-io/mcp-server-config` now exports its `TRANSCEND_CONFIG_RESOURCES` helpers so the unified server can cap config scopes the same way.

### Patch Changes

- Updated dependencies [39efde0]
- Updated dependencies [f132514]
- Updated dependencies [618c640]
- Updated dependencies [3833044]
  - @transcend-io/sdk@3.6.0
  - @transcend-io/mcp-server-base@3.2.2

## 0.2.2

### Patch Changes

- 63e5999: Support consent manager `reportOnly` in transcend.yml inventory push and pull.
- Updated dependencies [9b34876]
- Updated dependencies [63e5999]
  - @transcend-io/sdk@3.5.0

## 0.2.1

### Patch Changes

- 87ce10b: Add `McpToolErrorCode` to privacy-types as the canonical MCP tool failure codes (seven values). MCP packages import it from privacy-types directly (not re-exported through mcp-server-base). The former `ErrorCode` enum on mcp-server-base is removed.
- Updated dependencies [87ce10b]
  - @transcend-io/privacy-types@7.2.0
  - @transcend-io/mcp-server-base@3.2.1

## 0.2.0

### Minor Changes

- 2ec345c: Add `renderPushPlanDiff` for inventory push previews and a read-only `config_diff` MCP tool that returns a paste-ready diff before `config_push`.
- 234002f: Add `TRANSCEND_CONFIG_RESOURCES` to cap OAuth scopes and config pull/push to listed transcend.yml sections.
- f70a436: Config push and consent deploy now show a short summary of pending changes in the human confirmation prompt. New read-only tools `config_preview_push` and `consent_preview_deploy` return full diffs for agents to show in chat before running the gated tools.

### Patch Changes

- 5110643: Centralized MCP OAuth scope lists in the SDK so OAuth clients and servers can pin scopes by server type. Domain MCP packages no longer export per-server `*_OAUTH_SCOPES` constants; import `getMcpServerOAuthScopes` from `@transcend-io/sdk` instead.
- Updated dependencies [2ec345c]
- Updated dependencies [23bdda1]
- Updated dependencies [f4c51c9]
- Updated dependencies [5110643]
- Updated dependencies [f70a436]
- Updated dependencies [0c71caf]
- Updated dependencies [460eb96]
- Updated dependencies [353a73d]
- Updated dependencies [6eb83b5]
- Updated dependencies [8bd784e]
- Updated dependencies [faada80]
- Updated dependencies [3214d5b]
- Updated dependencies [ef4a7ba]
  - @transcend-io/sdk@3.4.0
  - @transcend-io/mcp-server-base@3.2.0
  - @transcend-io/privacy-types@7.1.2

## 0.1.2

### Patch Changes

- 69b40d1: Add `dsr_list_enrichers`, `dsr_write_enrichers`, `dsr_list_actions` and `dsr_write_actions`. They read and write the `preflights` and `actions` sections of transcend.yml without a file on disk.

  Export shared `createCollectedLogger` from the MCP base package so DSR, config, inventory, and workflows tools reuse one implementation.

- Updated dependencies [69b40d1]
- Updated dependencies [8e2bf2f]
- Updated dependencies [64d13d6]
  - @transcend-io/mcp-server-base@3.1.2

## 0.1.1

### Patch Changes

- 7217c74: Add `preferences_write_partitions`, `preferences_list_option_values`, `preferences_write_option_values`, `preferences_list_workflow_configs` and `preferences_write_workflow_configs`. They cover the partitions, preference-options and preference-workflow-configs sections of `transcend.yml`. The SDK adds `convertConsentWorkflowTriggersToInputs`, which `transcend inventory pull` now uses.
- ae6da74: Add `workflows_write_email_templates` so the MCP can create email templates like `transcend inventory push`. Add the `ManageEmailTemplates` scope to the workflows server.
- Updated dependencies [3b92b89]
- Updated dependencies [c466144]
- Updated dependencies [7217c74]
  - @transcend-io/mcp-server-base@3.1.1
  - @transcend-io/sdk@3.3.0

## 0.1.0

### Minor Changes

- 10e4fb7: Add `config_pull`, `config_push` and `config_get_schema`. They read and write `transcend.yml` files on disk, like `transcend inventory pull` and `push`. `config_push` needs confirmation. The tools run over stdio only. The unified server now requests every scope the pull and push paths can need.
