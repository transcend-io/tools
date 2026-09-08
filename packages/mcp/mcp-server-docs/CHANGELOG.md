# @transcend-io/mcp-server-docs

## 0.4.1

### Patch Changes

- Updated dependencies [bccab7e]
  - @transcend-io/mcp-server-base@1.8.1

## 0.4.0

### Minor Changes

- 557a80b: Rename the `docs_list` search argument from `keyword` to `query`, and tighten BM25 matching.

  `query` is what comparable search tools name this argument — Linear, Notion, and Datadog all use
  it — so the rename stops `docs_list` from being the one search tool in a caller's toolset that
  differs from the convention.

  Search now uses `tolerance: 0` and `threshold: 0.3`. Fuzzy matching cost accuracy on every set
  of a labeled benchmark, and a typo it "rescued" returned unrelated articles rather than the
  intended one. The threshold change leaves recall unchanged while cutting matches on a typical
  query from roughly 417 to 131, so the reported `totalCount` is a usable signal rather than
  close to the size of the corpus.

  The argument description now asks for the most distinctive terms rather than a whole sentence,
  since generic words match most articles and blur the ranking.

  Search returns 20 results rather than 10. On the same benchmark, targets that missed the top ten
  sat at a median rank of 16 and 19, so one page deeper lifts hit@k from 87% to 95% on title terms
  and 88% to 95% on natural questions, for roughly 434 extra tokens. There is deliberately no
  offset: almost nothing recoverable ranks past 30, and paging only helps a caller that knows it
  missed — at rank 16 the first ten results all look plausible, so the miss goes unnoticed and the
  page is never requested.

  `docs_list` also no longer answers an argument-less call with the whole catalog. It returns the
  seven documentation sections with their article counts — 540 characters against the roughly 69KB
  the full listing cost — which is a better answer to "what is documented" and makes the next call
  obvious. Listing a single section is capped at 50 articles, since the largest holds 125. Whenever
  results are withheld, the response now carries a note saying how many and what to change; a
  truncated response the caller cannot distinguish from a complete one is what made the previous
  behavior hard to notice. An unrecognized `section` is now an error naming the valid ones instead
  of an empty list that reads like "no such articles", and a `query` that is present but blank is
  an error rather than a silent fall-through to browsing — the caller asked to search, so answering
  with the section list and reporting success hides the fact that no search ran.

- 557a80b: Rank `docs_list` keyword results with in-process Orama BM25 over article bodies (not just titles) so queries like "session" can surface Consent Dashboard and telemetry docs (ZEL-8224).

### Patch Changes

- 2a6a955: Fixes a lot of Sombra tools
- Updated dependencies [2a6a955]
- Updated dependencies [557a80b]
  - @transcend-io/mcp-server-base@1.8.0

## 0.3.25

### Patch Changes

- Updated dependencies [5b97f8e]
  - @transcend-io/mcp-server-base@1.7.4

## 0.3.24

### Patch Changes

- Updated dependencies [ef34d80]
  - @transcend-io/mcp-server-base@1.7.3

## 0.3.23

### Patch Changes

- Updated dependencies [656903e]
  - @transcend-io/mcp-server-base@1.7.2

## 0.3.22

### Patch Changes

- Updated dependencies [4aa92a1]
  - @transcend-io/mcp-server-base@1.7.1

## 0.3.21

### Patch Changes

- Updated dependencies [732e769]
  - @transcend-io/mcp-server-base@1.7.0

## 0.3.20

### Patch Changes

- Updated dependencies [d00bd92]
- Updated dependencies [2b82ee8]
- Updated dependencies [bd397d4]
  - @transcend-io/mcp-server-base@1.6.0

## 0.3.19

### Patch Changes

- Updated dependencies [9032822]
  - @transcend-io/mcp-server-base@1.5.0

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
