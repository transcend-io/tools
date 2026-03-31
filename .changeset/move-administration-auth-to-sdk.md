---
'@transcend-io/sdk': minor
'@transcend-io/cli': minor
---

Move auth, API keys, teams, and user GraphQL functions from CLI to SDK

- Add `administration/` module to SDK: `loginUser`, `assumeRole`, `fetchAllTeams`, `syncTeams`, `fetchAllUsers`, `fetchApiKeys`, `fetchAllApiKeys`, `createApiKey`, `deleteApiKey`
- Remove `colors` dependency from SDK - log messages are plain strings
- All imports updated to use `@transcend-io/sdk` directly
