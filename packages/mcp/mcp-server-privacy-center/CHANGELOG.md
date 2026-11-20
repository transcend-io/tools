# @transcend-io/mcp-server-privacy-center

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
