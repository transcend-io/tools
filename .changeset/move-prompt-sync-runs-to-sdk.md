---
'@transcend-io/sdk': minor
'@transcend-io/cli': minor
---

Move prompt sync & run GraphQL functions from CLI to SDK

- Add to `ai/` module in SDK: `syncPrompts`, `syncPromptPartials`, `syncPromptGroups`, `reportPromptRun`, `addMessagesToPromptRun`
- All imports updated to use `@transcend-io/sdk` directly
