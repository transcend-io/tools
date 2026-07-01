---
'@transcend-io/sdk': minor
'@transcend-io/cli': patch
---

feat(sdk): move assessment templates, ensureAllDataSubjectsExist, and syncCodePackages to SDK

- Move `fetchAllAssessmentTemplates`, `AssessmentTemplate` interface, and `ASSESSMENT_TEMPLATES` GQL to `sdk/src/assessments/`
- Move `ensureAllDataSubjectsExist` to `sdk/src/data-inventory/` with new `EnsureDataSubjectsInput` interface (replaces CLI's `TranscendInput` dependency)
- Move `createCodePackage`, `updateCodePackages`, `syncCodePackages` to `sdk/src/code-intelligence/` with `CodePackageInput` interface
- Delete dead-code `syncCookies.ts` from CLI (already duplicated in SDK, all callers already import from SDK)
- All moved functions follow the `(client, options)` signature convention with optional `logger`
