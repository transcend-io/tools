import { z } from 'zod';

import type { TranscendGraphQLBase } from '../clients/graphql/base.js';
import { createToolResult } from './helpers.js';
import { defineTool } from './types.js';

export const GraphqlIntrospectSchema = z.object({
  query: z
    .string()
    .describe(
      'A GraphQL query or mutation string to validate against the live schema. ' +
        'The server will return GRAPHQL_VALIDATION_FAILED errors listing exactly ' +
        'which fields, arguments, or types are invalid. Use dummy variable values ' +
        'since the goal is schema validation, not data fetching.',
    ),
  variables: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Optional variables to send with the query (use minimal dummy values).'),
});

export function createGraphqlIntrospectTool(graphql: TranscendGraphQLBase) {
  return defineTool({
    name: 'graphql_introspect',
    description:
      'Validate a GraphQL query against the live Transcend API schema. ' +
      'Sends the query and reports whether it passes schema validation. ' +
      'On failure, returns the exact validation errors (unknown fields, invalid arguments, type mismatches). ' +
      'Use this to audit GQL definitions or verify new fields/arguments before adding them.',
    category: 'Schema',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: GraphqlIntrospectSchema,
    handler: async ({ query, variables }) => {
      const result = await graphql.validateQuery(query, variables);

      if (result.errors?.length) {
        const validationErrors = result.errors.filter(
          (e) => e.extensions?.code === 'GRAPHQL_VALIDATION_FAILED',
        );
        const otherErrors = result.errors.filter(
          (e) => e.extensions?.code !== 'GRAPHQL_VALIDATION_FAILED',
        );

        if (validationErrors.length > 0) {
          return createToolResult(true, {
            valid: false,
            validationErrors: validationErrors.map((e) => ({
              message: e.message,
              locations: e.locations,
            })),
            ...(otherErrors.length > 0 ? { otherErrors: otherErrors.map((e) => e.message) } : {}),
          });
        }

        return createToolResult(true, {
          valid: true,
          note: 'Schema valid. Execution errors are expected with dummy variables.',
          executionErrors: otherErrors.map((e) => e.message),
        });
      }

      return createToolResult(true, {
        valid: true,
        note: 'Query passed schema validation and executed successfully.',
      });
    },
  });
}
