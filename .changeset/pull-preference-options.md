---
'@transcend-io/cli': minor
'@transcend-io/sdk': minor
---

Add full pull and push support for consent purposes, preference option values, and preference topics. Purposes and their nested preference-topics can now be pushed (create/update), preference-options are a top-level catalog, and nested topic pull includes slug and color.

Fix push-path bugs: option-value updates now send only `{ id, title }` (not both id and slug), topic updates omit immutable fields (slug, type, purposeId), BOOLEAN topics reject non-empty options and never send `preferenceOptionValueIds`, and CLI-side slug validation enforces `/^[A-Za-z]+$/`.
