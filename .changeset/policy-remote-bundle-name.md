---
'@transcend-io/cli': major
---

Breaking: Policy Engine API commands rename `--bundle-name` to `--remote-bundle-name` so it is clearly distinct from the local bundle directory path (and from `policy new --bundle-dir`).

### Migration

Replace `--bundle-name` with `--remote-bundle-name` on:

- `policy publish`
- `policy activate`
- `policy deactivate`
- `policy download`
- `policy versions`
