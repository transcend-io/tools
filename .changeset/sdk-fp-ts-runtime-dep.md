---
'@transcend-io/sdk': patch
---

Declare `fp-ts` as a direct runtime dependency.

`io-ts@2.2.x` declares `fp-ts` as a peer dependency, and `@transcend-io/sdk`
imports `io-ts` from its public surface (e.g. `preference-management/codecs`,
`assessments/parseAssessmentDisplayLogic`). Without `fp-ts` declared on the SDK
itself, strict resolvers (yarn-berry PnP, pnpm with strict peers) crash at
`require('fp-ts/lib/Either')` when consumers transitively load the SDK:

```
Error: io-ts tried to access fp-ts (a peer dependency) but it isn't provided
       by its ancestors; this makes the require call ambiguous and unsound.
Required package: fp-ts (via "fp-ts/lib/Either")
Required by: io-ts@npm:2.2.21
Ancestor breaking the chain: @transcend-io/sdk@npm:1.1.0
```

This is purely additive. It matches the `^2.16.1` constraint already used by
`@transcend-io/cli`, `@transcend-io/privacy-types`, and `@transcend-io/type-utils`
so consumers dedupe to a single `fp-ts` major across the workspace.

The patch cascades to every package that depends on `@transcend-io/sdk` via
`workspace:*` (notably `@transcend-io/mcp-server-consent` and the umbrella
`@transcend-io/mcp`), so the next release will pick up the fix everywhere.
