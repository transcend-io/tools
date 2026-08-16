---
'@transcend-io/privacy-types': minor
'@transcend-io/cli': patch
---

Add dedicated Custom Function scopes to the AD scope catalog: `ViewCustomFunction` and `ManageCustomFunction` (wire values `viewCustomFunction` / `manageCustomFunction`), titled "View Custom Functions" / "Manage Custom Functions". These let Custom Function access be granted independently of the broader Data Map scopes (LINK-7162). Endpoint mapping onto the new scopes lands in a follow-up (LINK-7163).
