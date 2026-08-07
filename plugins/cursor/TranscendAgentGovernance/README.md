# Transcend Agent Governance

Cursor plugin for [Transcend Agent Governance](https://transcend.io). Install it, sign in with your browser, and use governed MCP tools from your organization's Agent Governance tenant — without pasting tokens.

## What it does

- Surfaces **Transcend Agent Governance** inside Cursor as an installable plugin
- Connects Cursor to your tenant's MCP gateway over Streamable HTTP
- Uses Cursor-native **browser OAuth** (public client + PKCE) so credentials stay in the IDE session
- Keeps environment-specific values (gateway URL, tenant ID) out of the repo — you supply them as plugin variables at install time

This plugin does **not** bundle Transcend's separate DD&C MCP packages, and it does **not** reuse `app.transcend.io` OAuth. Sign-in is against your Agent Governance authorization server discovered from the gateway URL.

## Requirements

You need:

1. An active **Transcend Agent Governance** tenant
2. The **gateway base URL** and **tenant ID** from the **Connect Cursor** panel in the Agent Governance dashboard
3. Cursor Desktop with plugin / marketplace support and remote MCP OAuth enabled
4. A deployed Agent Governance environment that supports delegated OAuth (authorization code + PKCE), gateway discovery metadata, and — for session durability past the access-token TTL — refresh tokens

Ask your Agent Governance administrator for the Connect Cursor values if you do not already have them.

## Install → sign in → tools

Prefer a **Team Marketplace** (or later public Marketplace) install. That path needs **no** repo clone and **no** `mcp.json` editing. Admins: see [Team Marketplace rollout](../TEAM_MARKETPLACE.md).

### Team Marketplace (dogfood / design partners)

Your Cursor team admin imports [`transcend-io/tools`](https://github.com/transcend-io/tools) once as a [Team Marketplace](https://cursor.com/docs/plugins.md#team-marketplaces) (Teams or Enterprise plan). Then:

1. Open **Customize** in the Cursor sidebar.
2. Find **Transcend Agent Governance** under your team's marketplace and **Install** (skip if your admin set Default On / Required).
3. When prompted, set:
   - `GATEWAY_BASE_URL` — scheme + host only (no `/mcp/...` path)
   - `TENANT_ID` — your organization identifier
4. Open **Settings → Tools & MCP**. Find **transcend-agent-governance** and choose **Connect** / authenticate if Cursor has not already opened the browser.
5. Complete sign-in and consent in the browser (pick your tenant if asked). Cursor receives tokens; no client secret is involved.
6. Confirm tools appear (names follow the aggregator's `{slug}__{tool}` convention).

The plugin builds the MCP endpoint as `{gateway}/mcp/{tenant_id}/agent` and declares the published public OAuth client id `myelin_cursor_plugin` with scopes `mcp` and `offline_access`. Cursor discovers the authorization server from the gateway (Protected Resource Metadata → Authorization Server Metadata) and performs PKCE.

### Public Marketplace (when listed)

Same Customize → Install flow as Team Marketplace once the plugin is listed at [cursor.com/marketplace](https://cursor.com/marketplace). Until then, use Team Marketplace for real installs.

### Local development (engineers only)

Use this only while developing the plugin itself — not for teammates or design partners:

1. Clone [`transcend-io/tools`](https://github.com/transcend-io/tools).
2. Symlink or copy this plugin into Cursor's local plugins folder:

   ```bash
   ln -s "$(pwd)/plugins/cursor/TranscendAgentGovernance" \
     ~/.cursor/plugins/local/transcend-agent-governance
   ```

3. Reload Cursor (**Developer: Reload Window**).
4. Set `GATEWAY_BASE_URL` and `TENANT_ID`, then complete the browser sign-in flow above.

### After first sign-in

First successful authorization auto-registers a **connected agent** for your user in the tenant (empty MCP server assignment by default — fail-closed). An administrator must assign MCP servers / policy before tools appear. Repeat authorizations for the same user + client reuse that agent; they do not mint duplicates.

## Session durability and revoke

| Event                                                | Expected behavior                                                                                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Access token nears expiry                            | Cursor refreshes using the refresh token (`offline_access` / delegated refresh). No re-consent prompt.                                |
| Cursor restart                                       | Session resumes from the IDE-held tokens; no browser re-auth if the refresh grant is still valid.                                     |
| Refresh failure / expired absolute lifetime          | Fail-closed: Cursor surfaces an auth failure and prompts re-authorization. No silent downgrade to a pasted credential.                |
| Admin **revokes credentials** on the connected agent | Subsequent MCP calls fail auth; Cursor should prompt re-authorization. The agent record can remain; reconnecting creates a new grant. |
| Admin **disconnects** the agent                      | Credentials revoked and the agent terminated; re-auth may provision a new connected agent depending on platform policy.               |
| Policy-denied tool call                              | Inline error in chat; the MCP server stays connected. Retry an allowed tool afterward.                                                |

Token TTLs and refresh windows are owned by the Agent Governance issuer (short-lived access JWT; refresh with rotate-on-use and absolute lifetime). Publishing `myelin_cursor_plugin` is safe: there is **no client secret** in this plugin.

## Manual verification plan (clean machine)

Live Cursor against a deployed environment may be unavailable in CI. Use this checklist on a clean machine (or a profile with no prior Agent Governance credentials):

1. **Clean state** — Remove any existing Agent Governance MCP entries and local plugin symlink/credentials for this server. Quit and relaunch Cursor. Do **not** leave a `~/.cursor/plugins/local` symlink if you are verifying the Team Marketplace path.
2. **Install** — Prefer Team Marketplace install from Customize ([rollout runbook](../TEAM_MARKETPLACE.md)). Confirm install prompts ask only for `GATEWAY_BASE_URL` and `TENANT_ID` (no credential paste, no `mcp.json` edit, no repo clone).
3. **Configure** — Enter gateway + tenant from the Connect Cursor panel of a deployed-dev (or staging) tenant that has 3LO + discovery enabled.
4. **Browser sign-in** — Trigger Connect; browser opens to the Agent Governance consent / sign-in UI; complete consent. Confirm redirect returns to Cursor (`http://localhost:8787/callback` or the Cursor deep-link / web callback).
5. **Auto-register** — In the dashboard, confirm a connected agent appeared for your user (display name like `Cursor — {user}`) with no MCP servers until an admin assigns them.
6. **Assign tools** — Admin assigns at least one MCP server / allow policy to that agent.
7. **Tools load** — Cursor lists `{slug}__{tool}` tools under MCP.
8. **Allowed call** — Invoke an allowed tool; confirm success and an audit / decision log entry attributing tenant, agent, and tool (e.g. `mcp.authz.allowed`).
9. **Denied call** — Invoke a policy-denied tool; confirm an inline error **without** MCP disconnect; retry an allowed tool.
10. **Restart** — Quit Cursor fully and reopen; confirm tools still work without a new browser consent (refresh path).
11. **Revoke** — From the dashboard, revoke credentials on the connected agent; confirm the next tool call surfaces an auth failure and re-auth is required (not a generic silent hang).
12. **Friction** — File follow-up tickets for any Cursor `auth`-block or issuer/discovery blockers rather than adding a second primary credential path in the plugin.

**Escalate as a design blocker only if** Cursor's native `auth` block cannot complete against the Agent Governance issuer after discovery and redirect allowlist are correct (then consider a stdio-bridge fallback in a follow-up).

## Operator fallback (manual credential — not the default)

Browser sign-in is the **primary** path. Do **not** paste API keys or machine JWTs into plugin install prompts.

If you must use a static Bearer credential (automation, demos without OAuth, or debugging), configure a **separate** user or project `mcp.json` entry yourself with `headers.Authorization` and a dashboard-minted bound API key. That path is outside this plugin's install variables on purpose so it is not a second competing "Connect" flow. Prefer a bound API key over a short-lived machine JWT (~1h, no refresh).

## Troubleshooting

- **Browser never opens / Connect stuck:** confirm Cursor remote MCP OAuth is available in your build; confirm `GATEWAY_BASE_URL` has no trailing path and points at the MCP gateway host (not the dashboard origin).
- **Discovery / authorize errors:** the gateway must advertise Protected Resource Metadata and the issuer must advertise Authorization Server Metadata (including PKCE S256). Ask your admin whether delegated OAuth is enabled for the environment.
- **Redirect URI mismatch:** the platform public client allowlists `http://localhost:8787/callback` (host must be `localhost`, not `127.0.0.1`), plus Cursor deep-link and web callbacks.
- **Tools missing after sign-in:** the auto-registered agent starts with **no** MCP servers. An administrator must assign servers / policy.
- **Auth errors after revoke or long idle:** re-run Connect / authenticate; do not paste a credential into the plugin as a workaround unless you intentionally use the operator fallback above.
- **Tenant mismatch:** the `TENANT_ID` in the MCP URL must match the tenant chosen at consent; mismatch fails closed.

## License

Apache-2.0 — see the repository [`LICENSE`](../../../LICENSE).
