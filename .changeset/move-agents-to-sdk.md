---
'@transcend-io/sdk': minor
'@transcend-io/cli': minor
---

Move agent GraphQL functions from CLI to SDK

- Add `ai/` module to SDK: `fetchAllAgents`, `syncAgents`, `fetchAllAgentFiles`, `syncAgentFiles`, `fetchAllAgentFunctions`, `syncAgentFunctions`
- Add `@types/json-schema` to SDK, normalize CLI version to `catalog:`
- All imports updated to use `@transcend-io/sdk` directly
