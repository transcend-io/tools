---
'@transcend-io/mcp-server-assessment': patch
'@transcend-io/mcp-server-base': patch
'@transcend-io/mcp': patch
---

Clarify that assessment comment resolution is per thread on the root.

`assessments_list_comments` now filters OPEN/RESOLVED by the root comment's
`resolvedAt`, so replies under a resolved parent no longer look open. Both list
and write tool copy state that replies close when the root is resolved.
