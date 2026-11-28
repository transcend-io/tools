---
'@transcend-io/mcp-server-base': patch
---

Add a credential store that can save an OAuth login in the OS keychain or in a file that only your user can read on macOS and Linux. Nothing uses it yet. The OS keychain comes from the optional `@napi-rs/keyring` dependency, which some platforms do not install.
