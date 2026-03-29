---
'@transcend-io/cli': major
---

Port the multi-identifier preference upload workflow into the monorepo CLI.

This adds `consent configure-preference-upload`, moves `upload-preferences` to the schema-backed parallel worker flow, and includes the supporting receipts state, preference upload skill, and reconcile script.
