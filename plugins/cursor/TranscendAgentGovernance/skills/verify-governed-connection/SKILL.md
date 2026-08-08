---
name: verify-governed-connection
description: >-
  Diagnose Transcend Agent Governance MCP connection health: confirm the
  policy gateway is reachable, list which governed tools are available, and
  recognise expired or failed browser OAuth sessions. Use when tools are
  missing, the MCP server shows disconnected, auth fails at connect time, or
  the user asks whether Agent Governance is wired correctly — not when a listed
  tool fails with an explicit policy denial (use troubleshoot-policy-denial).
---

# Verify governed connection health

Confirm that Cursor can reach Transcend Agent Governance through the **policy gateway**, and that the browser OAuth session (access + refresh tokens held by Cursor) is still valid.

## When this skill applies

- No governed tools appear (or the MCP server shows as disconnected / errored)
- Errors mention authentication, unauthorized at **connect** time, expired token, refresh failure, or failed handshake
- The user asks "is Agent Governance connected?" or "which tools do I have?"
- You need to separate **install / OAuth** problems from **per-tool policy denials**

## Auth model (do not invent a credential-paste path)

Primary path is Cursor-native **browser OAuth**:

- Plugin variables are **only** `GATEWAY_BASE_URL` and `TENANT_ID` (set in Plugins → Configure / install prompt)
- The plugin declares public client id `myelin_cursor_plugin` with scopes `mcp` and `offline_access` (no client secret)
- Tokens live in the IDE session; Cursor refreshes via the refresh grant until absolute lifetime or revoke

There is **no** credential / Bearer / API-key plugin variable. Do **not** tell users to paste a token into plugin configuration.

## Verification checklist

Work through these in order. Prefer Cursor's MCP / plugin UI and the tools Cursor already exposes — do not invent hostnames or internal service names.

1. **Plugin installed and enabled**  
   Confirm **Transcend Agent Governance** is installed. Confirm plugin variables `GATEWAY_BASE_URL` and `TENANT_ID` are set in **Plugins → Configure** (or the install prompt) — not pasted into chat. Do not ask for a third "credential" variable; it does not exist.

2. **Gateway connection / Connect**  
   Check whether the governed MCP server shows as connected. If it is disconnected or never authenticated, open **Settings → Tools & MCP**, find **transcend-agent-governance**, and choose **Connect** / authenticate so the browser OAuth flow can run. Treat this as a connection / auth problem first (URL, network, OAuth), not a policy denial.

3. **List available tools**  
   Use Cursor's MCP tool listing (or ask the agent tooling surface which MCP tools are registered for this server). Note the tool names you see.

   An **empty tool list after successful OAuth** often means the auto-registered connected agent still has **no MCP servers assigned** (fail-closed). That is an admin assignment step, not a broken install — escalate with what you observed (connected vs not, OAuth completed or not).

4. **OAuth / session freshness**  
   Access tokens are short-lived; Cursor should refresh via `offline_access` without re-consent. Signs of an **expired or invalid session**:
   - Suddenly disconnected after working earlier
   - 401 / unauthorized / invalid token style errors at connect or on every call
   - Refresh failure / absolute lifetime exhausted / admin revoked the grant

   Tell the user to **re-run Connect** (browser re-auth) in Settings → Tools & MCP. Do **not** suggest pasting a credential into plugin variables, or a personal / alternate token meant to bypass the gateway.

5. **Smoke a low-risk list/read tool (optional)**  
   If a harmless discovery tool is available, call it once.
   - Success → connection is healthy; later denials are likely policy (hand off to **troubleshoot-policy-denial**).
   - Immediate auth failure → OAuth / connection (re-run Connect).
   - Explicit deny on that tool → policy, not "gateway down."

## Reporting back to the user

Be concrete and short:

- Connected or not; whether browser OAuth completed
- How many / which tools are visible (names only)
- Whether the failure looks like **needs re-auth (Connect)**, **misconfigured gateway URL/tenant**, **connected but no MCP servers assigned yet**, or **healthy connection with a policy deny**
- Next step: fix `GATEWAY_BASE_URL` / `TENANT_ID`, re-run Connect, ask admin to assign MCP servers / policy, or open a policy/approval conversation

## Forbidden workarounds

While troubleshooting connection health:

- **Do not** add an ungoverned direct MCP server as a substitute
- **Do not** collect, paste, or reuse alternate tokens that skip Agent Governance
- **Do not** tell the user to put a Bearer token or API key into plugin variables
- **Do not** disable the plugin to "prove" tools work without governance

The goal is a healthy **governed** connection — not an ungated path to the same tools.
