import type { ResourceDefinition, ToolClients } from '@transcend-io/mcp-server-core';

import { createDocsResource } from './docs_resource.js';

const DOCS_BASE = 'https://docs.transcend.io/docs/articles/consent-management';

/**
 * Returns all consent resource definitions.
 * Each resource fetches live content from docs.transcend.io with a static fallback.
 */
export function getConsentResources(_clients: ToolClients): ResourceDefinition[] {
  return [
    createDocsResource({
      url: `${DOCS_BASE}/concepts/tracking-purposes`,
      name: 'Tracking Purposes',
      description:
        'List of all available tracking purposes for consent management — ' +
        'Essential, Functional, Advertising, Analytics, Sale/Sharing.',
      fallback: TRACKING_PURPOSES_FALLBACK,
    }),
    createDocsResource({
      url: `${DOCS_BASE}/configuration/triage-cookies-and-dataflows-guide`,
      name: 'Triage Guide',
      description:
        'How to triage and classify data flows and cookies from telemetry — ' +
        'researching, classifying, regex rules, junk handling, and approval workflow.',
      fallback: TRIAGE_GUIDE_FALLBACK,
    }),
    createDocsResource({
      url: `${DOCS_BASE}/concepts/data-flows-and-cookies`,
      name: 'Data Flows & Cookies',
      description:
        'Overview of how Transcend discovers and regulates data flows and cookies ' +
        'via the airgap.js consent manager script.',
      fallback: DATA_FLOWS_FALLBACK,
    }),
    createDocsResource({
      url: `${DOCS_BASE}/reference/debugging-and-testing`,
      name: 'Debugging & Testing',
      description:
        'URL override parameters (tcm-regime, tcm-prompt, log), console commands, ' +
        'and testing methodology for consent manager debugging.',
      fallback: DEBUGGING_FALLBACK,
    }),
    createDocsResource({
      url: `${DOCS_BASE}/configuration/telemetry-overview`,
      name: 'Telemetry Overview',
      description:
        'How consent telemetry discovers trackers on your site — ' +
        'collection methods, data flow types, and cookie detection.',
      fallback: TELEMETRY_FALLBACK,
    }),
  ];
}

const TRACKING_PURPOSES_FALLBACK = `# Tracking Purposes

| Purpose | Description |
|---------|-------------|
| Essential | No consent required — essential site functionality and flows that don't transmit user data |
| Functional | Non-essential but helpful — support chat, error logging, preferences |
| Advertising | Data flows that collect or share data for marketing or advertising |
| Analytics | Data flows that collect or share information for analytics purposes |
| Sale/Sharing of Personal Information | Data sold or shared with third parties for cross-context behavioral advertising |

Data flows can have multiple tracking purposes.`;

const TRIAGE_GUIDE_FALLBACK = `# Guide to Triaging Data Flows & Cookies

1. Review auto-classified data flows (confirm service and purpose)
2. Research unclassified flows (check cookie policies, CookieDatabase.org, better.fyi)
3. Create regex rules for recurring cookies (e.g. _ga{{UUID}})
4. Mark browser extension / malware injections as junk
5. Approve classified flows to add them to the airgap.js bundle`;

const DATA_FLOWS_FALLBACK = `# Data Flows & Cookies

Data flows are network requests made by your site that Transcend discovers via telemetry.
Cookies are browser cookies set by scripts on your site.
Both are regulated by the airgap.js consent manager based on assigned tracking purposes.`;

const DEBUGGING_FALLBACK = `# Debugging & Testing

URL override parameters:
- \`#tcm-regime={name}\` — force a specific privacy regime
- \`#tcm-prompt=Hidden\` — suppress the consent banner
- \`#log=*\` — enable verbose airgap debug logging

Console commands:
- \`airgap.getConsent().purposes\` — current consent state
- \`airgap.getRegimes()\` — active regimes
- \`await airgap.getPurposes('{url}')\` — URL classification
- \`await airgap.isAllowed('{url}')\` — whether a URL is allowed`;

const TELEMETRY_FALLBACK = `# Telemetry Overview

Consent telemetry discovers trackers by monitoring network requests and cookies
on your site. Discovered items appear in the Triage view for classification.`;
