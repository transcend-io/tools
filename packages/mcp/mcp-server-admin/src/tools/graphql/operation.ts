import { ErrorCode, ToolError } from '@transcend-io/mcp-server-base';
import { getOperationAST, OperationTypeNode, parse, validate, type DocumentNode } from 'graphql';

import { getBundledSchema } from './schema.js';

const INTROSPECTION_PATTERN = /\b(__schema|__type)\b/;

/**
 * Parse, classify, and validate a GraphQL document against the bundled schema.
 *
 * @throws ToolError when the document is invalid or the wrong operation kind
 */
export function prepareGraphqlOperation(
  /** Raw GraphQL source */
  query: string,
  /** Expected single operation kind */
  expected: OperationTypeNode.QUERY | OperationTypeNode.MUTATION,
): DocumentNode {
  if (INTROSPECTION_PATTERN.test(query)) {
    throw new ToolError(
      ErrorCode.VALIDATION_ERROR,
      'Schema introspection is not allowed in query strings. Call graphql_inspect_schema instead.',
      false,
    );
  }

  let document: DocumentNode;
  try {
    document = parse(query);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ToolError(ErrorCode.VALIDATION_ERROR, `GraphQL syntax error: ${message}`, false);
  }

  const operations = document.definitions.filter((def) => def.kind === 'OperationDefinition');
  if (operations.length === 0) {
    throw new ToolError(
      ErrorCode.VALIDATION_ERROR,
      'Document must include exactly one query or mutation operation.',
      false,
    );
  }
  if (operations.length > 1) {
    throw new ToolError(
      ErrorCode.VALIDATION_ERROR,
      'Document must include exactly one operation. Split into separate calls.',
      false,
    );
  }

  const operation = getOperationAST(document);
  if (!operation) {
    throw new ToolError(
      ErrorCode.VALIDATION_ERROR,
      'Could not resolve an operation in this document.',
      false,
    );
  }

  if (operation.operation === OperationTypeNode.SUBSCRIPTION) {
    throw new ToolError(
      ErrorCode.VALIDATION_ERROR,
      'Subscriptions are not supported. Use a query or mutation.',
      false,
    );
  }

  if (operation.operation === OperationTypeNode.MUTATION && expected === OperationTypeNode.QUERY) {
    throw new ToolError(
      ErrorCode.VALIDATION_ERROR,
      'This document is a mutation. Call graphql_mutate to change data, or rewrite as a query.',
      false,
    );
  }
  if (operation.operation === OperationTypeNode.QUERY && expected === OperationTypeNode.MUTATION) {
    throw new ToolError(
      ErrorCode.VALIDATION_ERROR,
      'This document is a read-only query. Call graphql_query instead of graphql_mutate.',
      false,
    );
  }

  const schema = getBundledSchema();
  const validationErrors = validate(schema, document);
  if (validationErrors.length > 0) {
    throw new ToolError(
      ErrorCode.VALIDATION_ERROR,
      validationErrors.map((err) => err.message).join('; '),
      false,
    );
  }

  return document;
}

/** Cap serialized JSON payload size returned to the agent. */
export const MAX_GRAPHQL_RESULT_CHARS = 100_000;

/** Serialize API data and truncate when the payload is too large for context. */
export function capGraphqlResult(data: unknown): { data: unknown; truncated: boolean } {
  const serialized = JSON.stringify(data);
  if (serialized.length <= MAX_GRAPHQL_RESULT_CHARS) {
    return { data, truncated: false };
  }
  return {
    data: {
      truncated: true,
      note: 'Response exceeded the size cap. Re-run with a narrower field selection, pagination, or filters.',
      preview: serialized.slice(0, MAX_GRAPHQL_RESULT_CHARS),
    },
    truncated: true,
  };
}
