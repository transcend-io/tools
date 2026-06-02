---
'@transcend-io/mcp-server-admin': minor
'@transcend-io/mcp-server-assessment': minor
'@transcend-io/mcp-server-consent': minor
'@transcend-io/mcp-server-discovery': minor
'@transcend-io/mcp-server-dsr': minor
'@transcend-io/mcp-server-inventory': minor
'@transcend-io/mcp-server-preferences': minor
'@transcend-io/mcp-server-workflows': minor
'@transcend-io/mcp': minor
---

Adopt typed `graphql()` operations across every MCP server, plus tool input
parameter cleanups that surfaced during the migration.

Schema-level changes:

- All hand-written GraphQL strings are replaced with `graphql()`-tagged
  `TypedDocumentNode`s generated from the committed `schema.graphql`. Any
  drift between the consumer operation and the staging schema now fails
  `tsc` instead of slipping through to a runtime error.
- `admin_create_api_key` returns the same shape (`apiKey`, `token`,
  `warning`, `message`), but the underlying mutation has been corrected to
  match the schema's `CreatedApiKey` payload.
- `workflows_update_config` is split into a mutation followed by a
  follow-up `workflowConfig` read because `UpdateWorkflowConfigPayload`
  only exposes `success`/`clientMutationId`. The tool no longer accepts
  `show_in_privacy_center`; the GraphQL API does not expose that field.
- `inventory_list_data_silos` no longer requests `DataSilo.updatedAt`
  (not present on the type).

Tool input parameter renames (BREAKING — every tool input is now
camelCase). Tool *names* are unchanged. The full list of renamed fields:

- `assessment_id` → `assessmentId`
- `assessment_section_ids` → `assessmentSectionIds`
- `assessment_question_id` → `assessmentQuestionId`
- `assessment_answer_ids` → `assessmentAnswerIds`
- `assessment_answer_values` → `assessmentAnswerValues`
- `assessment_group_id` → `assessmentGroupId`
- `assessment_name` → `assessmentName`
- `template_id` → `templateId`
- `reviewer_ids` → `reviewerIds`
- `due_date` → `dueDate`
- `assignee_ids` → `assigneeIds`
- `assignee_emails` → `assigneeEmails`
- `external_assignee_emails` → `externalAssigneeEmails`
- `submit_for_review` → `submitForReview`
- `tracking_purposes` → `trackingPurposes`
- `is_junk` → `isJunk`
- `data_flows` → `dataFlows`
- `show_zero_activity` → `showZeroActivity`
- `order_field` → `orderField`
- `order_direction` → `orderDirection`
- `data_silo_id` → `dataSiloId`
- `data_point_id` → `dataPointId`
- `scan_id` → `scanId`
- `entity_types` → `entityTypes`
- `request_id` → `requestId`
- `profile_ids` → `profileIds`
- `data_silos` → `dataSilos` (admin_create_api_key)
- `workflow_config_id` → `workflowConfigId`
- `user_id` → `userId`
- `show_in_privacy_center` (removed; not in schema)

A repo-wide `scripts/check-mcp-descriptions.test.ts` audit now blocks
PRs where any tool input field is missing a Zod description.
