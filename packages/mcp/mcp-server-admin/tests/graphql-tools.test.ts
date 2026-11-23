import { ErrorCode, ToolError } from '@transcend-io/mcp-server-base';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { getGraphqlTools } from '../src/tools/graphql/index.js';
import { getBundledSchema } from '../src/tools/graphql/schema.js';

describe('GraphQL fallback tools', () => {
  let makeRequest: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    makeRequest = vi.fn().mockResolvedValue({ organization: { id: 'org_1' } });
  });

  const getTools = () =>
    getGraphqlTools({
      rest: { testConnection: vi.fn() } as never,
      graphql: { makeRequest } as never,
      dashboardUrl: 'https://app.transcend.io',
    });

  it('registers three tools by default', () => {
    const names = getTools().map((t) => t.name);
    expect(names).toEqual(['graphql_inspect_schema', 'graphql_query', 'graphql_mutate']);
  });

  it('bundled schema exposes Query and Mutation roots', () => {
    const schema = getBundledSchema();
    expect(schema.getQueryType()?.name).toBe('Query');
    expect(schema.getMutationType()?.name).toBe('Mutation');
  });

  it('inspect search returns matching root fields', async () => {
    const tool = getTools().find((t) => t.name === 'graphql_inspect_schema')!;
    const result = (await tool.handler({ search: 'organization' })) as {
      success: boolean;
      data: { matches: Array<{ name: string }> };
    };
    expect(result.success).toBe(true);
    expect(result.data.matches.some((m) => m.name.toLowerCase().includes('organization'))).toBe(
      true,
    );
  });

  it('rejects mutations in graphql_query', async () => {
    const tool = getTools().find((t) => t.name === 'graphql_query')!;
    await expect(
      tool.handler({ query: 'mutation { approveRequest(id: "x") { id } }' }),
    ).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_ERROR,
      message: expect.stringMatching(/graphql_mutate/) as unknown,
    });
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('rejects introspection in graphql_query', async () => {
    const tool = getTools().find((t) => t.name === 'graphql_query')!;
    await expect(
      tool.handler({ query: 'query { __schema { queryType { name } } }' }),
    ).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_ERROR,
    });
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('runs a validated query via makeRequest', async () => {
    const tool = getTools().find((t) => t.name === 'graphql_query')!;
    const result = (await tool.handler({ query: 'query { __typename }' })) as {
      success: boolean;
      data: { data: unknown };
    };
    expect(result.success).toBe(true);
    expect(makeRequest).toHaveBeenCalledWith('query { __typename }', {});
  });

  it('graphql_mutate uses retries 0', async () => {
    const tool = getTools().find((t) => t.name === 'graphql_mutate')!;
    await tool.handler({
      query: 'mutation { __typename }',
    });
    expect(makeRequest).toHaveBeenCalledWith('mutation { __typename }', {}, { retries: 0 });
  });

  it('throws ToolError for unknown typeNames', async () => {
    const tool = getTools().find((t) => t.name === 'graphql_inspect_schema')!;
    await expect(tool.handler({ typeNames: ['DefinitelyNotARealTypeXYZ'] })).rejects.toThrow(
      ToolError,
    );
  });
});
