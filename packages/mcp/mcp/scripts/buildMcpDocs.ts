/**
 * Regenerates MCP package/tool-count and OAuth-scope tables in packages/mcp/README.md
 * and writes docs/mcp-guide-sync.json for Sanity sync.
 *
 * Run via: pnpm --dir packages/mcp/mcp genfiles
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ADMIN_OAUTH_SCOPES, getAdminTools } from '@transcend-io/mcp-server-admin';
import { ASSESSMENT_OAUTH_SCOPES, getAssessmentTools } from '@transcend-io/mcp-server-assessment';
import type { ToolClients, ToolDefinition } from '@transcend-io/mcp-server-base';
import { CONSENT_OAUTH_SCOPES, getConsentTools } from '@transcend-io/mcp-server-consent';
import { DISCOVERY_OAUTH_SCOPES, getDiscoveryTools } from '@transcend-io/mcp-server-discovery';
import { getDocsTools } from '@transcend-io/mcp-server-docs';
import { DSR_OAUTH_SCOPES, getDSRTools } from '@transcend-io/mcp-server-dsr';
import { getInventoryTools, INVENTORY_OAUTH_SCOPES } from '@transcend-io/mcp-server-inventory';
import { getPreferenceTools, PREFERENCE_OAUTH_SCOPES } from '@transcend-io/mcp-server-preferences';
import { getWorkflowTools, WORKFLOW_OAUTH_SCOPES } from '@transcend-io/mcp-server-workflows';
import { TRANSCEND_SCOPES, type ScopeName } from '@transcend-io/privacy-types';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const mcpRoot = join(packageRoot, '..');
const readmePath = join(mcpRoot, 'README.md');
const umbrellaReadmePath = join(packageRoot, 'README.md');
const syncJsonPath = join(packageRoot, 'docs', 'mcp-guide-sync.json');

const stubClients: ToolClients = {
  rest: new Proxy({} as ToolClients['rest'], { get: () => () => undefined }),
  graphql: new Proxy({} as ToolClients['graphql'], { get: () => () => undefined }),
  dashboardUrl: 'https://app.transcend.io',
};

interface DomainMeta {
  /** Stable id used in sync JSON */
  id: string;
  /** Directory under packages/mcp/ */
  dir: string;
  /** Published npm package name */
  npmName: string;
  /** CLI binary name, or null for infra packages */
  binary: string | null;
  /** Packages table description */
  description: string;
  /** Short domain label used on the public MCP Guide */
  domain: string;
  /** Relative README link path from packages/mcp/README.md */
  readmeHref: string;
  /** OAuth scopes for this domain, or null when N/A */
  scopes: readonly ScopeName[] | null;
  /** Scope cell override (unified / docs / base) */
  scopesLabel?: string;
  /** Tool factory; omit for packages with no tools (e.g. base) */
  getTools?: (clients: ToolClients) => ToolDefinition[];
}

const DOMAINS: DomainMeta[] = [
  {
    id: 'mcp',
    dir: 'mcp',
    npmName: '@transcend-io/mcp',
    binary: 'transcend-mcp',
    description: 'Unified server — all tools in one process',
    domain: 'Everything in one process',
    readmeHref: './mcp/',
    scopes: null,
    scopesLabel: 'Union of all domain scopes below',
  },
  {
    id: 'admin',
    dir: 'mcp-server-admin',
    npmName: '@transcend-io/mcp-server-admin',
    binary: 'transcend-mcp-admin',
    description: 'Organization, users, teams, API keys',
    domain: 'Org, users, teams, API keys',
    readmeHref: './mcp-server-admin/',
    scopes: ADMIN_OAUTH_SCOPES,
    getTools: getAdminTools,
  },
  {
    id: 'assessment',
    dir: 'mcp-server-assessment',
    npmName: '@transcend-io/mcp-server-assessment',
    binary: 'transcend-mcp-assessment',
    description: 'Privacy assessments, templates, groups',
    domain: 'Privacy assessments',
    readmeHref: './mcp-server-assessment/',
    scopes: ASSESSMENT_OAUTH_SCOPES,
    getTools: getAssessmentTools,
  },
  {
    id: 'consent',
    dir: 'mcp-server-consent',
    npmName: '@transcend-io/mcp-server-consent',
    binary: 'transcend-mcp-consent',
    description: 'Consent management, analytics, cookie triage',
    domain: 'Consent, cookies, data flows',
    readmeHref: './mcp-server-consent/',
    scopes: CONSENT_OAUTH_SCOPES,
    getTools: getConsentTools,
  },
  {
    id: 'base',
    dir: 'mcp-server-base',
    npmName: '@transcend-io/mcp-server-base',
    binary: null,
    description: 'Shared infrastructure (not installed directly)',
    domain: 'Shared infrastructure',
    readmeHref: './mcp-server-base/',
    scopes: null,
    scopesLabel: '—',
  },
  {
    id: 'discovery',
    dir: 'mcp-server-discovery',
    npmName: '@transcend-io/mcp-server-discovery',
    binary: 'transcend-mcp-discovery',
    description: 'Data discovery, classification, NER',
    domain: 'Data discovery, classification',
    readmeHref: './mcp-server-discovery/',
    scopes: DISCOVERY_OAUTH_SCOPES,
    getTools: getDiscoveryTools,
  },
  {
    id: 'docs',
    dir: 'mcp-server-docs',
    npmName: '@transcend-io/mcp-server-docs',
    binary: 'transcend-mcp-docs',
    description: 'Transcend documentation lookup (list + fetch)',
    domain: 'Documentation lookup',
    readmeHref: './mcp-server-docs/',
    scopes: null,
    scopesLabel: '_(none — tools fetch public docs URLs only)_',
    getTools: getDocsTools,
  },
  {
    id: 'dsr',
    dir: 'mcp-server-dsr',
    npmName: '@transcend-io/mcp-server-dsr',
    binary: 'transcend-mcp-dsr',
    description: 'Data subject requests (submit, track, respond)',
    domain: 'Data subject requests',
    readmeHref: './mcp-server-dsr/',
    scopes: DSR_OAUTH_SCOPES,
    getTools: getDSRTools,
  },
  {
    id: 'inventory',
    dir: 'mcp-server-inventory',
    npmName: '@transcend-io/mcp-server-inventory',
    binary: 'transcend-mcp-inventory',
    description: 'Data inventory, silos, vendors, data points',
    domain: 'Data inventory, silos, vendors',
    readmeHref: './mcp-server-inventory/',
    scopes: INVENTORY_OAUTH_SCOPES,
    getTools: getInventoryTools,
  },
  {
    id: 'preferences',
    dir: 'mcp-server-preferences',
    npmName: '@transcend-io/mcp-server-preferences',
    binary: 'transcend-mcp-preferences',
    description: 'Privacy preference store (query, upsert, delete)',
    domain: 'User Preferences',
    readmeHref: './mcp-server-preferences/',
    scopes: PREFERENCE_OAUTH_SCOPES,
    getTools: getPreferenceTools,
  },
  {
    id: 'workflows',
    dir: 'mcp-server-workflows',
    npmName: '@transcend-io/mcp-server-workflows',
    binary: 'transcend-mcp-workflows',
    description: 'Workflow & email-template configuration',
    domain: 'Workflow & email templates',
    readmeHref: './mcp-server-workflows/',
    scopes: WORKFLOW_OAUTH_SCOPES,
    getTools: getWorkflowTools,
  },
];

function scopeTitles(scopes: readonly ScopeName[]): string[] {
  return scopes.map((scope) => {
    const def = TRANSCEND_SCOPES[scope];
    if (!def) {
      throw new Error(`Missing TRANSCEND_SCOPES entry for ${scope}`);
    }
    return def.title;
  });
}

function pad(value: string, width: number, align: 'left' | 'right' = 'left'): string {
  if (value.length >= width) {
    return value;
  }
  const padding = ' '.repeat(width - value.length);
  return align === 'right' ? padding + value : value + padding;
}

function renderPackagesTable(
  rows: Array<{
    link: string;
    binary: string;
    tools: string;
    description: string;
  }>,
): string {
  const headers = {
    link: 'Package',
    binary: 'Binary',
    tools: 'Tools',
    description: 'Description',
  };
  const w = {
    link: Math.max(headers.link.length, ...rows.map((r) => r.link.length)),
    binary: Math.max(headers.binary.length, ...rows.map((r) => r.binary.length)),
    tools: Math.max(headers.tools.length, ...rows.map((r) => r.tools.length)),
    description: Math.max(headers.description.length, ...rows.map((r) => r.description.length)),
  };

  const line = (r: typeof headers) =>
    `| ${pad(r.link, w.link)} | ${pad(r.binary, w.binary)} | ${pad(r.tools, w.tools, 'right')} | ${pad(r.description, w.description)} |`;

  const sep = `| ${'-'.repeat(w.link)} | ${'-'.repeat(w.binary)} | ${'-'.repeat(w.tools)}: | ${'-'.repeat(w.description)} |`;

  return [line(headers), sep, ...rows.map(line)].join('\n');
}

function renderScopesTable(
  rows: Array<{
    link: string;
    scopes: string;
  }>,
): string {
  const headers = { link: 'Package', scopes: 'OAuth scopes requested' };
  const w = {
    link: Math.max(headers.link.length, ...rows.map((r) => r.link.length)),
    scopes: Math.max(headers.scopes.length, ...rows.map((r) => r.scopes.length)),
  };

  const line = (r: typeof headers) => `| ${pad(r.link, w.link)} | ${pad(r.scopes, w.scopes)} |`;
  const sep = `| ${'-'.repeat(w.link)} | ${'-'.repeat(w.scopes)} |`;

  return [line(headers), sep, ...rows.map(line)].join('\n');
}

function replaceMarker(content: string, start: string, end: string, body: string): string {
  const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`, 'g');
  if (!pattern.test(content)) {
    throw new Error(`Missing markers ${start} … ${end}`);
  }
  pattern.lastIndex = 0;
  return content.replace(pattern, `${start}\n${body}\n${end}`);
}

function replaceInlineToolTotals(content: string, total: number): string {
  const start = '<!-- MCP_TOOL_TOTAL_START -->';
  const end = '<!-- MCP_TOOL_TOTAL_END -->';
  const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`, 'g');
  if (!pattern.test(content)) {
    throw new Error(`Missing inline markers ${start} … ${end}`);
  }
  pattern.lastIndex = 0;
  return content.replace(pattern, `${start}${total}${end}`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function packageLink(domain: DomainMeta): string {
  if (domain.id === 'mcp') {
    return `[\`mcp\`](${domain.readmeHref})`;
  }
  return `[\`${domain.dir}\`](${domain.readmeHref})`;
}

const domainCounts = DOMAINS.map((domain) => {
  const toolCount = domain.getTools ? domain.getTools(stubClients).length : null;
  const titles = domain.scopes ? scopeTitles(domain.scopes) : [];
  return { domain, toolCount, titles };
});

const umbrellaToolCount = domainCounts
  .filter((d) => d.domain.id !== 'mcp' && d.domain.id !== 'base' && d.toolCount !== null)
  .reduce((sum, d) => sum + (d.toolCount ?? 0), 0);

const mcpRow = domainCounts.find((d) => d.domain.id === 'mcp');
if (!mcpRow) {
  throw new Error('Missing mcp domain meta');
}
mcpRow.toolCount = umbrellaToolCount;

const packageTableRows = domainCounts.map(({ domain, toolCount }) => ({
  link: packageLink(domain),
  binary: domain.binary ? `\`${domain.binary}\`` : '—',
  tools: toolCount === null ? '—' : String(toolCount),
  description: domain.description,
}));

const scopeTableRows = domainCounts
  .filter((d) => d.domain.id !== 'base')
  .map(({ domain, titles }) => {
    const link = domain.id === 'mcp' ? `${packageLink(domain)} (unified)` : packageLink(domain);
    const scopes = domain.scopesLabel ?? titles.join(', ');
    return { link, scopes };
  });

const packagesMarkdown = renderPackagesTable(packageTableRows);
const scopesMarkdown = renderScopesTable(scopeTableRows);

let readme = fs.readFileSync(readmePath, 'utf8');
readme = replaceMarker(
  readme,
  '<!-- MCP_PACKAGES_START -->',
  '<!-- MCP_PACKAGES_END -->',
  packagesMarkdown,
);
readme = replaceMarker(
  readme,
  '<!-- MCP_SCOPES_START -->',
  '<!-- MCP_SCOPES_END -->',
  scopesMarkdown,
);
readme = replaceInlineToolTotals(readme, umbrellaToolCount);
fs.writeFileSync(readmePath, readme);

let umbrellaReadme = fs.readFileSync(umbrellaReadmePath, 'utf8');
umbrellaReadme = replaceInlineToolTotals(umbrellaReadme, umbrellaToolCount);
fs.writeFileSync(umbrellaReadmePath, umbrellaReadme);

const syncPayload = {
  umbrellaToolCount,
  packages: domainCounts
    .filter((d) => d.domain.id !== 'base')
    .map(({ domain, toolCount, titles }) => ({
      id: domain.id,
      npmName: domain.npmName,
      dir: domain.dir,
      binary: domain.binary,
      toolCount,
      description: domain.description,
      domain: domain.domain,
      scopeTitles: domain.scopesLabel ? null : titles,
      scopesLabel: domain.scopesLabel ?? null,
    })),
};

fs.mkdirSync(dirname(syncJsonPath), { recursive: true });
fs.writeFileSync(syncJsonPath, `${JSON.stringify(syncPayload, null, 2)}\n`);

execSync(`oxfmt ${readmePath} ${umbrellaReadmePath} ${syncJsonPath}`, {
  cwd: mcpRoot,
  stdio: 'inherit',
});

console.log(`Updated ${readmePath}`);
console.log(`Updated ${umbrellaReadmePath}`);
console.log(`Wrote ${syncJsonPath} (umbrellaToolCount=${umbrellaToolCount})`);
