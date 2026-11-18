---
'@transcend-io/sdk': minor
'@transcend-io/cli': minor
---

Move the `transcend.yml` pull, sync and codec logic into `@transcend-io/sdk`. Import codecs and sync helpers from the main SDK entry point. Pull and sync no longer print by default. Pass a `logger` (and a `progressReporter` for sync) to get output. Moved log messages no longer use ANSI colors.