---
'@transcend-io/sdk': minor
'@transcend-io/cli': minor
---

Move consent manager core functions from CLI to SDK

- Add `consent/` module to SDK: `fetchConsentManager`, `fetchConsentManagerId`, `fetchConsentManagerExperiences`, `fetchConsentManagerAnalyticsData`, `fetchConsentManagerTheme`, `createTranscendConsentGotInstance`
- All imports updated to use `@transcend-io/sdk` directly
