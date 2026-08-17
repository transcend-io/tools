# @transcend-io/mcp-server-docs

## 0.3.18

### Patch Changes

- Updated dependencies [c8df618]
  - @transcend-io/mcp-server-base@1.4.0

## 0.3.17

### Patch Changes

- @transcend-io/mcp-server-base@1.3.1

## 0.3.16

### Patch Changes

- Updated dependencies [5819bc1]
- Updated dependencies [c787e9d]
  - @transcend-io/mcp-server-base@1.3.0

## 0.3.15

### Patch Changes

- Updated dependencies [4404c48]
- Updated dependencies [7d980a1]
  - @transcend-io/mcp-server-base@1.2.0

## 0.3.14

### Patch Changes

- Updated dependencies [26fadc4]
  - @transcend-io/mcp-server-base@1.1.1

## 0.3.13

### Patch Changes

- Updated dependencies [2faaff6]
- Updated dependencies [5b239dc]
- Updated dependencies [5b239dc]
- Updated dependencies [6293072]
- Updated dependencies [daffc18]
- Updated dependencies [dc9ab41]
- Updated dependencies [5b239dc]
- Updated dependencies [97fa941]
- Updated dependencies [5b239dc]
  - @transcend-io/mcp-server-base@1.1.0

## 0.3.12

### Patch Changes

- @transcend-io/mcp-server-base@1.0.0

## 0.3.11

### Patch Changes

- Updated dependencies [f6ca084]
- Updated dependencies [66e641e]
  - @transcend-io/mcp-server-base@0.14.0

## 0.3.10

### Patch Changes

- 6d2b56d: Publish sourcemaps that reference their sources rather than embedding them, taking the maps across these packages from roughly 817 KB to 174 KB.

  Stack traces keep their mapped TypeScript positions; what is lost is the surrounding code frame, and only where the sources are not on disk. A fair trade for a server a host launches as a subprocess, and the reason this is scoped to the MCP packages rather than set for every published library.

- Updated dependencies [4bc21f7]
- Updated dependencies [e127dfc]
- Updated dependencies [f3ce7dc]
- Updated dependencies [6d2b56d]
  - @transcend-io/mcp-server-base@0.13.0

## 0.3.9

### Patch Changes

- Updated dependencies [1b93859]
- Updated dependencies [1b93859]
- Updated dependencies [1b93859]
- Updated dependencies [c166809]
- Updated dependencies [1b93859]
  - @transcend-io/mcp-server-base@0.12.0

## 0.3.8

### Patch Changes

- Updated dependencies [6932df1]
  - @transcend-io/mcp-server-base@0.11.0

## 0.3.7

### Patch Changes

- Updated dependencies [8034d59]
- Updated dependencies [c00f3c5]
  - @transcend-io/mcp-server-base@0.10.0

## 0.3.6

### Patch Changes

- Updated dependencies [c65d41e]
  - @transcend-io/mcp-server-base@0.9.0

## 0.3.5

### Patch Changes

- Updated dependencies [cf74715]
- Updated dependencies [29821b9]
- Updated dependencies [fb24b96]
- Updated dependencies [637b357]
  - @transcend-io/mcp-server-base@0.8.0

## 0.3.4

### Patch Changes

- Updated dependencies [e410109]
  - @transcend-io/mcp-server-base@0.7.0

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
