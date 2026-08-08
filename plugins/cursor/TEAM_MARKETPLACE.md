# Team Marketplace rollout — Transcend Agent Governance

Private [Cursor Team Marketplaces](https://cursor.com/docs/plugins.md#team-marketplaces) distribute this plugin to Transcend teammates and design partners **without** cloning `transcend-io/tools` or editing `mcp.json` by hand.

This is the dogfood / design-partner path while the public Cursor Marketplace review is pending. It is intentionally separate from public listing.

**Upstream docs:** [Plugins](https://cursor.com/docs/plugins.md) · [Plugins reference](https://cursor.com/docs/reference/plugins.md) · [GitHub integration](https://cursor.com/docs/integrations/github.md)

**Repo packaging:** root [`.cursor-plugin/marketplace.json`](../../.cursor-plugin/marketplace.json) lists `transcend-agent-governance` → `./plugins/cursor/TranscendAgentGovernance`.

---

## Status / blockers

| Item                                 | State                                                                                                                                                       |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plugin stack in `transcend-io/tools` | Landing via stacked PRs (scaffold → MCP → skills → OAuth); Team Marketplace import should track **`main` after merge**                                      |
| Partnership / listing questions      | [LINK-7701](https://linear.app/transcend/issue/LINK-7701) is **Blocked** — confirm whether any Cursor partnership constraint affects Team Marketplace usage |
| This registration                    | **Requires a Transcend Cursor team admin** — engineering cannot finish the dashboard import without that role                                               |

If Team Marketplace is unavailable on the Transcend plan until partnership answers land, keep this runbook and escalate (see bottom).

---

## Prerequisites

### Cursor plan and roles

| Who                                         | Needs                                                                                               |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Transcend org (dogfooding)                  | Cursor **Teams** (≤1 team marketplace) or **Enterprise** (unlimited)                                |
| Design partner org                          | Same — their own Cursor team on Teams or Enterprise                                                 |
| Person who clicks Import                    | Cursor **team admin** (Enterprise: only admins can add marketplaces from **Dashboard → Plugins**)   |
| GitHub App (Auto Refresh / private sources) | Cursor admin **and** GitHub org admin for [Integrations](https://cursor.com/dashboard/integrations) |

`transcend-io/tools` is **public**, so partners can import the marketplace without granting Cursor read access to a private GitHub org. Auto Refresh still works best with the [Cursor GitHub App](https://cursor.com/docs/integrations/github.md) installed so push webhooks re-index the marketplace.

### Repo readiness before import

1. `.cursor-plugin/marketplace.json` is on the branch Cursor will track (prefer `main`).
2. `plugins/cursor/TranscendAgentGovernance/.cursor-plugin/plugin.json` validates (`node scripts/validate-cursor-plugins.mjs` in this repo).
3. Prefer importing **after** the Agent Governance plugin PRs merge so teammates do not install a half-wired plugin.

---

## Part A — Register in the Transcend Cursor team marketplace (admin)

**Actor:** Transcend Cursor team admin  
**Goal:** `transcend-agent-governance` appears under Customize for Transcend teammates; install requires **no** repo clone and **no** JSON edit.

### A1. Connect GitHub (recommended once)

1. Open [Cursor Integrations](https://cursor.com/dashboard/integrations).
2. Connect **GitHub** (or confirm it is already connected).
3. Grant the Cursor GitHub App access to `transcend-io/tools` (Selected or All repositories).
4. Confirm the app is **installed** on the `transcend-io` GitHub org (registering in the dashboard and installing on the org are separate steps).

Skip is possible for a one-shot public import, but Auto Refresh and reliable re-index need the app + repo access.

### A2. Import the marketplace

1. Open **[Dashboard → Plugins](https://cursor.com/dashboard?tab=plugins)** (or **Settings → Plugins**, depending on dashboard chrome).
2. Under **Team Marketplaces**, choose **Add Marketplace** / **Import from Repo**.
3. Paste the GitHub URL:

   ```text
   https://github.com/transcend-io/tools
   ```

4. Select the branch to track (**`main`** once the plugin has merged; do not point dogfood at a long-lived feature branch unless intentionally testing a pre-release).
5. Review the parsed plugins. Confirm **`transcend-agent-governance`** appears with source `./plugins/cursor/TranscendAgentGovernance` (display name **Transcend Agent Governance**).
6. Name the marketplace (suggestion: `Transcend plugins` / id aligned with manifest `transcend-plugins`).
7. Under **Marketplace Settings**:
   - **Marketplace Access** — default “everyone in the team”, or restrict to an [Organization Group](https://cursor.com/docs/enterprise/organization-groups.md) for a smaller dogfood cohort.
   - **Enable Auto Refresh** — **on** (requires GitHub App + webhooks on this repo). Cursor re-indexes at most once every **10 minutes**, batching rapid pushes.
8. Save.

### A3. Set installation mode

For **Transcend Agent Governance** during dogfood:

| Mode                                | When to use                                                              |
| ----------------------------------- | ------------------------------------------------------------------------ |
| **Default Off** (recommended first) | Teammates opt in from Customize; safest while validating OAuth + gateway |
| **Default On**                      | Broader dogfood after clean-machine install works                        |
| **Required**                        | Only after policy/product sign-off — cannot be uninstalled               |

### A4. Smoke-check as admin

1. In Cursor Desktop, open **Customize** in the sidebar.
2. Find **Transcend Agent Governance** under the team marketplace (not only `~/.cursor/plugins/local`).
3. Install (or confirm Default On / Required already applied).
4. Set only `GATEWAY_BASE_URL` and `TENANT_ID` when prompted — **no** credential paste.
5. Complete browser Connect / OAuth; confirm tools load after an Agent Governance admin assigns MCP servers to the auto-registered agent.

### A5. Independent clean-machine verification (acceptance)

Have **someone who did not build the plugin** on a machine/profile with:

- No `~/.cursor/plugins/local/transcend-agent-governance` symlink
- No hand-edited Agent Governance entry in `mcp.json`
- No leftover OAuth tokens for this server

They should only: join the Transcend Cursor team → Customize → Install → set gateway + tenant → browser sign-in.  
Record pass/fail and any friction as follow-up tickets (Part E).

---

## Part B — Clean-machine install path (no clone / no JSON edit)

**Audience:** any developer on a Cursor team that already imported this marketplace.

1. Use Cursor Desktop on a **Teams or Enterprise** team that has the Transcend (or partner) marketplace enabled for your user.
2. Open **Customize** in the sidebar.
3. Locate **Transcend Agent Governance** (team marketplace section).
4. Click **Install** (skip if your admin set **Default On** / **Required**).
5. When prompted for plugin variables, enter:
   - `GATEWAY_BASE_URL` — scheme + host only (from Agent Governance **Connect Cursor**)
   - `TENANT_ID` — tenant identifier from the same panel
6. Open **Settings → Tools & MCP** if Connect did not start automatically; authenticate / **Connect**.
7. Complete browser sign-in and consent.
8. Ask an Agent Governance administrator to assign MCP servers / policy to your auto-registered connected agent (starts empty — fail-closed).
9. Confirm `{slug}__{tool}` tools appear and an allowed call succeeds.

**Do not** clone this repository, symlink into `~/.cursor/plugins/local`, or paste Bearer tokens into `mcp.json` for the default path. Those remain **dev / operator fallback** only (see plugin [README](./TranscendAgentGovernance/README.md)).

---

## Part C — Design-partner rollout

Design partners install from **their** Cursor team marketplace pointing at the same public repo (or a Transcend-blessed fork/tag policy). Transcend does not push plugins into a partner’s Cursor org without their admin.

### C1. What Transcend sends the partner

Share this checklist (email / Notion / ticket):

1. **Cursor plan:** Teams or Enterprise; a **team admin** must perform the import.
2. **Marketplace source:** `https://github.com/transcend-io/tools` (branch `main` unless Transcend names a release branch).
3. **Plugin id / name:** `transcend-agent-governance` / **Transcend Agent Governance**.
4. **Install mode recommendation:** **Default Off** for the first pilot cohort.
5. **Per-developer values** from their Agent Governance tenant (**Connect Cursor** panel):
   - Gateway base URL
   - Tenant ID
6. **Post-auth admin step in Agent Governance:** assign MCP servers / policy to each auto-registered Cursor agent.
7. **Link** to [Transcend Agent Governance plugin README](./TranscendAgentGovernance/README.md) (sign-in, revoke, troubleshooting) and this document.

### C2. Partner admin steps (their Cursor dashboard)

1. Confirm Teams/Enterprise and admin access.
2. Optionally connect GitHub at [Integrations](https://cursor.com/dashboard/integrations) and allow `transcend-io/tools` for Auto Refresh.
3. **Dashboard → Plugins → Add Marketplace / Import from Repo** → paste `https://github.com/transcend-io/tools` → track `main`.
4. Confirm `transcend-agent-governance` parses; set Marketplace Access (pilot group vs whole team).
5. Enable Auto Refresh if the GitHub App is installed.
6. Set installation mode (**Default Off** for pilot).
7. Tell pilot users to follow **Part B**.

### C3. Partner developer steps

Same as **Part B**, using Connect Cursor values for **their** tenant.

### C4. Admin permissions summary

| Surface                                             | Permission                                     |
| --------------------------------------------------- | ---------------------------------------------- |
| Cursor Dashboard → Plugins (add/import marketplace) | Cursor **team admin** (Enterprise: admin-only) |
| Cursor Integrations → GitHub App                    | Cursor admin + GitHub org admin                |
| Marketplace Access / install mode / Refresh         | Cursor team admin                              |
| Agent Governance Connect Cursor values              | Tenant operator / admin                        |
| Assign MCP servers after first OAuth                | Agent Governance administrator                 |
| Install from Customize (Default Off)                | Any team member with marketplace access        |

---

## Part D — Update cadence (version bumps → installed users)

| Mechanism                                   | Behavior                                                                                                                                                                                      | Admin action?                                                        |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Auto Refresh** (recommended)              | Push to the tracked branch re-indexes the marketplace (≤1× / 10 minutes). Manifest + plugin files refresh for the marketplace.                                                                | No, after Auto Refresh is enabled once                               |
| **Manual Refresh**                          | Admin clicks **Refresh** on the marketplace in **Dashboard → Plugins**                                                                                                                        | Yes — use if Auto Refresh is off or stuck                            |
| **Already-installed clients**               | After re-index, Cursor picks up updated plugin content on the client refresh/reload path used by Team Marketplaces (developers may need **Reload Window** / restart if components look stale) | Usually no; escalate if clients stay on old skills/MCP after refresh |
| **New plugins added to `marketplace.json`** | Import-from-repo + Auto Refresh picks up new entries automatically. Marketplaces built by adding plugins one-by-one may need a **re-import** of the repo URL for _new_ plugins                | Re-import only for individually-added marketplaces                   |
| **Install mode / access changes**           | Immediate for who can see/install; does not by itself bump plugin version                                                                                                                     | Admin changes in dashboard                                           |
| **Public Marketplace** (later)              | Each version bump needs Cursor review — slower than Team Marketplace                                                                                                                          | Separate from this runbook                                           |

**Engineering cadence (suggested):**

1. Land plugin changes on `main` via normal PR + `validate-cursor-plugins` CI.
2. Bump `version` in `.cursor-plugin/plugin.json` (and marketplace metadata when useful) on meaningful releases.
3. Rely on Auto Refresh; verify within ~10–15 minutes that Customize shows the new version / behavior.
4. Announce dogfood/design-partner notes in the usual channel when the bump changes MCP URL shape, variables, or OAuth client behavior.

**Does a version bump require partner admins to re-import?**  
No — not if they already imported this repo with Auto Refresh (or they click Refresh). They only re-import when adding a _new_ marketplace or when Cursor support advises resetting a broken index.

---

## Part E — Friction → follow-up ticket suggestions

Capture install-path problems here as ticket seeds (do not absorb silently). This rehearsal feeds the public listing story.

| Friction                                                                 | Suggested follow-up                                                                                                                         |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Transcend Cursor plan cannot add Team Marketplaces / UI missing          | Unblock [LINK-7701](https://linear.app/transcend/issue/LINK-7701); confirm Teams vs Enterprise entitlement with Cursor partnership contacts |
| Admin-only import but no available admin                                 | Ops: grant temporary Cursor admin or pair on a recorded call; do not invent a clone-based “customer” path                                   |
| Import succeeds but `transcend-agent-governance` missing from parse list | Engineering: marketplace.json path / branch / validate script; confirm merge to tracked branch                                              |
| Auto Refresh never updates                                               | Confirm GitHub App installed on `transcend-io` **and** has repo access; check webhooks; fall back to Manual Refresh                         |
| Clean-machine user still told to clone or edit JSON                      | Docs/bug: Customize discovery, Marketplace Access group exclusion, or wrong install mode                                                    |
| Install works; OAuth / discovery fails                                   | Platform tickets (issuer, PRM/AS metadata, redirect allowlist) — not a marketplace packaging issue                                          |
| Tools missing after OAuth                                                | Agent Governance admin assignment gap; document in partner packet (already Part B step 8)                                                   |
| Partner on Free/Pro cannot import                                        | Product: require Teams/Enterprise in partner prerequisites; no unsupported workaround                                                       |
| Required mode locks a bad build onto the fleet                           | Process: never use Required until clean-machine AC passes; add rollback note (Default Off + Refresh)                                        |
| Public listing still blocked while Team path works                       | Continue dogfood on Team Marketplace; public path remains [LINK-7714](https://linear.app/transcend/issue/LINK-7714) / epic parent           |

---

## Ready-to-send: admin registration checklist

Copy/paste for the Transcend Cursor admin:

```text
Subject: Please register Transcend Agent Governance on our Cursor Team Marketplace

Please import our Team Marketplace so teammates can install without cloning or editing JSON.

1) Cursor Dashboard → Integrations
   - Confirm GitHub connected
   - Cursor GitHub App installed on transcend-io with access to transcend-io/tools

2) Cursor Dashboard → Plugins → Team Marketplaces → Add / Import from Repo
   - URL: https://github.com/transcend-io/tools
   - Branch: main   (only after Agent Governance plugin PRs have merged)
   - Confirm plugin: transcend-agent-governance (Transcend Agent Governance)

3) Marketplace Settings
   - Access: whole team OR dogfood Organization Group
   - Enable Auto Refresh: ON

4) Installation mode for transcend-agent-governance
   - Start with Default Off

5) Reply when saved. We will have a non-author verify Install → variables → browser OAuth
   on a clean machine (no ~/.cursor/plugins/local symlink, no mcp.json edits).

Runbook: plugins/cursor/TEAM_MARKETPLACE.md in transcend-io/tools
Plugin README: plugins/cursor/TranscendAgentGovernance/README.md
```

---

## Escalation

Engineering prepared packaging + this runbook. Completing acceptance criterion “registered in the Transcend Cursor team marketplace” needs a human with Cursor admin on the Transcend team (and a green `main` that contains the plugin).

`ESCALATION: Need admin to register Transcend Agent Governance in Cursor Team Marketplace`
