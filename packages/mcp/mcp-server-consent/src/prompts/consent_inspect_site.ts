import type { PromptDefinition } from '@transcend-io/mcp-server-core';

export const consentInspectSitePrompt: PromptDefinition = {
  name: 'consent-inspect-site',
  description:
    'Live site investigation methodology for consent triage using browser DevTools. ' +
    'Covers regime overrides, consent verification, performance entries, HTML search, ' +
    'ad infrastructure checks, and airgap classification queries.',
  arguments: [
    {
      name: 'site_url',
      description: 'The site to investigate (e.g. "https://example.com")',
      required: true,
    },
    {
      name: 'tracker_domains',
      description:
        'Comma-separated tracker domains to look for (e.g. "doubleclick.net,google-analytics.com")',
      required: true,
    },
    {
      name: 'regime',
      description:
        'The most permissive regime name for URL override (e.g. "us"). ' +
        'Choose the regime with fewest opted-out purposes so trackers fire.',
      required: false,
    },
  ],
  handler: (args) => {
    const siteUrl = args.site_url || '(not specified)';
    const trackerDomains = args.tracker_domains || '(not specified)';
    const regime = args.regime || 'us';
    const domainList = trackerDomains
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);
    const domainArrayLiteral = JSON.stringify(domainList);

    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text:
            `Investigate how these trackers load on ${siteUrl}: ${trackerDomains}. ` +
            `Use regime "${regime}" for debug overrides.`,
        },
      },
      {
        role: 'assistant',
        content: {
          type: 'text',
          text: `## Live Site Investigation

### Important: Platform vs Client Sites

The bundle name (e.g. "acme-platform") may be a platform provider, not the actual
site with trackers. If the main domain is a corporate page without ad trackers, find a
real client site from links on the homepage and use that instead.

### Step 1: Navigate with Debug Overrides

Load the page with hash parameters to control consent behavior:

\`\`\`
${siteUrl}/#tcm-regime=${regime}&tcm-prompt=Hidden&log=*
\`\`\`

| Parameter | Purpose |
|-----------|---------|
| \`tcm-regime=${regime}\` | Force the most permissive privacy regime |
| \`tcm-prompt=Hidden\` | Suppress the consent banner |
| \`log=*\` | Enable verbose airgap debug logging |

Reference: https://docs.transcend.io/docs/articles/consent-management/reference/debugging-and-testing

### Step 2: Verify Consent State

\`\`\`javascript
(() => {
  if (!window.airgap) return 'airgap not loaded';
  return JSON.stringify({
    regimes: airgap.getRegimes(),
    purposes: airgap.getConsent().purposes,
    regimePurposes: airgap.getRegimePurposes(),
  }, null, 2);
})()
\`\`\`

All purposes should be \`true\` or \`"Auto"\`. If not, opt in manually:

\`\`\`javascript
(() => {
  airgap.optIn(Object.fromEntries(
    airgap.getRegimePurposes().map(p => [p, true])
  ));
  return JSON.stringify(airgap.getConsent().purposes);
})()
\`\`\`

### Step 3: Check Performance Entries for Tracker Domains

\`\`\`javascript
(() => {
  const domains = ${domainArrayLiteral};
  const entries = performance.getEntriesByType('resource');
  const results = {};
  for (const d of domains) {
    results[d] = entries.filter(e => e.name.includes(d)).map(e => ({
      url: e.name,
      initiator: e.initiatorType,
      duration: Math.round(e.duration),
      size: e.transferSize,
    }));
  }
  return JSON.stringify(results, null, 2);
})()
\`\`\`

### Step 4: Search Page HTML

\`\`\`javascript
(() => {
  const terms = ${domainArrayLiteral};
  const html = document.documentElement.outerHTML;
  const results = {};
  for (const term of terms) {
    const matches = [];
    let i = 0;
    while ((i = html.indexOf(term, i)) !== -1) {
      matches.push(html.substring(Math.max(0, i - 100), Math.min(html.length, i + 100)));
      i += term.length;
      if (matches.length > 3) break;
    }
    results[term] = { count: matches.length, samples: matches };
  }
  return JSON.stringify(results, null, 2);
})()
\`\`\`

### Step 5: Identify Ad Infrastructure

\`\`\`javascript
(() => {
  const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.src);
  // Non-exhaustive list of common ad tech scripts; look for any third-party ad scripts beyond these
  const adScripts = scripts.filter(s =>
    s.includes('prebid') || s.includes('gpt.js') || s.includes('googletag') ||
    s.includes('taboola') || s.includes('criteo') || s.includes('amazon-adsystem') ||
    s.includes('adsbygoogle') || s.includes('doubleclick')
  );
  const adDivs = Array.from(document.querySelectorAll(
    '[data-prebid], [data-ad], [data-ad-slot], [data-ad-unit], [id*="ad-slot"], [id*="ad-unit"], [class*="ad-container"]'
  ));
  const adSlots = adDivs.map(d => ({
    tag: d.tagName, id: d.id, class: d.className?.substring(0, 60),
    dataSizes: d.getAttribute('data-sizes'),
    dataPrebid: d.getAttribute('data-prebid'),
    dataTargeting: d.getAttribute('data-targeting'),
  }));
  const iframes = Array.from(document.querySelectorAll('iframe'));
  const adIframes = iframes.filter(f => f.title?.includes('ad') || f.id?.includes('ad'));
  return JSON.stringify({
    adScripts,
    adSlotCount: adSlots.length,
    adSlotSamples: adSlots.slice(0, 5),
    adIframes: adIframes.map(f => ({
      id: f.id, src: f.src?.substring(0, 150), title: f.title,
    })),
  }, null, 2);
})()
\`\`\`

### Step 6: Check Inline Initialization Scripts

\`\`\`javascript
(() => {
  const scripts = Array.from(document.querySelectorAll('script:not([src])'));
  const adInline = scripts.filter(s =>
    s.textContent.includes('prebid') || s.textContent.includes('googletag') ||
    s.textContent.includes('adsbygoogle') || s.textContent.includes('criteo') ||
    s.textContent.includes('taboola')
  );
  return JSON.stringify(adInline.map(s => ({
    parent: s.parentElement?.tagName,
    preview: s.textContent.substring(0, 500),
  })), null, 2);
})()
\`\`\`

### Step 7: Check Window Globals and Ad Config

\`\`\`javascript
(() => {
  const knownAdGlobals = ['pbjs', 'googletag', '__tcfapi', '__gpp', '__cmp',
    'adsbygoogle', '_taboola', 'criteo_q', 'apstag'];
  const adGlobals = Object.keys(window).filter(k =>
    knownAdGlobals.some(g => k.toLowerCase().includes(g.toLowerCase()))
  );
  const configs = {};
  for (const g of adGlobals) {
    try {
      const val = window[g];
      if (val && typeof val === 'object') {
        configs[g] = JSON.stringify(val).substring(0, 500);
      }
    } catch {}
  }
  return JSON.stringify({ adGlobals, configs }, null, 2);
})()
\`\`\`

### Step 8: Check Airgap Classification Per Tracker

\`\`\`javascript
(async () => {
  if (!window.airgap) return 'airgap not loaded';
  const domains = ${domainArrayLiteral};
  const results = {};
  for (const d of domains) {
    try {
      const purposes = await airgap.getPurposes('https://' + d + '/');
      const allowed = await airgap.isAllowed('https://' + d + '/');
      results[d] = { purposes, allowed };
    } catch (e) { results[d] = { error: e.message }; }
  }
  return JSON.stringify(results, null, 2);
})()
\`\`\`

### Step 9: Read Console Logs

Read the browser console output. The \`log=*\` override makes airgap emit detailed
allow/block decisions for every request, including purpose lookups. Search these logs
for each tracker domain to see how airgap classifies and handles it.

## Useful Console Commands Reference

| Command | Purpose |
|---------|---------|
| \`airgap.getConsent().purposes\` | Current consent state per purpose |
| \`airgap.getRegimes()\` | Active regime(s) for this session |
| \`airgap.getRegimePurposes()\` | Purposes regulated under current regime |
| \`await airgap.getPurposes('{url}')\` | What purposes a URL is classified under |
| \`await airgap.isAllowed('{url}')\` | Whether a URL is currently allowed |
| \`await airgap.isCookieAllowed({name:'{name}'})\` | Whether a cookie is allowed |
| \`await airgap.getCookiePurposes({name:'{name}'})\` | Cookie's assigned purposes |
| \`airgap.export().requests\` | Quarantined requests |
| \`airgap.export().cookies\` | Quarantined cookies |
| \`airgap.version\` | Current airgap version |

## Output Format

For each tracker return:

\`\`\`json
{
  "domain": "<domain>",
  "found_on_page": true,
  "loading_method": "direct_script|tag_manager|iframe|dynamic|not_found",
  "loaded_by": "<what script or mechanism loads it>",
  "in_main_document": true,
  "airgap_purposes": ["Advertising"],
  "airgap_allowed": true,
  "ad_infrastructure": "<detected ad chain, e.g. Prebid -> GPT>",
  "related_config": "<relevant config values>",
  "notes": "<additional observations>"
}
\`\`\`

Also return a site summary:

\`\`\`json
{
  "site_investigated": "<actual URL used>",
  "ad_stack": "<detected stack, e.g. Prebid -> Google Publisher Tags>",
  "consent_manager": "Transcend CMP",
  "total_ad_slots": "<count>",
  "total_scripts": "<count>",
  "total_iframes": "<count>"
}
\`\`\``,
        },
      },
    ];
  },
};
