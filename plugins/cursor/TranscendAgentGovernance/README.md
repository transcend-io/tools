# Transcend Agent Governance

Cursor plugin for [Transcend Agent Governance](https://transcend.io). Install it to give your IDE governed access to MCP tools through your organization's Agent Governance tenant.

## What it does

- Surfaces **Transcend Agent Governance** inside Cursor as an installable plugin
- Connects Cursor to your tenant's MCP gateway over Streamable HTTP
- Sends a Bearer credential on every request so tool calls stay under your organization's policies
- Keeps environment-specific values (gateway URL, tenant ID, credential) out of the repo — you supply them as plugin variables at install time

## Requirements

You need an active **Transcend Agent Governance** tenant with:

1. A connected agent set up for Cursor (compute mode: Connect)
2. Access to the **Connect Cursor** panel in the Agent Governance dashboard (gateway base URL, tenant ID, and a bound credential)
3. Cursor Desktop with plugin / marketplace support enabled

Ask your Agent Governance administrator if you do not already have a Cursor connected-app credential.

## Where to get the URL and credential

In the **Agent Governance** dashboard:

1. Open the agent you want Cursor to use (or create a connected agent for Cursor).
2. Open the **Connect Cursor** panel (or the agent's credentials / connected-app section).
3. Copy:
   - **Gateway base URL** — scheme + host only (no `/mcp/...` path)
   - **Tenant ID** — your organization identifier
   - **Credential** — a **bound API key** (preferred) or a machine access token

Paste those three values into the plugin's install / configure prompts (`GATEWAY_BASE_URL`, `TENANT_ID`, `CREDENTIAL`). The plugin builds the MCP endpoint as `{gateway}/mcp/{tenant_id}/agent` and sends `Authorization: Bearer {credential}`.

### Prefer an API key for this interim path

Machine JWTs issued for MCP access have a hard **~1 hour TTL and no refresh**. An API key pasted at install stays usable until you rotate or revoke it, so it is the better default until browser sign-in ships.

### This credential path is interim

Browser sign-in (OAuth) will replace pasting a credential once that flow ships. After OAuth is available, prefer sign-in over static API keys or JWTs for day-to-day IDE use.

## Install (local development)

Until the plugin is listed on the Cursor Marketplace, install from this repo:

1. Clone [`transcend-io/tools`](https://github.com/transcend-io/tools).
2. Symlink or copy this plugin into Cursor's local plugins folder:

   ```bash
   ln -s "$(pwd)/plugins/cursor/TranscendAgentGovernance" \
     ~/.cursor/plugins/local/transcend-agent-governance
   ```

3. Reload Cursor (**Developer: Reload Window**).
4. When prompted, set `GATEWAY_BASE_URL`, `TENANT_ID`, and `CREDENTIAL` from the dashboard values above.
5. Confirm the plugin appears as **Transcend Agent Governance** and that MCP tools load (names follow the aggregator's `{slug}__{tool}` convention).

Marketplace install steps will replace the symlink section once the listing is live.

## Verify

- Cursor lists tools from your connected agent under MCP.
- A normal tool call succeeds and appears in the Agent Governance decision / audit log.
- A **policy-denied** tool call returns an error inline in Cursor chat and **does not** disconnect the MCP server. Re-try an allowed tool afterward to confirm the connection stayed up.

## Troubleshooting

- **Server not connecting:** confirm `GATEWAY_BASE_URL` has no trailing path, `TENANT_ID` matches the dashboard, and `CREDENTIAL` is the full secret (API keys typically start with a product-specific prefix).
- **Auth errors / expired token:** if you used a machine JWT, it may have expired (~1h). Create or paste a bound API key instead, or mint a fresh token.
- **Tools missing:** confirm the agent has MCP servers assigned in the dashboard and that you are pointed at the agent bundle URL shape (`…/mcp/{tenant_id}/agent`).

## License

Apache-2.0 — see the repository [`LICENSE`](../../../LICENSE).
