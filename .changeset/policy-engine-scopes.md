---
"@transcend-io/privacy-types": minor
---

Add Policy Engine (Seneca) control-plane scopes to the AD scope catalog: `ViewPolicyEngineBundles`, `ManagePolicyEngineBundles`, and `ActivatePolicyEngineBundles` (wire values `viewPolicyEngineBundles` / `managePolicyEngineBundles` / `activatePolicyEngineBundles`), titled "View Policy" / "Manage Policy" / "Activate Policy". These authorize the new `/api/v1/policy-engine/*` REST endpoints on the monolith. Also adds a new `TranscendProduct.PolicyEngine` enum value.

To disambiguate from the new Policy Engine scopes, the two existing Privacy Center scopes are retitled: `ViewPolicies` "View Policies" → "View Privacy Center Policies", and `ManagePolicies` "Manage Policies" → "Manage Privacy Center Policies". Their enum names and wire values (`viewPolicies` / `managePolicies`) are unchanged, so stored API-key scopes and authorization are unaffected.

Note: the `transcend admin generate-api-keys --scopes` CLI flag accepts scope **titles**, so the accepted values for the two retitled scopes change accordingly ("View Policies" → "View Privacy Center Policies", "Manage Policies" → "Manage Privacy Center Policies"). Automation passing the old titles must be updated.
