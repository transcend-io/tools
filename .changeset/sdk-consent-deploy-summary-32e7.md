---
"@transcend-io/sdk": patch
---

The consent deploy approval summary loads deployed CDN modules in parallel instead of serially, compares locale messages by locale code (not enum name), normalizes UI v2 message shapes, and ignores `deploymentId` when diffing. Summary text is one line and lists at most five items per module.