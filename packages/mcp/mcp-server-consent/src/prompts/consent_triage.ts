import type { PromptDefinition } from '@transcend-io/mcp-server-base';

export const consentTriagePrompt: PromptDefinition = {
  name: 'consent-triage',
  description:
    'Systematically triage cookies and data flows discovered by Transcend consent telemetry. ' +
    'Cookies use a fast local-metadata path into consent_cookie_triage_review_app; ' +
    'data flows use batch research, review, and classification push.',
  arguments: [
    {
      name: 'triage_type',
      description: 'What to triage: "cookies", "data_flows", or "both" (default: "both")',
      required: false,
    },
    {
      name: 'batch_size',
      description:
        'Number of items per batch for data flows / markdown cookie review (default: 10)',
      required: false,
    },
  ],
  handler: (args) => {
    const triageType = args.triage_type || 'both';
    const batchSize = args.batch_size || '10';

    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Triage ${
            triageType === 'both' ? 'cookies and data flows' : triageType
          } in batches of ${batchSize}. For cookies destined for consent_cookie_triage_review_app, use the fast local-metadata path and pass a flat unsorted projected list — the app groups by purpose and sorts by traffic. For data flows (or markdown cookie review), prefer highest traffic first.`,
        },
      },
      {
        role: 'assistant',
        content: {
          type: 'text',
          text: `I'll walk through the consent triage workflow. Here's how it works:

## Phase 1: Setup

Gather the customer's consent configuration by calling these tools in parallel:

1. \`consent_list_airgap_bundles\` — get the consent manager info (bundle ID is auto-resolved)
2. \`consent_get_inventory_stats\` — backlog overview
3. \`consent_list_purposes\` — the customer's configured tracking purposes
4. \`consent_list_regimes\` — consent experiences with regions, purposes, and opt-out defaults

CRITICAL: Each customer configures their own purposes. Do NOT assume defaults exist. Only use purposes returned by \`consent_list_purposes\` for classification.

From the regimes data, determine:
- Which purposes can be opted out of per experience
- Which purposes default to opted-out
- The most permissive regime (fewest opted-out purposes) — needed for live site investigation

Present the customer's setup:

| Purpose | Slug | Used in Regimes |
|---------|------|-----------------|
| (from API) | (from API) | (cross-ref with regimes) |

Present triage stats from \`consent_get_inventory_stats\` (cookie and data-flow counts match the Consent Manager tables; CSP data flows are omitted like the UI):

| Metric | Cookies | Data Flows |
|--------|---------|------------|
| Needs Review | cookies.needReviewCount | dataFlows.needReviewCount |
| Live (Approved) | cookies.liveCount | dataFlows.liveCount |
| Junk | cookies.junkCount | dataFlows.junkCount |

## Phase 2: Fetch Batch

Fetch the next batch of items needing review:

${[
  triageType === 'cookies' || triageType === 'both'
    ? '- Cookies for `consent_cookie_triage_review_app`: `consent_list_cookies { status: "NEEDS_REVIEW", first: 100 }` — **omit** `orderField` / `orderDirection` and **do not** filter by `trackingPurposes`. Paginate with `offset` only if needed (cap ~600 for one app open). Immediately project each row to slim fields: `name`, `id`, `service` (`service.title`), `trackingPurposes`, `occurrences`, `lastActivityAt` (from `lastDiscoveredAt`). Drop nested `purposes` / `domains` / owners / teams / attributes.\n- Cookies for markdown-only review (no MCP App): `consent_list_cookies { status: "NEEDS_REVIEW", first: ' +
      batchSize +
      ', orderField: "occurrences", orderDirection: "DESC" }`'
    : '',
  triageType === 'data_flows' || triageType === 'both'
    ? '- Data flows: `consent_list_data_flows { status: "NEEDS_REVIEW", first: ' +
      batchSize +
      ', orderField: "occurrences", orderDirection: "DESC" }` (highest traffic first)'
    : '',
]
  .filter(Boolean)
  .join('\n')}

For data flows (or markdown cookie review), present in this table format:

| # | Name/Domain | Type | Service | Auto-Purposes | Occurrences | Sites | First Seen |
|---|-------------|------|---------|---------------|-------------|-------|------------|

## Phase 3: Classify

### Cookies → MCP App (fast path — default)

Optimize for opening the UI quickly. **Do not** web-search, spawn sub-agents, or use \`consent-research-tracker\` / \`consent-inspect-site\` unless the user explicitly asks for deep research.

Classify in **one pass** (or chunks of ~50 if the list is huge) from the projected fields only. Heuristic-first:

- **approve** — well-known name/service patterns (e.g. \`_ga\`/\`_gid\` → Analytics; \`_fbp\` → Advertising; \`transcend_*\` → Essential CMP; clear session/auth/CSRF cookies)
- **junk** — noise, duplicate, test artifact, or not a real tracker
- **review** — opaque name, missing service, or conflicting signals

Use short stock \`reason\` phrases (≤80 chars); unique essays per cookie are unnecessary.

Then call \`consent_cookie_triage_review_app\` **once** with:

- \`organizationName\` from \`admin_get_organization\`
- \`cookies\` as an **ungrouped** projected array — do not bucket by purpose or sort by traffic
- Each cookie: \`name\`, \`suggestion\`, \`reason\`, and preferably \`trackingPurposes\`, \`occurrences\`, \`id\`, \`service\`, \`lastActivityAt\`

Example:

\`\`\`json
{
  "organizationName": "Acme Corp",
  "cookies": [
    {
      "name": "_ga",
      "trackingPurposes": ["Analytics"],
      "occurrences": 12000,
      "suggestion": "approve",
      "reason": "Known Google Analytics cookie."
    }
  ]
}
\`\`\`

The tool groups by primary purpose, sorts by traffic, and opens an interactive review UI on MCP App hosts. After the user reviews, push confirmed changes with \`consent_update_cookies\` or \`consent_bulk_triage\`.

### Data flows (or markdown cookie review)

For each item in the batch, research its purpose using web search and CMP databases.
Use the \`consent-research-tracker\` prompt for detailed research methodology.
If browser/DevTools access is available, use the \`consent-inspect-site\` prompt for live site investigation.

Split items into parallel research groups of 3–5 items each for efficiency.

For each researched item, decide:
- **approve** — vendor/docs clearly identify the tracker and its consent purpose
- **junk** — noise, duplicate, test artifact, or not a real tracker
- **review** — conflicting sources, unknown vendor, or low confidence

Include a one-sentence **reason** citing the evidence.

## Phase 4: Present Findings (data flows / markdown)

When the MCP App host is unavailable for cookies, or when triaging data flows, present findings in markdown:

For each researched item, present:

### {name/domain}
| Field | Value |
|-------|-------|
| Type | Cookie / Data Flow (HOST/REGEX) |
| Domain | \`example.com\` |
| Service | Service Name (or "Unknown") |
| Current Purposes | What Transcend auto-classified (if any) |
| Recommended Purpose | Research-based recommendation |
| Confidence | High / Medium / Low |
| How Loaded | Direct script / Tag manager / iframe / Dynamic |
| Occurrences | N |
| Evidence | Brief summary + source URLs |
| Recommended Action | APPROVE with purposes / JUNK / NEEDS MANUAL REVIEW |
| Suggested Note | Description to save to Transcend |

Then show a summary action table:

| # | Name/Domain | Action | Purposes | Service | Note |
|---|-------------|--------|----------|---------|------|

Ask the user to confirm, modify, or reject each recommendation before proceeding.

## Phase 5: Push Classifications

For confirmed items, update Transcend:

- Individual updates with notes: \`consent_update_data_flows\` / \`consent_update_cookies\` with id, tracking_purposes, description, service, status: "LIVE"
- Bulk approve/junk: \`consent_bulk_triage\` with items array containing type, id, action, tracking_purposes
- Mark junk items with action "JUNK" (no purposes needed)

After pushing, report what was updated and show the remaining triage count.

## Phase 6: Loop

Ask the user if they want to continue with the next batch. Repeat from Phase 2.

## Key References

When \`docs_list\` / \`docs_fetch\` are available (e.g. the unified \`@transcend-io/mcp\` server), prefer those for full markdown. Otherwise open the docs URLs directly:

- Triage guide: https://docs.transcend.io/docs/articles/consent-management/configuration/triage-cookies-and-dataflows-guide
- Data flows & cookies: https://docs.transcend.io/docs/articles/consent-management/concepts/data-flows-and-cookies
- Tracking purposes: https://docs.transcend.io/docs/articles/consent-management/concepts/tracking-purposes
- Regional experiences: https://docs.transcend.io/docs/articles/consent-management/configuration/regional-experiences
- Telemetry overview: https://docs.transcend.io/docs/articles/consent-management/configuration/telemetry-overview`,
        },
      },
    ];
  },
};
