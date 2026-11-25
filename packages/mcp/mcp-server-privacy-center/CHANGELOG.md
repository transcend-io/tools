# @transcend-io/mcp-server-privacy-center

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
