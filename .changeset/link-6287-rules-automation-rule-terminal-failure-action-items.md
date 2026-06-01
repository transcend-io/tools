---
"@transcend-io/privacy-types": patch
"@transcend-io/cli": patch
---

Add `RulesAutomationRuleTerminalFailure` and `RulesAutomationRuleTerminalFailureAssigned` values to the `ActionItemCode` enum so that Rules Automation rule owners can be notified when a rule hits a terminal execution failure. Regenerate the CLI `transcend.yml` JSON schema so the new codes are reflected.
