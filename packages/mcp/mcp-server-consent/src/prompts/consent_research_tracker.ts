import type { PromptDefinition } from '@transcend-io/mcp-server-core';

export const consentResearchTrackerPrompt: PromptDefinition = {
  name: 'consent-research-tracker',
  description:
    'Research methodology for classifying cookies and data flows. ' +
    'Covers company identification, privacy policy lookup, CMP database checks, ' +
    'and structured evidence gathering for consent purpose assignment.',
  arguments: [
    {
      name: 'domain',
      description: 'The tracker domain or cookie name to research (e.g. "doubleclick.net", "_ga")',
      required: true,
    },
    {
      name: 'type',
      description: 'Whether this is a "cookie" or "data_flow" (default: "data_flow")',
      required: false,
    },
    {
      name: 'available_purposes',
      description:
        "Comma-separated list of the customer's configured purposes " +
        '(e.g. "Essential,Functional,Analytics,Advertising,SaleOfInfo"). ' +
        'Only recommend purposes from this list.',
      required: false,
    },
  ],
  handler: (args) => {
    const domain = args.domain || '(not specified)';
    const type = args.type || 'data_flow';
    const purposes = args.available_purposes || '(fetch from consent_list_purposes)';

    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Research the ${type} "${domain}" to determine its consent classification. Available purposes: ${purposes}`,
        },
      },
      {
        role: 'assistant',
        content: {
          type: 'text',
          text: `## Research Methodology

For each tracker or cookie, follow these steps in order:

### Step 1: Company Identification

Search the root domain (strip subdomains for broader matches) to find the operating company.
Check for recent acquisitions or rebrands — ad tech companies frequently change ownership.

### Step 2: First-Party Privacy Docs

Find and read the company's privacy policy and/or cookie policy. Look for:
- How they classify their own tracking
- What data they collect
- Stated purposes for data processing
- Data retention periods

### Step 3: Service Description

Understand the business model:
- Ad tech (DSP, SSP, ad exchange, header bidding)?
- Analytics (pageview counters, session recording, A/B testing)?
- CMP (consent management platform)?
- CDN / performance (content delivery, image optimization)?
- Functional (chat, support, preferences, authentication)?
- Data broker (selling/sharing data with third parties)?

### Step 4: CMP Database Lookups

Search these databases for existing classifications:

| Database | URL | Use For |
|----------|-----|---------|
| CookieDatabase.org | https://cookiedatabase.org/ | Cookie name lookup |
| better.fyi trackers | https://better.fyi/trackers/ | Domain-to-company lookup |
| Ghostery TrackerDB | https://www.ghostery.com/trackerdb | Tracker classification |
| Cookiepedia | https://cookiepedia.co.uk/ | Cookie purpose database |
| BuiltWith | https://builtwith.com/ | Site technology stack |
| urlscan.io | https://urlscan.io/ | Domain/infrastructure analysis |

### Step 5: Third-Party Cookie Policies

Find other companies' published cookie policies that classify this same tracker/service.
Multiple independent classifications strengthen confidence.

### Step 6: Essential vs Non-Essential Determination

Based on all evidence:
- Would the site break without this tracker? (Essential)
- Is it required for core functionality like auth, security, or the CMP itself? (Essential)
- Does it enhance features without being required? (Functional)
- Does it measure usage or behavior? (Analytics)
- Does it serve, target, or retarget ads? (Advertising)
- Is data sold or shared with third parties for their own use? (SaleOfInfo)

Items can have multiple purposes (e.g. ["Advertising", "Analytics"] for an ad platform
that also tracks impressions).

IMPORTANT: Only recommend purposes from the customer's configured list. If research
suggests a purpose that doesn't exist for this customer, flag it and suggest the closest
available match.

## Junk Indicators

Mark as JUNK (not a real tracker to classify) if:
- From a browser extension (Grammarly, LastPass, ad blockers injecting scripts)
- Malware or unwanted injection not placed by the site operator
- A development/testing artifact (localhost, staging URLs)
- A subdomain variant of an already-approved regex rule

## Confidence Levels

- **High**: First-party docs confirm, OR multiple CMPs agree, OR well-known tracker
- **Medium**: Some evidence but no definitive first-party documentation
- **Low**: No docs found, best-guess only — flag for manual review

## Output Format

Return a structured finding for each item:

\`\`\`json
{
  "domain": "<domain or cookie name>",
  "company_name": "<identified company>",
  "company_description": "<what the company does, 1-2 sentences>",
  "service_url": "<company homepage>",
  "specific_product": "<what product/feature this domain serves>",
  "recommended_purposes": ["Advertising"],
  "confidence": "High",
  "is_junk": false,
  "evidence_summary": "<2-3 sentence summary with key facts>",
  "sources": ["<url1>", "<url2>"],
  "suggested_description": "<one-line description to save as Transcend note>",
  "first_party_privacy_url": "<URL of their privacy/cookie policy if found>",
  "other_cmps_classify_as": "<what other CMPs say>"
}
\`\`\``,
        },
      },
    ];
  },
};
