---
'@transcend-io/cli': minor
'@transcend-io/sdk': minor
---

Add `transcend consent deploy` to deploy the Consent Manager bundle without changing the airgap.js version. Optional `--wait` polls deploy state until completion. The SDK adds `fetchConsentManagerDeployState` and `waitForConsentManagerDeploy`.