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
import type { ToolClients, ToolDefinition } from '@transcend-io/mcp-server-base';
import { getConsentTools } from '@transcend-io/mcp-server-consent';
import { getDiscoveryTools } from '@transcend-io/mcp-server-discovery';
import { getDSRTools } from '@transcend-io/mcp-server-dsr';
import { getInventoryTools } from '@transcend-io/mcp-server-inventory';
import { getPreferenceTools } from '@transcend-io/mcp-server-preferences';
import { getWorkflowTools } from '@transcend-io/mcp-server-workflows';
import { describe, expect, test } from 'vitest';
import { z } from 'zod';

/**
 * Minimum description length that still conveys intent. Picked empirically
 * — anything shorter is almost always a placeholder like "ID" or "name".
 */
const MIN_DESCRIPTION_LENGTH = 8;

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

type ToolUnderTest = {
  server: string;
  tool: ToolDefinition;
};

const allTools: ToolUnderTest[] = serverFactories.flatMap(({ name, getTools }) =>
  getTools(mockClients).map((tool) => ({ server: name, tool })),
);

/**
 * Pulls the underlying ZodObject out of a top-level zodSchema so we can
 * walk its shape. Schemas may arrive as a bare ZodObject or wrapped in
 * a ZodEffects (refine/transform). Anything else is non-introspectable
 * for our purposes and we let the test report it directly.
 */
function unwrapToObject(schema: z.ZodType): z.ZodObject<z.ZodRawShape> | undefined {
  if (schema instanceof z.ZodObject) {
    return schema;
  }
  // ZodEffects wraps the inner schema accessible via `.innerType()` in v3
  // and `._def.schema` in v4. Both are tried so the audit survives a Zod
  // bump without flapping.
  const innerTypeFn = (schema as unknown as { innerType?: () => z.ZodType }).innerType;
  const inner =
    typeof innerTypeFn === 'function'
      ? innerTypeFn.call(schema)
      : ((schema as unknown as { _def?: { schema?: z.ZodType } })._def?.schema ?? undefined);
  if (inner && inner instanceof z.ZodObject) {
    return inner;
  }
  return undefined;
}

/**
 * Strips ZodOptional/ZodNullable/ZodDefault wrappers so the test can read
 * the description that the author actually wrote on the inner schema.
 * Authors typically chain `.optional()`/`.default()` after `.describe()`,
 * but Zod 4 surfaces the description on the outer wrapper too — we still
 * unwrap defensively in case any field was authored in the opposite order.
 */
function describedFor(schema: z.ZodType): string | undefined {
  const direct = (schema as { description?: string }).description;
  if (typeof direct === 'string' && direct.length > 0) {
    return direct;
  }
  const inner = (schema as { unwrap?: () => z.ZodType }).unwrap?.();
  return inner ? describedFor(inner) : undefined;
}

describe('MCP tool input descriptions', () => {
  test('every server registers at least one tool', () => {
    for (const { name, getTools } of serverFactories) {
      const tools = getTools(mockClients);
      expect(tools.length, `${name} server registered no tools`).toBeGreaterThan(0);
    }
  });

  test.each(allTools)(
    '$server $tool.name exposes a non-empty top-level tool description',
    ({ tool }) => {
      expect(typeof tool.description).toBe('string');
      expect(tool.description.trim().length).toBeGreaterThanOrEqual(MIN_DESCRIPTION_LENGTH);
    },
  );

  test.each(allTools)(
    '$server $tool.name input fields all carry meaningful descriptions',
    ({ server, tool }) => {
      const objectSchema = unwrapToObject(tool.zodSchema);
      // Tools whose entire zodSchema cannot be unwrapped to a ZodObject
      // either accept no input (EmptySchema → empty shape) or use a union
      // we cannot statically introspect. Either way, there are no fields
      // to audit so we short-circuit.
      if (!objectSchema) {
        return;
      }
      const shape = objectSchema.shape;
      const missing: string[] = [];
      const tooShort: { field: string; description: string }[] = [];

      for (const [field, fieldSchema] of Object.entries(shape)) {
        const description = describedFor(fieldSchema as z.ZodType);
        if (!description) {
          missing.push(field);
          continue;
        }
        if (description.trim().length < MIN_DESCRIPTION_LENGTH) {
          tooShort.push({ field, description });
        }
      }

      if (missing.length > 0 || tooShort.length > 0) {
        const lines: string[] = [];
        if (missing.length > 0) {
          lines.push(
            `  Missing .describe() on: ${missing.join(', ')}.\n` +
              `  Add a description that explains what this field is and what valid values look like.`,
          );
        }
        for (const { field, description } of tooShort) {
          lines.push(
            `  Field "${field}" description is too short (< ${MIN_DESCRIPTION_LENGTH} chars): "${description}".\n` +
              `  Expand it to explain intent / constraints / examples.`,
          );
        }
        throw new Error(
          `[${server}] tool "${tool.name}" has under-documented input fields:\n${lines.join('\n')}`,
        );
      }
    },
  );
});
