import { TranscendRestClient, type ToolClients } from '@transcend-io/mcp-server-base';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getCustomFunctionsTools } from '../src/tools.js';

const SIGNED = {
  signedCodeJwt: 'signed-code',
  signedCodeContextJwt: 'signed-context',
};

describe('Custom Functions tools', () => {
  let rest: {
    /** Mock Sombra unwrap call */
    unwrapCustomFunction: ReturnType<typeof vi.fn>;
  };
  let graphql: {
    /** Mock list query */
    listCustomFunctions: ReturnType<typeof vi.fn>;
    /** Mock signed version query */
    getSignedCustomFunctionVersion: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    rest = {
      unwrapCustomFunction: vi.fn(),
    };
    graphql = {
      listCustomFunctions: vi.fn(),
      getSignedCustomFunctionVersion: vi.fn(),
    };
  });

  const getTools = (restClient: ToolClients['rest'] = rest as never) =>
    getCustomFunctionsTools({
      rest: restClient,
      graphql: graphql as never,
      dashboardUrl: 'https://app.transcend.io',
    });

  const getTool = (name: string, restClient?: ToolClients['rest']) =>
    getTools(restClient).find((tool) => tool.name === name)!;

  it('registers the expected read tools', () => {
    expect(getTools().map((tool) => tool.name)).toEqual([
      'custom_functions_list',
      'custom_functions_get_code',
    ]);
  });

  it('lists custom functions without returning JWTs', async () => {
    graphql.listCustomFunctions.mockResolvedValue({
      nodes: [
        {
          id: 'cf-1',
          name: 'Example',
          type: 'GENERAL',
          lifecycleState: 'ACTIVE',
          sombraId: 'sombra-1',
          hasPendingDraft: false,
        },
      ],
      totalCount: 1,
      hasNextPage: false,
    });

    const result = await getTool('custom_functions_list').handler({
      text: 'Example',
      limit: 50,
      offset: 0,
    });

    expect(graphql.listCustomFunctions).toHaveBeenCalledWith({
      type: undefined,
      lifecycleState: undefined,
      dataSiloId: undefined,
      text: 'Example',
      first: 50,
      offset: 0,
    });
    expect(result).toMatchObject({
      success: true,
      data: [{ id: 'cf-1', name: 'Example' }],
      totalCount: 1,
    });
    expect(JSON.stringify(result)).not.toContain('signedCodeJwt');
  });

  it('unwraps code without returning signed JWTs', async () => {
    graphql.getSignedCustomFunctionVersion.mockResolvedValue({
      customFunction: { id: 'cf-1', name: 'Example' },
      version: { id: 'version-1', lifecycleState: 'ACTIVE' },
      ...SIGNED,
    });
    rest.unwrapCustomFunction.mockResolvedValue({
      code: 'export default () => true;',
      context: { userDefinedEnv: { TOKEN: 'secret' }, allowedHosts: [] },
    });

    const result = await getTool('custom_functions_get_code').handler({ id: 'cf-1' });

    expect(result).toMatchObject({
      success: true,
      data: {
        code: 'export default () => true;',
        context: { userDefinedEnv: { TOKEN: 'secret' } },
      },
    });
    expect(JSON.stringify(result)).not.toContain('signedCodeJwt');
  });

  it('fails with setup guidance when SOMBRA_CUSTOMER_KEY is missing', async () => {
    graphql.getSignedCustomFunctionVersion.mockResolvedValue({
      customFunction: { id: 'cf-1', name: 'Example' },
      version: { id: 'version-1', lifecycleState: 'ACTIVE' },
      ...SIGNED,
    });
    const restClient = new TranscendRestClient(
      { type: 'apiKey', apiKey: 'test' },
      'https://sombra.example.com',
    );

    await expect(
      getTool('custom_functions_get_code', restClient).handler({ id: 'cf-1' }),
    ).rejects.toThrow('SOMBRA_CUSTOMER_KEY');
  });
});
