/**
 * Repo-wide audit that every Zod input field surfaced by an MCP tool
 * carries a non-trivial human-authored description. Descriptions are the
 * only signal LLM clients have for "what does this argument mean", so a
 * missing/short description silently degrades tool quality. Failing this
 * test in CI is cheaper than discovering the gap during an integration.
 *
 * The audit walks each MCP server's `getXyzTools()` factory at runtime —
 * passing throwaway mock clients is fine because schema construction is
 * client-independent. Composed/extended/merged schemas are introspected
 * the same way real MCP transport does, so we catch issues that a static
 * grep would miss.
 */

import { getAdminTools } from '@transcend-io/mcp-server-admin';
import { getAssessmentTools } from '@transcend-io/mcp-server-assessment';
import {
  collectMissingDescriptions,
  MIN_DESCRIPTION_LENGTH,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-base';
import { getConsentTools } from '@transcend-io/mcp-server-consent';
import { getDiscoveryTools } from '@transcend-io/mcp-server-discovery';
import { getDSRTools } from '@transcend-io/mcp-server-dsr';
import { getInventoryTools } from '@transcend-io/mcp-server-inventory';
import { getPreferenceTools } from '@transcend-io/mcp-server-preferences';
import { getWorkflowTools } from '@transcend-io/mcp-server-workflows';
import { describe, expect, test } from 'vitest';

/**
 * Mock ToolClients sufficient for tool *construction*. Tools dereference
 * `clients.graphql`/`rest` inside their handler, but never at the moment
 * their Zod schema is built, so passing an empty object is safe.
 */
const mockClients = {
  rest: {} as never,
  graphql: {} as never,
  dashboardUrl: 'https://app.transcend.io',
} satisfies ToolClients;

const serverFactories = [
  { name: 'admin', getTools: getAdminTools },
  { name: 'assessment', getTools: getAssessmentTools },
  { name: 'consent', getTools: getConsentTools },
  { name: 'discovery', getTools: getDiscoveryTools },
  { name: 'dsr', getTools: getDSRTools },
  { name: 'inventory', getTools: getInventoryTools },
  { name: 'preferences', getTools: getPreferenceTools },
  { name: 'workflows', getTools: getWorkflowTools },
] as const;

/**
 * Construct a server's tools, turning a `defineTool` description failure into
 * a readable test error rather than an unhandled throw at module load. The
 * actual enforcement lives in `defineTool` (it throws on a missing
 * description); this test gives per-server reporting and double-checks every
 * field recursively via the same `collectMissingDescriptions` helper.
 */
function buildTools(
  name: string,
  getTools: (clients: ToolClients) => ToolDefinition[],
): ToolDefinition[] {
  try {
    return getTools(mockClients);
  } catch (error) {
    throw new Error(
      `[${name}] tool construction failed (defineTool rejected an input schema):\n` +
        `  ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

describe('MCP tool input descriptions', () => {
  test.each(serverFactories)(
    '$name tools construct and document every input field (recursively)',
    ({ name, getTools }) => {
      const tools = buildTools(name, getTools);
      expect(tools.length, `${name} server registered no tools`).toBeGreaterThan(0);

      for (const tool of tools) {
        expect(
          typeof tool.description === 'string' &&
            tool.description.trim().length >= MIN_DESCRIPTION_LENGTH,
          `[${name}] tool "${tool.name}" is missing a meaningful top-level description`,
        ).toBe(true);

        const missing = collectMissingDescriptions(tool.zodSchema);
        expect(
          missing,
          `[${name}] tool "${tool.name}" has under-documented input fields ` +
            `(missing/short .describe(), min ${MIN_DESCRIPTION_LENGTH} chars): ${missing.join(', ')}`,
        ).toHaveLength(0);
      }
    },
  );
});
