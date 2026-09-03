---
'@transcend-io/mcp-server-base': patch
---

Recover the confirmation gate on Cursor, which declines prompts it never showed anybody.

Cursor runs every window's MCP servers in one shared process and routes a server-initiated
request to the window that owns the connection. When the caller is in a different window,
delivery fails and Cursor answers `elicitation/create` with `{ action: "decline" }` — logging
`Cannot route MCP lease elicitation request for window 1 in window 3` — so the gate reported
`CONFIRMATION_DECLINED` for a refusal nobody made, and every gated tool was unusable for as
long as a second window was open.

On stdio a decline is now reinterpreted as "nobody was asked", handing back an approval token
to replay, but only when all three hold: the host is one whose declines are known to be
unprompted (Cursor, the first entry in `HOST_QUIRKS`), the answer arrived in under 250ms, and a
token can actually be minted. Undelivered prompts came back in 1-4ms against roughly a minute
for a real approval, so the floor sits far from both. `cancel` and `accept` are untouched, since
a dismissal is how Cursor reports the user closing the prompt and a fast accept is what an
always-allowed call looks like.

HTTP is unchanged: with no token store behind it, a fast decline there would only swap one
refusal for a less accurate one, so it stays `CONFIRMATION_DECLINED`.

The token still requires the agent to put the action to the user and be told yes, so the
protection is the same one form-less hosts have always had. What is given up is narrower: a
Cursor user whose genuine "decline" lands within 250ms has it read as a dropped prompt instead,
and is asked again in chat.
