# @transcend-io/mcp-server-privacy-center

## 0.4.0

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

## 0.3.0

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

## 0.2.2

### Patch Changes

- 4d600ad: Show the real transcend.yml JSON schema for the privacy center write tools (policies, translated messages) and the discovery write tool (results). `ymlItemsSchema` now requires a codec.
- Updated dependencies [6bd42eb]
- Updated dependencies [aa5e8bb]
- Updated dependencies [4d600ad]
- Updated dependencies [29fbc06]
  - @transcend-io/privacy-types@7.4.1
  - @transcend-io/sdk@3.8.0
  - @transcend-io/mcp-server-base@3.3.0

## 0.2.1

### Patch Changes

- 87ce10b: Add `McpToolErrorCode` to privacy-types as the canonical MCP tool failure codes (seven values). MCP packages import it from privacy-types directly (not re-exported through mcp-server-base). The former `ErrorCode` enum on mcp-server-base is removed.
- Updated dependencies [87ce10b]
  - @transcend-io/privacy-types@7.2.0
  - @transcend-io/mcp-server-base@3.2.1

## 0.2.0

### Minor Changes

- 0c71caf: Section write tools now use the same push pipeline as `transcend inventory push` and share one result shape (`success`, `count`, `errors`, optional `warnings` and `logs`). Helpers live on `@transcend-io/mcp-server-base/transcend-yml`.

  **Breaking for direct tool callers**
  - Inventory write tools renamed `items` to section-specific args (for example `businessEntities`, `identifiers`, `attributes`).
  - `privacy_center_write` renamed `publish` to `publishToPrivacyCenter`.
  - DSR write results no longer use `synced` or per-item `{ item, message }` errors; they match other section writes.
  - `consent_write_sites` uses the yaml codec for each site instead of a custom zod shape.

  `privacy_center_write` now asks for confirmation before applying changes that can delete footer links.

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

## 0.1.0

### Minor Changes

- 8e2bf2f: Add `admin_write_teams` and a new Privacy Center MCP server for privacy center config, intl messages, and privacy-center policies (same SDK paths as `transcend inventory` push/pull). Teams writes ask for confirmation. Privacy-center tools use the `privacy_center_*` prefix.

  **Breaking:** `admin_get_privacy_center` is removed from `@transcend-io/mcp-server-admin` and from the unified server. Use `privacy_center_get` on `@transcend-io/mcp-server-privacy-center` (or the umbrella server) instead.

### Patch Changes

- Updated dependencies [69b40d1]
- Updated dependencies [8e2bf2f]
- Updated dependencies [64d13d6]
  - @transcend-io/mcp-server-base@3.1.2

## 0.0.1

Initial release with Privacy Center configuration, intl messages, and privacy-center policy tools.
