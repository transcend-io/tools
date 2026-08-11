---
name: troubleshoot-policy-denial
description: >-
  Interpret Transcend Agent Governance MCP errors that look like policy denials
  or approval holds. Use when a governed tool call fails with deny, forbidden,
  unauthorized-for-this-action, require_approval, or similar policy language —
  or when the user asks why a tool was blocked and what to tell an admin.
  Do not use for generic network outages, missing servers, or expired OAuth
  sessions (use verify-governed-connection for those).
---

# Troubleshoot a policy denial

Help the user understand a **policy decision** from Transcend Agent Governance, not a broken IDE connection.

## When this skill applies

Use this skill when MCP tool output or Cursor UI messaging indicates:

- Policy **deny** / **forbidden** / **not allowed** for this action
- **Approval required** / waiting for an approver
- A structured reason or policy message attached to a failed tool call
- The user asks "why was this blocked?" or "what should I tell my admin?"

Do **not** treat every MCP failure as a denial. If tools never appear, auth fails at connect time, or errors mention expired OAuth / refresh failure / connection refused, switch to **verify-governed-connection**.

## Distinguish denial vs connection failure

| Signal                                                                          | Likely cause                   | What to tell the user                                                                 |
| ------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------- |
| Tools list loads; one specific call fails with deny / policy / approval wording | Policy (or approval hold)      | Expected under governance; admin/policy change or approval needed                     |
| Tools list empty; server shows disconnected / auth error / 401 at session start | Connection or OAuth session    | Re-run Connect (browser re-auth); check `GATEWAY_BASE_URL` / `TENANT_ID` — not a deny |
| Connected after OAuth but tools list stays empty                                | No MCP servers assigned yet    | Fail-closed auto-register; ask admin to assign MCP servers / policy                   |
| Intermittent transport errors, timeouts with no policy text                     | Network / gateway availability | Retry later or check gateway health with admin; not a bypass invitation               |

If unsure, prefer: "This looks like a **policy decision**; if tools otherwise work, ask your administrator to review policy for this tool and action." Avoid diagnosing internal service names.

## How to read the error

1. Capture the **tool name** and **action** that failed (as shown in Cursor).
2. Quote or paraphrase any **reason / message** returned with the failure (do not invent policy IDs).
3. Classify:
   - **Hard deny** — stop; do not retry the same call.
   - **Approval required** — explain that a human must approve; wait or tell the user who can approve in their org process.
4. Summarize in plain language: what was attempted, that Agent Governance blocked or paused it, and that this is intentional.

## What to tell an administrator

Give the user a short handoff they can paste to an admin:

- **Product**: Transcend Agent Governance (Cursor plugin / governed MCP)
- **Tool / action attempted** (name as shown in Cursor)
- **Outcome**: denied vs approval required
- **Any reason text** returned by the gateway
- **Ask**: adjust policy to allow this use case, or approve the pending request — **not** "turn off the gateway" or "give me a direct MCP URL"

## Forbidden workarounds

Never suggest or perform:

- Adding a second, **ungoverned** MCP server for the same tools
- Pasting a Bearer token / API key into plugin variables, or using a personal / "dev" token to skip the policy gateway
- Replaying the denied call with altered arguments solely to evade policy wording
- Disabling the Transcend Agent Governance plugin to "get unblocked"

If the user needs the capability, the path is **policy or approval**, not a side channel.
