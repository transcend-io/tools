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

Before starting, read these reference docs:

- [docs-reference.md](docs-reference.md) -- Transcend documentation links and console commands

This skill uses two custom agents defined in `.cursor/agents/`:

- **consent-triage-researcher** -- web research for tracker classification
- **consent-triage-inspector** -- live site investigation via Chrome DevTools

## Workflow

### Phase 1: Setup

1. Get the consent manager info (the airgap bundle ID is auto-resolved from
   the API key -- you do not need to pass it to any tool):

```
consent_list_airgap_bundles
```

2. Get triage stats to show the user the backlog size:

```
consent_get_triage_stats
```

3. Fetch the customer's configured tracking purposes and regimes:

```
consent_list_purposes   -> save as available_purposes
consent_list_regimes    -> save as configured_regimes
```

This is critical: customers have different purposes configured. Do NOT assume
the defaults (Essential, Functional, Analytics, Advertising, SaleOfInfo) exist.
Use ONLY the purposes returned by `consent_list_purposes` for classification.

The regimes tool now returns real consent experience data including:

- Which purposes can be opted out of per experience
- Which purposes are opted out by default
- Regions, view state, consent expiry settings

Use this to determine the most permissive regime for live site investigation.
Build a mapping of purpose -> which regimes use it.

4. Present the customer's setup to the user:

```
| Purpose         | Slug          | Used in Regimes              |
|-----------------|---------------|------------------------------|
| (from API)      | (from API)    | (cross-ref with regimes)     |
```

5. Present triage stats:

```
| Metric              | Cookies | Data Flows |
|---------------------|---------|------------|
| Needs Review        | X       | Y          |
| Live (Approved)     | X       | Y          |
| Junk                | X       | Y          |
```

6. Ask the user what to triage (cookies, data flows, or both) and confirm the
   batch size (default: 10).

### Phase 2: Fetch Batch

Fetch the next batch of items needing review, sorted by highest traffic first:

```
consent_list_cookies { status: "NEEDS_REVIEW", limit: <batch_size> }

consent_list_data_flows { status: "NEEDS_REVIEW", limit: <batch_size> }
```

Note: `status` is a required parameter. Use `"NEEDS_REVIEW"` for triage
backlog or `"LIVE"` for approved items. The airgap bundle ID is automatically
resolved -- do not pass it.

Present the batch in this table format:

```
| # | Name/Domain | Type | Service | Auto-Purposes | Occurrences | Sites | First Seen |
|---|-------------|------|---------|---------------|-------------|-------|------------|
```

### Phase 3: Research (Parallel Subagents)

Launch the custom agents in parallel. Cursor will auto-delegate to the
matching agent based on the task description.

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

Each subagent should perform **two types of investigation**:

**A) Web Research** (use WebSearch/WebFetch):

- Identify the company (strip subdomains for broader matches, check for acquisitions)
- Research their business model -- ad tech? analytics? CDN? CMP?
- Fetch their privacy/cookie policy for first-party classification evidence
- Search CMP databases: cookiedatabase.org, better.fyi/trackers, Ghostery, Cookiepedia
- Find other companies' cookie policies that classify the same tracker
- Determine: Essential vs Advertising vs Analytics vs Functional vs SaleOfInfo

**B) Live Site Investigation** (use Chrome DevTools MCP):

- Navigate to a site from the bundle using overrides for debugging:
  `https://{site}/#tcm-regime={permissive_regime}&tcm-prompt=Hidden&log=*`
- The regime override should use the most permissive regime where purposes
  default to opted-in (not blocked). Determine this from Phase 1 regime data.
  If all regimes block by default, load the page and run:
  `airgap.optIn(Object.fromEntries(airgap.getRegimePurposes().map(p=>[p,true])))`
- Then verify consent state: `airgap.getConsent().purposes` -- all should be
  `true` or `"Auto"` (except block-by-default purposes).
- Read console logs (`browser_get_console_logs` or DevTools) -- the `log=*`
  override makes airgap emit detailed logs for every request it evaluates,
  including allow/block decisions and purpose lookups. Search these logs for
  the tracker domain to see exactly how airgap classifies and handles it.
- Search page HTML and performance resource entries for the tracker domain
- Identify how it loads: direct `<script>`, tag manager, iframe, dynamic injection
- Inspect ad infrastructure: ad slot divs (`[data-prebid]`, `[data-ad-slot]`), inline
  initialization scripts, window globals (`pbjs`, `googletag`, `adsbygoogle`)
- Check ad config objects for consent integration, autoPageviewPixel, siteId, etc.
- Run `await airgap.getPurposes('{url}')` to see what Transcend classifies it as
- Run `await airgap.isAllowed('{url}')` to check current regulation status

The consent-triage-inspector agent has all the JS evaluation snippets built in.

Each subagent returns a structured finding per item.

### Phase 4: Present Findings

Present all research results in review tables. For each item:

```
### {name/domain}
| Field              | Value                                           |
|--------------------|-------------------------------------------------|
| Type               | Cookie / Data Flow (HOST/REGEX)                 |
| Domain             | `example.com`                                   |
| Service            | Service Name (or "Unknown")                     |
| Current Purposes   | What Transcend auto-classified (if any)          |
| Recommended Purpose| Your research-based recommendation               |
| Confidence         | High / Medium / Low                              |
| How Loaded         | Direct script / Tag manager / iframe / Dynamic   |
| Sites Seen On      | X all-time, Y last week                         |
| Occurrences        | N                                                |
| First/Last Seen    | date / date                                      |
| Evidence           | Brief summary + source URLs                     |
| Recommended Action | APPROVE with purposes / JUNK / NEEDS MANUAL REVIEW |
| Suggested Note     | Description to save to Transcend                 |
```

Then show a summary action table:

```
| # | Name/Domain        | Action  | Purposes                  | Service    | Note            |
|---|--------------------|---------|---------------------------|------------|-----------------|
| 1 | tracker.example.com| APPROVE | Advertising, Analytics    | ExampleCo  | Ad bidding SDK  |
| 2 | junk.extension.io  | JUNK    | --                        | --         | Browser ext     |
| 3 | internal.mysite.com| REVIEW  | Essential?                | Internal   | Needs eng input |
```

Ask the user to confirm, modify, or reject each recommendation before proceeding.

### Phase 5: Push Classifications

For confirmed items, update Transcend using the MCP tools.

For individual updates with notes/descriptions:

```
consent_update_data_flows {
  data_flows: [{ id, tracking_purposes, description, service, status: "LIVE" }]
}

consent_update_cookies {
  cookies: [{ name, tracking_purposes, description, service, status: "LIVE" }]
}
```

For bulk approve/junk without custom descriptions:

```
consent_bulk_triage {
  items: [{ type: "data_flow", id, action: "APPROVE", tracking_purposes }]
}
```

After pushing, report what was updated and show remaining triage count.

### Phase 6: Loop

Ask the user if they want to continue with the next batch. Repeat from Phase 2
until the backlog is cleared or the user stops.

## Tracking Purpose Reference

IMPORTANT: Do NOT hardcode purpose names. Each customer configures their own
purposes. Always use the list from `consent_list_purposes` (fetched in Phase 1).

Common defaults (for reference only -- verify these exist for the customer):

| Purpose     | Typical Use                                         |
| ----------- | --------------------------------------------------- |
| Essential   | Required for site to function (auth, security, CMP) |
| Functional  | Enhanced features (chat, preferences, A/B tests)    |
| Analytics   | Usage measurement (GA, pageview counters)           |
| Advertising | Ad serving, targeting, retargeting, header bidding  |
| SaleOfInfo  | Data sold/shared with third parties for their use   |

Customers may have added custom purposes, renamed defaults, or removed some.
Only recommend purposes that exist in the customer's configuration. If research
suggests a purpose that doesn't exist for this customer, flag it for the user
and suggest the closest match from their available purposes.

Items can have multiple purposes (e.g. `["Advertising", "Analytics"]`).

## Junk Indicators

Mark as JUNK if the tracker is:

- From a browser extension (e.g. Grammarly, LastPass, ad blockers injecting)
- Malware/unwanted injection not placed by the site operator
- Clearly a development/testing artifact
- A subdomain variant of an already-approved regex rule
