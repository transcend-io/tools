---
"@transcend-io/design-tokens": minor
---

Add `background.default.subtle` and `border.focused.subtle` semantic color tokens for ad-core color migration gaps.

`border.focused` is now a group (`default` / `subtle`) instead of a string leaf. TypeScript callers should use `border.focused.default` or `String(border.focused)`; CSS `--border-focused` still resolves via the rest-state alias.
