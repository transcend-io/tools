---
'@transcend-io/mcp-server-base': minor
'@transcend-io/mcp': minor
---

Reject arguments a tool never declared, instead of silently dropping them.

Zod strips unknown keys by default, so a misspelled argument name parsed cleanly and the tool
ran whatever it does with no arguments — while reporting success. An agent calling `docs_list`
with `{ query: … }` instead of `{ keyword: … }` received the entire 417-article catalog as a
successful result, and on a destructive tool the same slip performs the write without the
fields the caller meant to send.

`tools/call` now validates against a strict schema and refuses unrecognized arguments with a
`VALIDATION_ERROR` that names both the rejected argument and the accepted ones, so an agent can
correct itself in one retry.

Confirmation-gated tools still accept `approvalToken` even on transports whose gate does not
advertise it, so a replayed token reaches the gate and gets its own explanation rather than a
bare unknown-argument error. The advertised input schema is unchanged.
