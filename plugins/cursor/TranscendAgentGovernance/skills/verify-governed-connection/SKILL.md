---
name: verify-governed-connection
description: >-
  Diagnose Transcend Agent Governance MCP connection health: confirm the
  policy gateway is reachable, list which governed tools are available, and
  recognise expired or invalid credentials. Use when tools are missing, the
  MCP server shows disconnected, auth fails at connect time, or the user asks
  whether Agent Governance is wired correctly — not when a listed tool fails
  with an explicit policy denial (use troubleshoot-policy-denial).
---

# Verify governed connection health

Confirm that Cursor can reach Transcend Agent Governance through the **policy gateway**, and that credentials are still valid.

## When this skill applies

- No governed tools appear (or the MCP server shows as disconnected / errored)
- Errors mention authentication, unauthorized at **connect** time, expired token, invalid credential, or failed handshake
- The user asks "is Agent Governance connected?" or "which tools do I have?"
- You need to separate **install / credential** problems from **per-tool policy denials**

## Verification checklist

Work through these in order. Prefer Cursor's MCP / plugin UI and the tools Cursor already exposes — do not invent hostnames or internal service names.

1. **Plugin installed and enabled**  
   Confirm **Transcend Agent Governance** is installed. If plugin variables (gateway URL, tenant, credential) are required, confirm they are set in **Plugins → Configure** (or the install prompt) — not pasted into chat.

2. **Gateway connection**  
   Check whether the governed MCP server shows as connected. If it is disconnected, treat this as a connection problem first (URL, network, credential), not a policy denial.

3. **List available tools**  
   Use Cursor's MCP tool listing (or ask the agent tooling surface which MCP tools are registered for this server). Note the tool names you see. An empty list with a "connected" server can still mean auth or tenant misconfiguration — escalate to an admin with what you observed.

4. **Credential freshness**  
   Short-lived credentials expire. Signs of an **expired or invalid credential**:
   - Suddenly disconnected after working earlier in the session
   - 401 / unauthorized / invalid token style errors at connect or on every call
   - Tools disappear after roughly the credential lifetime your admin configured

   Tell the user to refresh the credential in the plugin configuration (or obtain a new one from their Agent Governance administrator). Do **not** suggest a personal or alternate token meant to bypass the gateway.

5. **Smoke a low-risk list/read tool (optional)**  
   If a harmless discovery tool is available, call it once.  
   - Success → connection is healthy; later denials are likely policy (hand off to **troubleshoot-policy-denial**).  
   - Immediate auth failure → credential / connection.  
   - Explicit deny on that tool → policy, not "gateway down."

## Reporting back to the user

Be concrete and short:

- Connected or not
- How many / which tools are visible (names only)
- Whether the failure looks like **expired credential**, **misconfigured gateway URL/tenant**, or **healthy connection with a policy deny**
- Next step: fix plugin variables, ask admin for a new credential, or open a policy/approval conversation

## Forbidden workarounds

While troubleshooting connection health:

- **Do not** add an ungoverned direct MCP server as a substitute
- **Do not** collect or reuse alternate credentials that skip Agent Governance
- **Do not** disable the plugin to "prove" tools work without governance

The goal is a healthy **governed** connection — not an ungated path to the same tools.
