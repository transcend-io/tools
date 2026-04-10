import type { ResourceDefinition } from '@transcend-io/mcp-server-core';

export const classificationGuideResource: ResourceDefinition = {
  uri: 'consent://classification-guide',
  name: 'Consent Classification Guide',
  description:
    'Reference guide for classifying cookies and data flows into tracking purposes. ' +
    'Covers purpose definitions, junk indicators, and confidence levels.',
  mimeType: 'text/markdown',
  handler: () => `# Consent Classification Guide

## Tracking Purpose Reference

IMPORTANT: Each customer configures their own tracking purposes. The table below shows
common defaults for reference only. Always verify against the customer's actual
configuration by calling \`consent_list_purposes\` before classifying.

| Purpose | Typical Use | Examples |
|---------|-------------|---------|
| Essential | Required for the site to function — auth, security, CMP, CDN, load balancing | Session cookies, CSRF tokens, Transcend airgap.js, Cloudflare |
| Functional | Enhanced features that improve UX but aren't strictly required | Live chat widgets, user preferences, A/B testing, embedded media players |
| Analytics | Usage measurement and behavioral analysis | Google Analytics, Adobe Analytics, Heap, Mixpanel, pageview counters |
| Advertising | Ad serving, targeting, retargeting, header bidding, impression tracking | Google Ads, DoubleClick, Prebid, Amazon Ads, Criteo, Taboola |
| SaleOfInfo | Data sold to or shared with third parties for their own independent use | Data brokers, cross-site behavioral profiles, third-party data enrichment |

### Multiple Purposes

Items can have multiple purposes. Common combinations:
- \`["Advertising", "Analytics"]\` — ad platform that also tracks impressions/conversions
- \`["Advertising", "SaleOfInfo"]\` — ad network that shares data with third parties
- \`["Functional", "Analytics"]\` — A/B testing tool that measures engagement

### Essential Checklist

Before classifying something as Essential, verify ALL of these:
- The site would break or be unusable without it
- It serves a core technical function (not just "nice to have")
- It does not collect behavioral data for marketing purposes
- Examples: authentication tokens, shopping cart state, language preferences set by the user, CMP scripts, CDN resources

## Junk Indicators

Mark as JUNK if the tracker is:

| Indicator | Example |
|-----------|---------|
| Browser extension injection | Grammarly, LastPass, Honey, ad blocker scripts |
| Malware / unwanted injection | Unknown scripts not placed by site operator |
| Development / testing artifact | localhost URLs, staging environment trackers |
| Duplicate of existing rule | Subdomain variant already covered by an approved regex rule |

When in doubt, check if the tracker appears on multiple unrelated sites. Extension-injected
trackers typically appear across many different sites with no logical connection.

## Confidence Levels

| Level | Criteria | Action |
|-------|----------|--------|
| High | First-party privacy docs confirm the purpose, OR multiple independent CMPs agree, OR it's a well-known tracker (e.g. Google Analytics = Analytics) | Safe to approve |
| Medium | Some evidence found but no definitive first-party documentation; classification based on company business model and third-party references | Approve with note, flag for future review |
| Low | No documentation found; classification is a best guess based on domain name or limited context | Flag for manual review — do not auto-approve |
`,
};
