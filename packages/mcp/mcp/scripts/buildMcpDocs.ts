/**
 * Writes docs/mcp-guide-sync.json for Sanity sync (gitignored).
 * Generated on release / docs-sync workflows — not committed to the repo.
 *
 * Run via: pnpm --dir packages/mcp/mcp genfiles
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getAdminTools } from '@transcend-io/mcp-server-admin';
import { getAssessmentTools } from '@transcend-io/mcp-server-assessment';
import type { ToolClients, ToolDefinition } from '@transcend-io/mcp-server-base';
import { getConfigTools } from '@transcend-io/mcp-server-config';
import { getConsentTools } from '@transcend-io/mcp-server-consent';
import { getCustomFunctionsTools } from '@transcend-io/mcp-server-custom-functions';
import { getDiscoveryTools } from '@transcend-io/mcp-server-discovery';
import { getDocsTools } from '@transcend-io/mcp-server-docs';
import { getDSRTools } from '@transcend-io/mcp-server-dsr';
import { getInventoryTools } from '@transcend-io/mcp-server-inventory';
import { getPreferenceTools } from '@transcend-io/mcp-server-preferences';
import { getPrivacyCenterTools } from '@transcend-io/mcp-server-privacy-center';
import { getWorkflowTools } from '@transcend-io/mcp-server-workflows';
import { TRANSCEND_SCOPES, type ScopeName } from '@transcend-io/privacy-types';
import { getMcpServerOAuthScopes, TranscendMcpServer } from '@transcend-io/sdk';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
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
    scopes: getMcpServerOAuthScopes(TranscendMcpServer.Admin),
    getTools: getAdminTools,
  },
  {
    id: 'assessment',
    dir: 'mcp-server-assessment',
    npmName: '@transcend-io/mcp-server-assessment',
    binary: 'transcend-mcp-assessment',
    description: 'Privacy assessments, templates, groups',
    domain: 'Privacy assessments',
    scopes: getMcpServerOAuthScopes(TranscendMcpServer.Assessment),
    getTools: getAssessmentTools,
  },
  {
    id: 'config',
    dir: 'mcp-server-config',
    npmName: '@transcend-io/mcp-server-config',
    binary: 'transcend-mcp-config',
    description: 'transcend.yml pull and push (local files, stdio only)',
    domain: 'Configuration as code',
    scopes: getMcpServerOAuthScopes(TranscendMcpServer.Config),
    getTools: getConfigTools,
  },
  {
    id: 'consent',
    dir: 'mcp-server-consent',
    npmName: '@transcend-io/mcp-server-consent',
    binary: 'transcend-mcp-consent',
    description: 'Consent management, analytics, cookie triage',
    domain: 'Consent, cookies, data flows',
    scopes: getMcpServerOAuthScopes(TranscendMcpServer.Consent),
    getTools: getConsentTools,
  },
  {
    id: 'custom-functions',
    dir: 'mcp-server-custom-functions',
    npmName: '@transcend-io/mcp-server-custom-functions',
    binary: 'transcend-mcp-custom-functions',
    description: 'Custom Function authoring and test runs',
    domain: 'Custom Function authoring',
    scopes: getMcpServerOAuthScopes(TranscendMcpServer.CustomFunctions),
    getTools: getCustomFunctionsTools,
  },
  {
    id: 'base',
    dir: 'mcp-server-base',
    npmName: '@transcend-io/mcp-server-base',
    binary: null,
    description: 'Shared infrastructure (not installed directly)',
    domain: 'Shared infrastructure',
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
    scopes: getMcpServerOAuthScopes(TranscendMcpServer.Discovery),
    getTools: getDiscoveryTools,
  },
  {
    id: 'docs',
    dir: 'mcp-server-docs',
    npmName: '@transcend-io/mcp-server-docs',
    binary: 'transcend-mcp-docs',
    description: 'Transcend documentation lookup (list + fetch)',
    domain: 'Documentation lookup',
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
    scopes: getMcpServerOAuthScopes(TranscendMcpServer.Dsr),
    getTools: getDSRTools,
  },
  {
    id: 'inventory',
    dir: 'mcp-server-inventory',
    npmName: '@transcend-io/mcp-server-inventory',
    binary: 'transcend-mcp-inventory',
    description: 'Data inventory, silos, vendors, data points',
    domain: 'Data inventory, silos, vendors',
    scopes: getMcpServerOAuthScopes(TranscendMcpServer.Inventory),
    getTools: getInventoryTools,
  },
  {
    id: 'preferences',
    dir: 'mcp-server-preferences',
    npmName: '@transcend-io/mcp-server-preferences',
    binary: 'transcend-mcp-preferences',
    description: 'Privacy preference store (query, upsert, delete)',
    domain: 'User Preferences',
    scopes: getMcpServerOAuthScopes(TranscendMcpServer.Preferences),
    getTools: getPreferenceTools,
  },
  {
    id: 'privacy-center',
    dir: 'mcp-server-privacy-center',
    npmName: '@transcend-io/mcp-server-privacy-center',
    binary: 'transcend-mcp-privacy-center',
    description: 'Privacy Center configuration, messages, and policies',
    domain: 'Privacy Center',
    scopes: getMcpServerOAuthScopes(TranscendMcpServer.PrivacyCenter),
    getTools: getPrivacyCenterTools,
  },
  {
    id: 'workflows',
    dir: 'mcp-server-workflows',
    npmName: '@transcend-io/mcp-server-workflows',
    binary: 'transcend-mcp-workflows',
    description: 'Workflow & email-template configuration',
    domain: 'Workflow & email templates',
    scopes: getMcpServerOAuthScopes(TranscendMcpServer.Workflows),
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

execSync(`oxfmt ${syncJsonPath}`, {
  cwd: packageRoot,
  stdio: 'inherit',
});

console.log(`Wrote ${syncJsonPath} (umbrellaToolCount=${umbrellaToolCount})`);
