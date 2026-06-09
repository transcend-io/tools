---
"@transcend-io/privacy-types": minor
---

Add Policy Engine (Seneca) control-plane scopes to the AD scope catalog: `ViewPolicyBundles`, `ManagePolicyBundles`, and `ActivatePolicyBundles`. These authorize the new `/api/v1/policy-engine/*` REST endpoints on the monolith and are distinct from the existing `ViewPolicies` / `ManagePolicies` scopes, which remain scoped to Privacy Center legal policies. Also adds a new `TranscendProduct.PolicyEngine` enum value.
