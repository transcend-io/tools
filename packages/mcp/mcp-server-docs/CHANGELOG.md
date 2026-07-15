# @transcend-io/mcp-server-docs

## 0.3.3

### Patch Changes

- Updated dependencies [3f41944]
  - @transcend-io/mcp-server-base@0.6.2

## 0.3.2

### Patch Changes

- 212568a: Fix punctuation in README usage section.

## 0.3.1

### Patch Changes

- Updated dependencies [cbe9d3a]
  - @transcend-io/mcp-server-base@0.6.1

## 0.3.0

### Minor Changes

- 02bab58: Rename docs MCP tools to match domain-server naming: `transcend_docs_list` → `docs_list`, `transcend_docs_fetch` → `docs_fetch`. Update umbrella server initialize instructions accordingly.

## 0.2.2

### Patch Changes

- 8fb4627: **@transcend-io/mcp-server-base:** Add per-tool `requireAuth` (call time) and `requireStartupAuth` on `createMCPServer` (boot). Add optional MCP initialize `instructions` on `buildMcpServer`, plus `resolveStdioStartupAuthOptional` for servers that include public tools.

  **@transcend-io/mcp-server-docs:** Docs tools set `requireAuth: false` so they skip lazy OAuth. Standalone CLI uses `requireStartupAuth: false` (no API key or OAuth at startup). Remove unused docs OAuth scopes.

  **@transcend-io/mcp:** Umbrella server uses optional startup auth, registers docs tools first, and ships initialize instructions guiding agents to `transcend_docs_list` / `transcend_docs_fetch` before org-specific API tools. Read CLI version from `package.json`.

  **Domain MCP servers:** Read CLI version from `package.json` instead of a hardcoded value.

- Updated dependencies [8fb4627]
  - @transcend-io/mcp-server-base@0.6.0

## 0.2.1

### Patch Changes

- c7dece4: Add getDocsTools exports and standalone transcend-mcp-docs CLI binary.

## 0.2.0

### Minor Changes

- 105767b: Initial package scaffold with llms.txt index engine and cached fetch helpers.

### Patch Changes

- 715d553: Add transcend_docs_list and transcend_docs_fetch documentation lookup tools.

## 0.1.0

### Minor Changes

- Initial package scaffold with llms.txt index engine and lru-cache-backed fetch helpers.
