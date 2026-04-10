---
name: consent-triage
description: >-
  Triage cookies and data flows in Transcend Consent Manager. Fetches triage
  backlog, researches trackers in parallel batches, presents findings for user
  review, and pushes classifications back to Transcend. Use when the user
  mentions cookie triage, data flow triage, consent triage, classify trackers,
  or consent manager cleanup.
---

# Consent Triage

Systematically research and classify cookies and data flows discovered by
Transcend's consent telemetry, then push approved classifications back.

Before starting, read the documentation links in
[docs-reference.md](docs-reference.md).

## MCP Prompts and Resources

This skill's workflow, research methodology, and classification reference are
defined as MCP prompts and resources in the consent MCP server. Use them as
the canonical source of truth:

- **`consent-triage`** prompt -- the full 6-phase workflow (setup, fetch, research, review, push, loop)
- **`consent-research-tracker`** prompt -- research methodology for classifying a tracker
- **`consent-inspect-site`** prompt -- live site investigation via browser DevTools

Resources (fetched live from docs.transcend.io with static fallback):

- **Tracking Purposes** -- purpose definitions and classification reference
- **Triage Guide** -- full triage workflow documentation
- **Debugging & Testing** -- URL overrides, console commands, testing methodology
- **Data Flows & Cookies** -- how telemetry discovers and regulates trackers
- **Telemetry Overview** -- collection methods and data flow types

Use `FetchMcpResource` to pull these into context, or invoke prompts with `CallMcpTool`.

## Cursor-Specific Orchestration

This skill uses two custom agents defined in `.cursor/agents/`:

- **consent-triage-inspector** -- live site investigation via Chrome DevTools
- **consent-triage-researcher** -- web research for tracker classification

### Phase 1: Setup

Call these MCP tools in parallel to gather the customer's configuration:

```
consent_list_airgap_bundles
consent_get_triage_stats
consent_list_purposes   -> save as available_purposes
consent_list_regimes    -> save as configured_regimes
```

This is critical: customers have different purposes configured. Do NOT assume
the defaults (Essential, Functional, Analytics, Advertising, SaleOfInfo) exist.
Use ONLY the purposes returned by `consent_list_purposes` for classification.

From the regimes data, determine the most permissive regime (fewest opted-out
purposes) -- needed for live site investigation.

Present the customer's setup and triage stats, then ask what to triage
(cookies, data flows, or both) and confirm the batch size (default: 10).

### Phase 2: Fetch Batch

Fetch the next batch of items needing review, sorted by highest traffic:

```
consent_list_cookies { status: "NEEDS_REVIEW", limit: <batch_size> }
consent_list_data_flows { status: "NEEDS_REVIEW", limit: <batch_size> }
```

### Phase 3: Research (Parallel Subagents)

Launch the custom agents in parallel via the Task tool. Cursor will
auto-delegate to the matching agent based on the task description.

Spawn pattern for a batch of N items:

- **2+ consent-triage-researcher** agents: split items into groups of 3-5,
  provide each group as a table with id, domain, type, service, occurrences.
  MUST also pass the customer's available purposes and regime-purpose mapping
  from Phase 1 so the researcher only recommends valid purposes.
- **1 consent-triage-inspector** agent: provide all tracker domains + the
  site URL with regime override parameters

All agents run as background tasks (`is_background: true`) in parallel.

IMPORTANT: The bundle name (e.g. "acme-platform") may be a platform
provider, not the actual site with trackers. If the main domain is a corporate
page, find a real client site from the homepage and use that instead.

### Phase 4: Present Findings

Present all research results in review tables. See the `consent-triage`
MCP prompt for the recommended presentation format.

Ask the user to confirm, modify, or reject each recommendation before
proceeding.

### Phase 5: Push Classifications

For confirmed items, update Transcend using the MCP tools:

- `consent_update_data_flows` / `consent_update_cookies` for individual updates with notes
- `consent_bulk_triage` for bulk approve or junk

After pushing, report what was updated and show remaining triage count.

### Phase 6: Loop

Ask the user if they want to continue with the next batch. Repeat from Phase 2
until the backlog is cleared or the user stops.
