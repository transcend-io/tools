import { describe, it, expect } from 'vitest';

import {
  ErrorCode,
  GRAPHQL_ACCESS_DENIED_CODE,
  ToolError,
  classifyGraphQLErrors,
  classifyHttpError,
} from '../src/errors.js';
import { createErrorResult } from '../src/tools/helpers.js';

describe('classifyGraphQLErrors', () => {
  it('returns API_ERROR when no ACCESS_DENIED extension is present', () => {
    const error = classifyGraphQLErrors([
      { message: 'Unauthorized' },
      { message: 'Invalid query' },
    ]);

    expect(error).toBeInstanceOf(ToolError);
    expect(error.code).toBe(ErrorCode.API_ERROR);
    expect(error.retryable).toBe(false);
    expect(error.message).toBe('GraphQL errors: Unauthorized; Invalid query');
    expect(error.details).toBeUndefined();
  });

  it('returns PERMISSION_ERROR with route and requiredScopes from ACCESS_DENIED', () => {
    const error = classifyGraphQLErrors([
      {
        message:
          'Client error: You can only access the route "updateOrCreateCookies" if you have one of the scopes: "Manage Data Flows, Full Admin"',
        extensions: {
          code: GRAPHQL_ACCESS_DENIED_CODE,
          route: 'updateOrCreateCookies',
          requiredScopes: ['ManageDataFlows', 'FullAdmin'],
        },
      },
    ]);

    expect(error.code).toBe(ErrorCode.PERMISSION_ERROR);
    expect(error.retryable).toBe(false);
    expect(error.message).toContain('updateOrCreateCookies');
    expect(error.details).toEqual({
      route: 'updateOrCreateCookies',
      requiredScopes: ['ManageDataFlows', 'FullAdmin'],
    });
  });

  it('returns PERMISSION_ERROR when any error in a mixed list is ACCESS_DENIED', () => {
    const error = classifyGraphQLErrors([
      { message: 'Something else went wrong' },
      {
        message: 'Client error: You can only access the route "purposes"',
        extensions: {
          code: GRAPHQL_ACCESS_DENIED_CODE,
          route: 'purposes',
          requiredScopes: ['ManageDataFlows'],
        },
      },
    ]);

    expect(error.code).toBe(ErrorCode.PERMISSION_ERROR);
    expect(error.details).toEqual({
      route: 'purposes',
      requiredScopes: ['ManageDataFlows'],
    });
  });

  it('omits details when ACCESS_DENIED has no route or requiredScopes', () => {
    const error = classifyGraphQLErrors([
      {
        message: 'Access denied',
        extensions: { code: GRAPHQL_ACCESS_DENIED_CODE },
      },
    ]);

    expect(error.code).toBe(ErrorCode.PERMISSION_ERROR);
    expect(error.details).toBeUndefined();
  });

  it('filters non-string requiredScopes entries', () => {
    const error = classifyGraphQLErrors([
      {
        message: 'Access denied',
        extensions: {
          code: GRAPHQL_ACCESS_DENIED_CODE,
          route: 'foo',
          requiredScopes: ['ManageDataFlows', 42, null, 'FullAdmin'],
        },
      },
    ]);

    expect(error.details).toEqual({
      route: 'foo',
      requiredScopes: ['ManageDataFlows', 'FullAdmin'],
    });
  });
});

describe('classifyHttpError', () => {
  it('maps 401 and 403 to AUTH_ERROR', () => {
    expect(classifyHttpError(401, 'nope').code).toBe(ErrorCode.AUTH_ERROR);
    expect(classifyHttpError(403, 'forbidden').code).toBe(ErrorCode.AUTH_ERROR);
  });
});

describe('createErrorResult', () => {
  it('serializes ToolError details into the tool result JSON shape', () => {
    const result = createErrorResult(
      new ToolError(ErrorCode.PERMISSION_ERROR, 'GraphQL errors: denied', false, {
        route: 'updateOrCreateCookies',
        requiredScopes: ['ManageDataFlows'],
      }),
    ) as Record<string, unknown>;

    expect(result).toMatchObject({
      success: false,
      error: 'GraphQL errors: denied',
      code: ErrorCode.PERMISSION_ERROR,
      retryable: false,
      details: {
        route: 'updateOrCreateCookies',
        requiredScopes: ['ManageDataFlows'],
      },
    });
    expect(result.timestamp).toEqual(expect.any(String));
  });

  it('omits details when ToolError has none', () => {
    const result = createErrorResult(new ToolError(ErrorCode.API_ERROR, 'boom', false)) as Record<
      string,
      unknown
    >;

    expect(result).toMatchObject({
      success: false,
      error: 'boom',
      code: ErrorCode.API_ERROR,
      retryable: false,
    });
    expect(result).not.toHaveProperty('details');
  });
});
