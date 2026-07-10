---
'@transcend-io/sdk': minor
'@transcend-io/cli': minor
---

Support `supportsAuthorizedAgent` on `data-subjects` in transcend.yml — the field can now be pushed via `updateSubject` and pulled from `internalSubjects`. Pushing `supportsAuthorizedAgent` requires the Authorized Agents feature to be enabled for the organization; the sync error message now calls this out explicitly.
