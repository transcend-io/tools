---
'@transcend-io/privacy-types': major
'@transcend-io/cli': major
---

Remove the unused `BusinessEntityNeedsDocumentation` / `BUSINESS_ENTITY_NEEDS_DOCUMENTATION` action item code. The product feature was already disabled and is being deleted; configs that still reference this value should drop it.

**Migration:** Remove any `BUSINESS_ENTITY_NEEDS_DOCUMENTATION` entries from `transcend.yml` action-item configuration before upgrading.
