---
'@transcend-io/privacy-types': minor
'@transcend-io/cli': patch
---

Add integration owner-approval action item codes (`RequestDataSiloNeedsApproval` / `RequestDataSiloNeedsApprovalAssigned`) and an `ApproveAssignedIntegrationRequests` scope so assigned owners can approve or reject privacy request processing for their integrations without needing broader Manage Assigned Integrations access. Regenerate the CLI `transcend.yml` JSON schema so the new codes and scope are reflected.
