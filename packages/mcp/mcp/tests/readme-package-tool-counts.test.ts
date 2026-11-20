import fs from 'node:fs';
import path from 'node:path';
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
import { getWorkflowTools } from '@transcend-io/mcp-server-workflows';
import { describe, expect, it } from 'vitest';

import { EXPECTED_UMBRELLA_TOOL_COUNT } from './umbrella-tool-count.js';

const mcpRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readmePath = path.join(mcpRoot, 'README.md');

const stubFn = () => () => undefined;

const mockClients: ToolClients = {
  rest: new Proxy({} as ToolClients['rest'], { get: stubFn }),
  graphql: new Proxy({} as ToolClients['graphql'], { get: stubFn }),
  dashboardUrl: 'https://app.transcend.io',
};

/** Rows in packages/mcp/README.md that list a tool count per domain binary. */
const README_TOOL_ROWS: {
  /** Substring that identifies the table row (package directory name). */
  rowKey: string;
  getTools: (clients: ToolClients) => ToolDefinition[];
}[] = [
  { rowKey: 'mcp-server-admin', getTools: getAdminTools },
  { rowKey: 'mcp-server-assessment', getTools: getAssessmentTools },
  { rowKey: 'mcp-server-config', getTools: getConfigTools },
  { rowKey: 'mcp-server-consent', getTools: getConsentTools },
  { rowKey: 'mcp-server-custom-functions', getTools: getCustomFunctionsTools },
  { rowKey: 'mcp-server-discovery', getTools: getDiscoveryTools },
  { rowKey: 'mcp-server-docs', getTools: getDocsTools },
  { rowKey: 'mcp-server-dsr', getTools: getDSRTools },
  { rowKey: 'mcp-server-inventory', getTools: getInventoryTools },
  { rowKey: 'mcp-server-preferences', getTools: getPreferenceTools },
  { rowKey: 'mcp-server-workflows', getTools: getWorkflowTools },
];

/** Packages table and the prose immediately under it (stops at the next `##` heading). */
function packagesTableSection(readme: string): string {
  const start = readme.indexOf('## Packages');
  const end = readme.indexOf('\n## ', start + 1);
  return end === -1 ? readme.slice(start) : readme.slice(start, end);
}

/**
 * Parses the numeric Tools column from a README packages-table row.
 *
 * @param section - Packages section text
 * @param rowKey - Package directory slug that appears in the row link
 * @returns Parsed tool count
 */
function readmeToolCountForRow(section: string, rowKey: string): number {
  const row = section
    .split('\n')
    .find((line) => line.startsWith('|') && line.includes(`\`${rowKey}\``));
  if (!row) {
    throw new Error(`Packages table row missing for ${rowKey}`);
  }
  const match = row.match(/\|\s*(\d+)\s*\|/);
  if (!match) {
    throw new Error(`Could not parse tool count in row: ${row}`);
  }
  return Number(match[1]);
}

describe('packages/mcp/README.md package tool counts', () => {
  const readme = fs.readFileSync(readmePath, 'utf8');
  const packagesSection = packagesTableSection(readme);

  it.each(README_TOOL_ROWS)('$rowKey matches getTools() length', ({ rowKey, getTools }) => {
    const fromReadme = readmeToolCountForRow(packagesSection, rowKey);
    const fromCode = getTools(mockClients).length;
    expect(fromReadme, `${rowKey}: update README or tool list`).toBe(fromCode);
  });

  it('unified mcp row matches EXPECTED_UMBRELLA_TOOL_COUNT', () => {
    const unifiedRow = packagesSection
      .split('\n')
      .find((line) => line.includes('transcend-mcp`') && line.includes('./mcp/'));
    expect(unifiedRow).toBeDefined();
    const match = unifiedRow!.match(/\|\s*(\d+)\s*\|/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBe(EXPECTED_UMBRELLA_TOOL_COUNT);
  });
});
