---
name: troubleshoot-policy-denial
description: >-
  Interpret Transcend Rails Agent Controls MCP errors in Claude that look
  like policy denials or approval holds. Use when a governed tool call fails
  with deny, forbidden, unauthorized-for-this-action, require_approval, or
  similar policy language — or when the user asks why a tool was blocked and
  what to tell an admin. Do not use for generic network outages, missing
  servers, or connection failures (use verify-governed-connection for
  those).
---

# Troubleshoot a policy denial

Help the user understand a **policy decision** from Transcend Agent Governance, not a broken Claude connection.

## When this skill applies

Use this skill when MCP tool output or Claude's UI indicates:

- Policy **deny** / **forbidden** / **not allowed** for this action
- **Approval required** / waiting for an approver
- A structured reason or policy message attached to a failed tool call
- The user asks "why was this blocked?" or "what should I tell my admin?"

Do **not** treat every MCP failure as a denial. If tools never appear, the connector shows disconnected, or errors mention an unreachable gateway or the Claude Code sign-in gap, switch to **verify-governed-connection**.

## Distinguish denial vs connection failure

| Signal                                                                          | Likely cause                   | What to tell the user                                                   |
| ------------------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------- |
| Tools list loads; one specific call fails with deny / policy / approval wording | Policy (or approval hold)      | Expected under governance; admin/policy change or approval needed       |
| Tools list empty; connector shows disconnected / errored                        | Connection / gateway / sign-in | See verify-governed-connection — not a deny                             |
| Connected but tools list stays empty                                            | No MCP servers assigned yet    | Fail-closed auto-register; ask admin to assign MCP servers / policy     |
| Intermittent transport errors, timeouts with no policy text                     | Network / gateway availability | Retry later or check gateway health with admin; not a bypass invitation |

If unsure, prefer: "This looks like a **policy decision**; if tools otherwise work, ask your administrator to review policy for this tool and action." Avoid diagnosing internal service names.

## How to read the error

1. Capture the **tool name** and **action** that failed (as shown in Claude).
2. Quote or paraphrase any **reason / message** returned with the failure (do not invent policy IDs).
3. Classify:
   - **Hard deny** — stop; do not retry the same call.
   - **Approval required** — explain that a human must approve; wait or tell the user who can approve in their org process.
4. Summarize in plain language: what was attempted, that Agent Governance blocked or paused it, and that this is intentional.

## What to tell an administrator

Give the user a short handoff they can paste to an admin:

- **Product**: Transcend Rails Agent Controls (Claude plugin / governed MCP)
- **Tool / action attempted** (name as shown in Claude)
- **Outcome**: denied vs approval required
- **Any reason text** returned by the gateway
- **Ask**: adjust policy to allow this use case, or approve the pending request — **not** "turn off the gateway" or "give me a direct MCP URL"

## Forbidden workarounds

Never suggest or perform:

- Adding a second, **ungoverned** MCP server for the same tools
- Pasting a Bearer token / API key into plugin configuration, or using a personal / "dev" token to skip the policy gateway — this plugin has no credential configuration to abuse
- Replaying the denied call with altered arguments solely to evade policy wording
- Disabling the Transcend Rails Agent Controls plugin to "get unblocked"

If the user needs the capability, the path is **policy or approval**, not a side channel.
