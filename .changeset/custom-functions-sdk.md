---
'@transcend-io/sdk': minor
---

Add custom function sync support. The SDK gains a customer-ingress code signing helper (`signCustomFunctionCode`, calling Sombra's `/v1/custom/sign` route with bearer authentication), a Sombra gateway URL resolver (`resolveSombraCustomerUrl`), and typed custom function fetch/diff/sync helpers (`fetchAllCustomFunctions`, `syncCustomFunction`). Existing custom functions are matched by `id` when provided, falling back to exact name, with an error on ambiguous names.
