---
"@transcend-io/sdk": patch
"@transcend-io/cli": patch
---

Pushing selected `transcend.yml` sections is safer when keys are minted with only section scopes.

- Data silo, preflight, and processing-activity pushes now include the view scope needed to resolve referenced data subjects. Missing subjects are no longer auto-created unless the push includes a `data-subjects` section.
- SDK helpers throw errors instead of calling `process.exit`, so servers and MCP hosts are not killed on validation failures.
- Data category sync reports per-item errors and no longer crashes the batch when one create fails.
- Data silo batch updates retry per silo when a chunk fails, so one bad silo does not block the rest.

If you push data silos that reference new data subject types without a `data-subjects` section, add those subjects to the yaml first.