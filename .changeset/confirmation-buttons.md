---
'@transcend-io/mcp-server-base': patch
---

**@transcend-io/mcp-server-base:** Ask for the confirmation decision with no form fields at all, and read it from the host's accept and decline buttons. This replaces the checkbox described in 1.3.1, which itself replaced a titled select.

Both earlier shapes asked the user for a second gesture after the button they had already pressed, and both could be answered wrongly. `elicitInput` validates the host's answer against the schema it sent, so a rejected answer reaches the gate as "nobody was asked" — a rendered, approved form reported as a refusal, with every gated tool then falling through to the token fallback. Cursor hit that with the select by answering with a value matching neither option's `const`; a host answering the checkbox's `true` as a string would have fared no better. Requesting nothing leaves no shape to get wrong: the SDK only validates a non-empty `content`, and a schema with no properties and no required fields has nothing to reject.

`ElicitResult.action` already carried the decision, and the gate already read `decline` and `cancel` from it, so only the redundant field is gone. An `accept` is now the approval outright, whatever the host puts in `content`. That does mean a host returning `accept` without putting the question to anybody has approved on the user's behalf, which is the same trust the HTTP policy in 1.5.0 already documents — a client could equally have ticked the checkbox itself. What the gate still enforces is that the host was asked, and that no token is ever issued for a model to relay.

Verified in Cursor: the prompt renders as the tool's hint plus Accept and Cancel, accepting runs the action, and dismissing returns `CONFIRMATION_CANCELLED` without running it. Note that Cursor maps its Cancel to the protocol's `cancel`, so `CONFIRMATION_DECLINED` is reachable only from hosts that offer a distinct decline.
