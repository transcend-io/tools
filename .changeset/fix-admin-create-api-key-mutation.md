---
"@transcend-io/mcp-server-admin": patch
---

Fix `admin_create_api_key` GraphQL mutation. The previous document selected `scopes` without subfields and read a non-existent top-level `token` field, causing every invocation to fail with `GRAPHQL_VALIDATION_FAILED`. The mutation now selects `scopes { id name }` and reads the plain-text token from its real location at `createApiKey.apiKey.apiKey`. The public return shape `{ apiKey, token }` is unchanged.
