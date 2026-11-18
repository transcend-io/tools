---
'@transcend-io/sdk': patch
'@transcend-io/cli': patch
---

Fix two GraphQL documents that no longer match the schema.

- `approveRequest` in the CLI now declares `ApproveRequestInput`. `CommunicationInput` is rejected by the current schema.
- The assessments query no longer selects the removed `AttributePromptRunResource` and `AttributePromptGroupResource` types.
