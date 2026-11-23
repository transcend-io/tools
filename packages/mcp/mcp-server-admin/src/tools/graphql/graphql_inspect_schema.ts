import {
  createToolResult,
  defineTool,
  ErrorCode,
  ToolError,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import {
  isNamedType,
  printType,
  type GraphQLField,
  type GraphQLNamedType,
  type GraphQLSchema,
} from 'graphql';

import { getBundledSchema, SCHEMA_SNAPSHOT_NOTE } from './schema.js';

const MAX_SEARCH_MATCHES = 50;
const MAX_TYPE_NAMES = 10;

export const InspectSchemaSchema = z.object({
  search: z
    .string()
    .optional()
    .describe('Substring match on Query/Mutation fields and type names (max 50 results).'),
  operation: z
    .enum(['query', 'mutation'])
    .optional()
    .describe('With search, limit to Query or Mutation root fields.'),
  typeNames: z
    .array(z.string())
    .max(MAX_TYPE_NAMES)
    .optional()
    .describe('Type names to return as SDL (max 10).'),
});
export type InspectSchemaInput = z.infer<typeof InspectSchemaSchema>;

function rootFieldLines(
  schema: GraphQLSchema,
  operation: 'query' | 'mutation',
): Array<{ name: string; signature: string }> {
  const type = operation === 'query' ? schema.getQueryType() : schema.getMutationType();
  if (!type) {
    return [];
  }
  return Object.values(type.getFields()).map((field) => ({
    name: field.name,
    signature: `${field.name}${printArgs(field)}: ${field.type.toString()}`,
  }));
}

function printArgs(field: GraphQLField<unknown, unknown>): string {
  if (field.args.length === 0) {
    return '';
  }
  const inner = field.args.map((arg) => `${arg.name}: ${arg.type.toString()}`).join(', ');
  return `(${inner})`;
}

function closeTypeNameMatches(schema: GraphQLSchema, name: string, limit = 8): string[] {
  const needle = name.toLowerCase();
  return Object.keys(schema.getTypeMap())
    .filter((key) => !key.startsWith('__'))
    .filter(
      (key) =>
        key.toLowerCase().includes(needle) ||
        (needle.length >= 3 && key.toLowerCase().startsWith(needle.slice(0, 3))),
    )
    .slice(0, limit);
}

function matchSearch(
  schema: GraphQLSchema,
  search: string,
  operation?: 'query' | 'mutation',
): {
  matches: Array<{ kind: 'rootField'; operation: string; name: string; signature: string }>;
  truncated: boolean;
} {
  const needle = search.toLowerCase();
  const operations: Array<'query' | 'mutation'> = operation ? [operation] : ['query', 'mutation'];
  const matches: Array<{
    kind: 'rootField';
    operation: string;
    name: string;
    signature: string;
  }> = [];

  for (const op of operations) {
    for (const field of rootFieldLines(schema, op)) {
      if (field.name.toLowerCase().includes(needle)) {
        matches.push({
          kind: 'rootField',
          operation: op,
          name: field.name,
          signature: field.signature,
        });
      }
    }
  }

  const typeMap = schema.getTypeMap();
  for (const [typeName, type] of Object.entries(typeMap)) {
    if (typeName.startsWith('__')) continue;
    if (!typeName.toLowerCase().includes(needle)) continue;
    if (!isNamedType(type as GraphQLNamedType)) continue;
    // Avoid duplicating root fields already matched by name
    if (matches.some((m) => m.name === typeName)) continue;
    matches.push({
      kind: 'rootField',
      operation: 'type',
      name: typeName,
      signature: `${typeName} (${(type as GraphQLNamedType).astNode?.kind ?? 'type'})`,
    });
  }

  const truncated = matches.length > MAX_SEARCH_MATCHES;
  return { matches: matches.slice(0, MAX_SEARCH_MATCHES), truncated };
}

export function createGraphqlInspectSchemaTool(_clients?: ToolClients) {
  return defineTool({
    name: 'graphql_inspect_schema',
    description: 'Search bundled Transcend GraphQL schema: root fields or type SDL.',
    category: 'GraphQL',
    readOnly: true,
    requireAuth: false,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: InspectSchemaSchema,
    handler: async ({ search, operation, typeNames }) => {
      const schema = getBundledSchema();
      const queryType = schema.getQueryType();
      const mutationType = schema.getMutationType();
      const queryFields = queryType ? Object.keys(queryType.getFields()).length : 0;
      const mutationFields = mutationType ? Object.keys(mutationType.getFields()).length : 0;

      if (typeNames && typeNames.length > 0) {
        const types: Record<string, string> = {};
        const missing: Array<{ name: string; suggestions: string[] }> = [];
        for (const name of typeNames) {
          const type = schema.getType(name);
          if (!type || !isNamedType(type)) {
            missing.push({ name, suggestions: closeTypeNameMatches(schema, name) });
            continue;
          }
          types[name] = printType(type);
        }
        if (missing.length === typeNames.length) {
          throw new ToolError(
            ErrorCode.NOT_FOUND,
            `Unknown type name(s): ${missing.map((m) => m.name).join(', ')}. ` +
              (missing[0]?.suggestions.length
                ? `Did you mean: ${missing[0].suggestions.join(', ')}?`
                : 'Call with search to list matching root fields.'),
            false,
          );
        }
        return createToolResult(true, {
          schemaNote: SCHEMA_SNAPSHOT_NOTE,
          queryRootFieldCount: queryFields,
          mutationRootFieldCount: mutationFields,
          types,
          ...(missing.length > 0 && { missingTypes: missing }),
        });
      }

      if (search?.trim()) {
        const { matches, truncated } = matchSearch(schema, search.trim(), operation);
        return createToolResult(true, {
          schemaNote: SCHEMA_SNAPSHOT_NOTE,
          search: search.trim(),
          matches,
          truncated,
          ...(truncated && {
            paginationNote: `Showing first ${MAX_SEARCH_MATCHES} matches. Narrow search or request typeNames SDL.`,
          }),
        });
      }

      return createToolResult(true, {
        schemaNote: SCHEMA_SNAPSHOT_NOTE,
        queryRootFieldCount: queryFields,
        mutationRootFieldCount: mutationFields,
        usage:
          'Pass search to list matching root fields, or typeNames to fetch SDL for specific types. ' +
          'Then call graphql_query or graphql_mutate with a valid operation.',
      });
    },
  });
}
