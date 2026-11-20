---
'@transcend-io/mcp-server-base': patch
'@transcend-io/mcp-server-preferences': minor
'@transcend-io/mcp': minor
'@transcend-io/sdk': minor
---

Add `preferences_write_partitions`, `preferences_list_option_values`, `preferences_write_option_values`, `preferences_list_workflow_configs` and `preferences_write_workflow_configs`. They cover the partitions, preference-options and preference-workflow-configs sections of `transcend.yml`. The SDK adds `convertConsentWorkflowTriggersToInputs`, which `transcend inventory pull` now uses.
