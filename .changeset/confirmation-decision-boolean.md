---
'@transcend-io/mcp-server-base': patch
---

**@transcend-io/mcp-server-base:** Ask for the confirmation decision as a boolean rather than a titled single-select. Cursor answered a select with a value matching neither option's `const`, and because `elicitInput` validates the host's response against the schema it sent, a rendered and answered form was rejected before the gate could read it — an approval became "nobody was asked", and every gated tool fell through to the token fallback or reported a refusal no one made. A checkbox is the narrowest shape a host can get wrong. The warning logged when a host fails to show the form now names the host and client, so the next such failure is attributable.
