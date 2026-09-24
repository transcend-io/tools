# @transcend-io/mcp-server-policy

## 0.2.3

### Patch Changes

- Updated dependencies [e819811]
  - @transcend-io/mcp-server-base@2.5.2
  - @transcend-io/privacy-types@6.2.1
  - @transcend-io/utils@0.3.1

## 0.2.2

### Patch Changes

- Updated dependencies [3ae909e]
  - @transcend-io/privacy-types@6.2.0

## 0.2.1

### Patch Changes

- 9331229: Require human confirmation before Policy Engine publish/go-live and Custom Function upsert, promote, and test-run actions so those changes cannot run without your approval.

## 0.2.0

### Minor Changes

- 3501b59: Add `policy_get_templates` and `policy_list_bundles` for Policy Engine authoring templates and bundle/version inspection.
- 4726631: Scaffold `@transcend-io/mcp-server-policy` and share Policy Engine bundle size limits from `@transcend-io/utils`.

  The new MCP package provides the Policy Engine server shell (OAuth scopes, client helpers, and error formatting). Bundle upload limits (`MAX_BUNDLE_COMPRESSED_BYTES` / `MAX_BUNDLE_DECOMPRESSED_BYTES`) now live in `@transcend-io/utils` so the CLI and MCP server share one source of truth.

- 2efa29d: Add `policy_publish` and `policy_set_live` for uploading inert Policy Engine versions and explicitly activating or deactivating them.
- 582fdbe: Add Policy Engine MCP domain with `policy_help`, `policy_status`, `policy_publish`, and `policy_set_live`. Operations follow `transcend policy` CLI paths; OAuth requests only Activate Policy scope (superset of Manage/View).

### Patch Changes

- Updated dependencies [f3a7dc8]
- Updated dependencies [4726631]
  - @transcend-io/mcp-server-base@2.5.1
  - @transcend-io/utils@0.3.0

## 0.1.0

### Minor Changes

- Initial release with Policy Engine MCP tools: `policy_get_templates`, `policy_list_bundles`, `policy_publish`, and `policy_set_live`.
