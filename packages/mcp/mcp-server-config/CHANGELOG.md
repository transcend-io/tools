# @transcend-io/mcp-server-config

## 0.1.2

### Patch Changes

- 69b40d1: Add `dsr_list_enrichers`, `dsr_write_enrichers`, `dsr_list_actions` and `dsr_write_actions`. They read and write the `preflights` and `actions` sections of transcend.yml without a file on disk.

  Export shared `createCollectedLogger` from the MCP base package so DSR, config, inventory, and workflows tools reuse one implementation.

- Updated dependencies [69b40d1]
- Updated dependencies [8e2bf2f]
- Updated dependencies [64d13d6]
  - @transcend-io/mcp-server-base@3.1.2

## 0.1.1

### Patch Changes

- 7217c74: Add `preferences_write_partitions`, `preferences_list_option_values`, `preferences_write_option_values`, `preferences_list_workflow_configs` and `preferences_write_workflow_configs`. They cover the partitions, preference-options and preference-workflow-configs sections of `transcend.yml`. The SDK adds `convertConsentWorkflowTriggersToInputs`, which `transcend inventory pull` now uses.
- ae6da74: Add `workflows_write_email_templates` so the MCP can create email templates like `transcend inventory push`. Add the `ManageEmailTemplates` scope to the workflows server.
- Updated dependencies [3b92b89]
- Updated dependencies [c466144]
- Updated dependencies [7217c74]
  - @transcend-io/mcp-server-base@3.1.1
  - @transcend-io/sdk@3.3.0

## 0.1.0

### Minor Changes

- 10e4fb7: Add `config_pull`, `config_push` and `config_get_schema`. They read and write `transcend.yml` files on disk, like `transcend inventory pull` and `push`. `config_push` needs confirmation. The tools run over stdio only. The unified server now requests every scope the pull and push paths can need.
