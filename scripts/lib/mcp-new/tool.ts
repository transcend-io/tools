/**
 * Scaffolds a plain tool: one file, `defineTool`, no capability variants.
 *
 * The shape follows `packages/mcp/mcp-server-docs/src/tools/docs_fetch.ts`. Touches
 * no manifest and runs no install: a tool that renders as text needs none of the
 * browser-side dependencies a view does.
 */

import { join } from 'node:path';

import type { McpPackage } from '../mcp-app-dev.ts';
import { writeNew, type ArtifactNames, type ScaffoldResult } from './shared.ts';

/** Options for {@link toolSource}. */
interface ToolSourceOptions {
  /** Exported factory's name, e.g. `createDocsFetchUsageTool` */
  factory: string;
  /** Zod schema constant's name, e.g. `DocsFetchUsageSchema` */
  schema: string;
  /** Tool's name on the wire, e.g. `docs_fetch_usage` */
  toolName: string;
}

/** Source for a tool with no variants. */
function toolSource({ factory, schema, toolName }: ToolSourceOptions): string {
  return `import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

export const ${schema} = z.object({
  // TODO: replace with the arguments this tool takes. Every field needs a
  // description: it is what the model reads to decide how to call this, and
  // \`scripts/check-mcp-descriptions.test.ts\` fails a registered tool without one.
  query: z.string().describe('TODO: what this argument selects.'),
});
export type ${schema.replace(/Schema$/, 'Input')} = z.infer<typeof ${schema}>;

/**
 * TODO: describe what this tool does and when the model should reach for it.
 *
 * Not registered yet. Add \`${factory}()\` to the array its package returns from
 * \`src/tools/index.ts\`, which is the point at which the name and description
 * below become public API.
 *
 * \`ToolClients\` carries the GraphQL and REST clients. Drop the underscore to use
 * them, or the parameter entirely for a tool that calls nothing.
 */
export function ${factory}(_clients?: ToolClients) {
  return defineTool({
    name: '${toolName}',
    description: 'TODO: what this returns, and when the model should call it.',
    category: 'TODO',
    // \`readOnly\` gates whether the tool is offered in a read-only session; the
    // annotations are hints a host may show. Flip them together for a mutating tool.
    readOnly: true,
    requireAuth: false,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ${schema},
    handler: async ({ query }) =>
      createToolResult(true, {
        // TODO: return the data this tool exists to fetch.
        query,
      }),
  });
}
`;
}

/** Writes a single plain tool, leaving every manifest alone. */
export function scaffoldTool(pkg: McpPackage, names: ArtifactNames): ScaffoldResult {
  const { snakeCase, pascalCase, toolName } = names;
  const factory = `create${pascalCase}Tool`;

  writeNew(
    join(pkg.dir, 'src', 'tools', `${snakeCase}.ts`),
    toolSource({ factory, schema: `${pascalCase}Schema`, toolName }),
  );

  return {
    factory,
    toolModule: `./${snakeCase}.js`,
    step: 'Replace the TODOs, starting with the tool name and description.',
    notes: [
      `Then: pnpm --filter ${pkg.name} test to check it, and pnpm mcp:inspect ${names.shortName} to call it.`,
    ],
    manifestChanged: false,
  };
}
