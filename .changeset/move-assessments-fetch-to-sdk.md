---
'@transcend-io/sdk': minor
'@transcend-io/cli': minor
---

Move assessment fetch and GQL definitions from CLI to SDK

- Add `fetchAllAssessments` to `assessments/` module in SDK
- Move `gqls/assessment.ts` to SDK
- All imports updated to use `@transcend-io/sdk` directly
