---
'@transcend-io/cli': patch
'@transcend-io/sdk': patch
---

Update `got` dependency from v11 to v15.

Note: per [got v15 release notes](https://github.com/sindresorhus/got/releases/tag/v15.0.0),
`responseType: 'buffer'` (and `.buffer()`) now resolve to `Uint8Array` instead
of `Buffer`. The `onFileDownloaded` callback in `streamPrivacyRequestFiles`
has been retyped accordingly. `Buffer` is still a `Uint8Array` subclass, so
existing usages that just write the value to disk continue to work without
changes.
