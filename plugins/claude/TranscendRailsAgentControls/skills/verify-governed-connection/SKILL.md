---
name: verify-governed-connection
description: >-
  Diagnose Transcend Rails Agent Controls MCP connection health in Claude:
  confirm the policy gateway is reachable and list which governed tools are
  available. Use when tools are missing, the MCP server shows disconnected,
  or the user asks whether Agent Governance is wired correctly — not when a
  listed tool fails with an explicit policy denial (use
  troubleshoot-policy-denial).
---

# Verify governed connection health

Confirm that Claude can reach Transcend Agent Governance through the **policy gateway** at the fixed address this plugin ships (`https://mcp.withrails.ai/mcp/agent`).

## When this skill applies

- No governed tools appear (or the MCP server shows as disconnected / errored)
- Errors mention a failed handshake, a connection timeout, or an unreachable server
- The user asks "is Agent Governance connected?" or "which tools do I have?"
- You need to separate **connection** problems from **per-tool policy denials**

## Known gap: Claude Code sign-in

This plugin's `.mcp.json` points at a **fixed** gateway URL and declares **no** built-in auth configuration — there is no credential-paste variable and no bundled OAuth client. Whether a browser sign-in step runs at all, and whether it succeeds, depends on your organization's Agent Governance gateway and on the Claude surface you are using:

- **Claude Desktop / claude.ai**: Customize → Connectors → Connect can prompt a browser sign-in if the gateway requires one.
- **Claude Code**: browser sign-in to this gateway does **not** work yet. This is a known, tracked gap (see the plugin [README](../../README.md)), not something to work around with a pasted credential.

Do **not** invent a credential-paste path to route around a sign-in failure. If sign-in is the blocker, that is a platform limitation to report, not a connection you should force open.

## Verification checklist

Work through these in order. Prefer Claude's own connector / MCP status surfaces — do not invent hostnames or internal service names.

1. **Plugin installed and enabled**
   Confirm **Transcend Rails Agent Controls** is installed from your org's marketplace (`claude plugin list`, or **Customize → Connectors** in Claude Desktop / claude.ai). There is no org or tenant identifier to configure — the gateway URL is fixed in `.mcp.json`.

2. **Connector status**
   Check whether `transcend-rails-agent-controls` shows as connected. In Claude Desktop / claude.ai, open **Customize → Connectors** and look for **Transcend Rails Agent Controls**; choose **Connect** if it is not already connected. In Claude Code, run `/mcp` to see the server's status. Treat a disconnected or errored state as a connection problem first, not a policy denial.

3. **List available tools**
   Ask what MCP tools are registered for this server, or check Claude's tool list.

   An **empty tool list on an otherwise-connected server** often means the auto-registered connected agent still has **no MCP servers assigned** in Agent Governance (fail-closed). That is an admin assignment step, not a broken install — escalate with what you observed (connected vs not, tools empty vs populated).

4. **Smoke a low-risk list/read tool (optional)**
   If a harmless discovery tool is available, call it once.
   - Success → connection is healthy; later denials are likely policy (hand off to **troubleshoot-policy-denial**).
   - Immediate connection/auth failure → gateway reachability or the Claude Code sign-in gap above.
   - Explicit deny on that tool → policy, not "gateway down."

## Reporting back to the user

Be concrete and short:

- Connected or not, per Claude's connector / `/mcp` status
- How many / which tools are visible (names only)
- Whether the failure looks like a **connection problem** (unreachable gateway, Claude Code sign-in gap), **connected but no MCP servers assigned yet**, or **healthy connection with a policy deny**
- Next step: retry Connect, ask an Agent Governance admin to assign MCP servers / policy, or open a policy/approval conversation

## Forbidden workarounds

While troubleshooting connection health:

- **Do not** add an ungoverned direct MCP server as a substitute
- **Do not** collect, paste, or reuse alternate tokens that skip Agent Governance
- **Do not** tell the user to put a Bearer token or API key into plugin configuration — this plugin has none
- **Do not** disable the plugin to "prove" tools work without governance

The goal is a healthy **governed** connection — not an ungated path to the same tools.
