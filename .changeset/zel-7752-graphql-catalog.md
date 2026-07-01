---
'@transcend-io/cli': patch
'@transcend-io/sdk': patch
---

Move the `graphql` dependency to the workspace catalog so every package in
the monorepo (including the new MCP codegen consumers) resolves it to a
single, hermetic version. No runtime behavior change.
