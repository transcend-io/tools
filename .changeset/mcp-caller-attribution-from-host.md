---
'@transcend-io/mcp-server-base': patch
---

Fall back to the host detected at `initialize` when setting `x-transcend-mcp-caller` on outbound Transcend requests, so stdio sessions carry usage attribution they previously had no way to send.

An explicitly forwarded header still takes precedence, since a caller proxying on a user's behalf knows its own identity better than we can infer it. Nothing is sent when the host could not be identified, rather than guessing.
