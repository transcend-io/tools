---
'@transcend-io/cli': patch
---

Route CLI runtime I/O through Stricli's isolated command context and centralize pooling UI
wiring so embedded and test invocations can provide their own process streams, filesystem, and
logger.
