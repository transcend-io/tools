import { TranscendRestClient, type ToolClients } from '@transcend-io/mcp-server-base';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { customFunctionDashboardUrl, customFunctionNextStep } from '../src/helpers/nextStep.js';
import { pickSombraId } from '../src/helpers/resolveSombraId.js';
import { getCustomFunctionsTools } from '../src/tools.js';
import { CustomFunctionsUpsertSchema } from '../src/tools/custom_functions_upsert.js';

const SIGNED = {
  signedCodeJwt: 'signed-code',
  signedCodeContextJwt: 'signed-context',
};

describe('Custom Functions tools', () => {
  let rest: {
    /** Mock Sombra sign call */
    signCustomFunction: ReturnType<typeof vi.fn>;
    /** Mock Sombra unwrap call */
    unwrapCustomFunction: ReturnType<typeof vi.fn>;
  };
  let graphql: {
    /** Mock list query */
    listCustomFunctions: ReturnType<typeof vi.fn>;
    /** Mock signed version query */
    getSignedCustomFunctionVersion: ReturnType<typeof vi.fn>;
    /** Mock create mutation */
    createCustomFunction: ReturnType<typeof vi.fn>;
    /** Mock update mutation */
    updateCustomFunction: ReturnType<typeof vi.fn>;
    /** Mock promote mutation */
    promoteCustomFunctionVersion: ReturnType<typeof vi.fn>;
    /** Mock Sombra list query */
    listSombras: ReturnType<typeof vi.fn>;
    /** Mock customFunction data silo create */
    createCustomFunctionDataSilo: ReturnType<typeof vi.fn>;
    /** Mock data silo delete (rollback) */
    deleteDataSilo: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    rest = {
      signCustomFunction: vi.fn().mockResolvedValue(SIGNED),
      unwrapCustomFunction: vi.fn(),
    };
    graphql = {
      listCustomFunctions: vi.fn(),
      getSignedCustomFunctionVersion: vi.fn(),
      createCustomFunction: vi.fn(),
      updateCustomFunction: vi.fn(),
      promoteCustomFunctionVersion: vi.fn(),
      listSombras: vi.fn().mockResolvedValue([
        {
          id: 'sombra-1',
          title: 'Local',
          customerUrl: 'https://sombra.example.com',
          isPrimarySombra: true,
        },
      ]),
      createCustomFunctionDataSilo: vi.fn().mockResolvedValue({
        id: 'silo-new',
        title: 'Example',
      }),
      deleteDataSilo: vi.fn(),
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

  it('registers the expected tools', () => {
    expect(getTools().map((tool) => tool.name)).toEqual([
      'custom_functions_upsert',
      'custom_functions_list',
      'custom_functions_get_code',
      'custom_functions_promote_version',
    ]);
  });

  it('signs and creates without returning JWTs', async () => {
    graphql.createCustomFunction.mockResolvedValue({
      id: 'cf-1',
      name: 'Example',
      type: 'GENERAL',
      lifecycleState: 'ACTIVE',
      sombraId: 'sombra-1',
      hasPendingDraft: false,
      activeVersion: {
        id: 'version-1',
        versionNumber: '1',
        lifecycleState: 'ACTIVE',
        successfulTestRun: false,
      },
    });

    const result = await getTool('custom_functions_upsert').handler({
      type: 'GENERAL',
      name: 'Example',
      sombraId: 'sombra-1',
      code: 'export default () => true;',
      userDefinedEnv: {},
      allowedHosts: [],
      setActive: true,
      promote: false,
    });

    expect(rest.signCustomFunction).toHaveBeenCalledWith({
      code: 'export default () => true;',
      context: {
        userDefinedEnv: {},
        allowedHosts: [],
        allowThirdPartyImports: undefined,
        timeoutMs: undefined,
      },
    });
    expect(graphql.createCustomFunction).toHaveBeenCalledWith(expect.objectContaining(SIGNED));
    expect(graphql.listSombras).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain('signedCodeJwt');
    expect(JSON.stringify(result)).not.toContain('signedCodeContextJwt');
    expect(JSON.stringify(result)).toContain(
      'https://app.transcend.io/infrastructure/functions?functionId=cf-1',
    );
    expect(result).toMatchObject({
      success: true,
      data: { nextStep: expect.stringContaining('custom_functions_test_run') },
    });
  });

  it('updates a draft and promotes it when requested', async () => {
    graphql.updateCustomFunction.mockResolvedValue({
      id: 'cf-1',
      name: 'Example',
      type: 'GENERAL',
      lifecycleState: 'ACTIVE',
      hasPendingDraft: true,
      draftVersion: {
        id: 'version-2',
        versionNumber: '2',
        lifecycleState: 'DRAFT',
        successfulTestRun: false,
      },
    });
    graphql.promoteCustomFunctionVersion.mockResolvedValue({
      customFunction: {
        id: 'cf-1',
        name: 'Example',
        type: 'GENERAL',
        lifecycleState: 'ACTIVE',
        hasPendingDraft: false,
        activeVersion: {
          id: 'version-2',
          versionNumber: '2',
          lifecycleState: 'ACTIVE',
          successfulTestRun: false,
        },
      },
      dependencyWarnings: [],
    });

    await getTool('custom_functions_upsert').handler({
      id: 'cf-1',
      type: 'GENERAL',
      code: 'export default () => true;',
      userDefinedEnv: {},
      allowedHosts: [],
      setActive: true,
      promote: true,
    });

    expect(graphql.promoteCustomFunctionVersion).toHaveBeenCalledWith('cf-1', 'version-2');
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

  it('resolves the primary Sombra when GENERAL create omits sombraId', async () => {
    graphql.createCustomFunction.mockResolvedValue({
      id: 'cf-1',
      name: 'Example',
      type: 'GENERAL',
      lifecycleState: 'ACTIVE',
      sombraId: 'sombra-1',
      hasPendingDraft: false,
      activeVersion: {
        id: 'version-1',
        versionNumber: '1',
        lifecycleState: 'ACTIVE',
        successfulTestRun: false,
      },
    });

    await getTool('custom_functions_upsert').handler({
      type: 'GENERAL',
      name: 'Example',
      code: 'export default () => true;',
      userDefinedEnv: {},
      allowedHosts: [],
      setActive: true,
      promote: false,
    });

    expect(graphql.listSombras).toHaveBeenCalled();
    expect(graphql.createCustomFunction).toHaveBeenCalledWith(
      expect.objectContaining({ sombraId: 'sombra-1', ...SIGNED }),
    );
  });

  it('creates a customFunction data silo when DSR create omits dataSiloId', async () => {
    graphql.createCustomFunction.mockResolvedValue({
      id: 'cf-dsr',
      name: 'DSR Example',
      type: 'DSR',
      lifecycleState: 'ACTIVE',
      dataSiloId: 'silo-new',
      hasPendingDraft: false,
      activeVersion: {
        id: 'version-1',
        versionNumber: '1',
        lifecycleState: 'ACTIVE',
        successfulTestRun: false,
      },
    });

    await getTool('custom_functions_upsert').handler({
      type: 'DSR',
      name: 'DSR Example',
      code: 'export const enricher = () => true; export default enricher;',
      userDefinedEnv: {},
      allowedHosts: [],
      setActive: true,
      promote: false,
    });

    expect(graphql.createCustomFunctionDataSilo).toHaveBeenCalledWith({
      title: 'DSR Example',
      sombraId: 'sombra-1',
    });
    expect(graphql.createCustomFunction).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DSR', dataSiloId: 'silo-new', sombraId: undefined }),
    );
    expect(graphql.deleteDataSilo).not.toHaveBeenCalled();
  });

  it('rolls back a created DSR silo when createCustomFunction fails', async () => {
    graphql.createCustomFunction.mockRejectedValue(new Error('create failed'));

    await expect(
      getTool('custom_functions_upsert').handler({
        type: 'DSR',
        name: 'DSR Example',
        code: 'export const enricher = () => true; export default enricher;',
        userDefinedEnv: {},
        allowedHosts: [],
        setActive: true,
        promote: false,
      }),
    ).rejects.toThrow('create failed');

    expect(graphql.deleteDataSilo).toHaveBeenCalledWith('silo-new');
  });

  it('fails with setup guidance when SOMBRA_CUSTOMER_KEY is missing', async () => {
    const restClient = new TranscendRestClient(
      { type: 'apiKey', apiKey: 'test' },
      'https://sombra.example.com',
    );

    await expect(
      getTool('custom_functions_upsert', restClient).handler({
        type: 'DSR',
        name: 'Example',
        dataSiloId: 'silo-1',
        code: 'export const enricher = () => true; export default enricher;',
        userDefinedEnv: {},
        allowedHosts: [],
        setActive: true,
        promote: false,
      }),
    ).rejects.toThrow('SOMBRA_CUSTOMER_KEY');
  });

  it('rejects create upsert without a name at the schema', () => {
    const parsed = CustomFunctionsUpsertSchema.safeParse({
      type: 'GENERAL',
      code: 'export default () => true;',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path[0] === 'name')).toBe(true);
    }
  });
});

const GATEWAY_A = {
  id: 'sombra-a',
  title: 'EU',
  customerUrl: 'https://eu.sombra.example.com/',
  isPrimarySombra: true,
};
const GATEWAY_B = {
  id: 'sombra-b',
  title: 'US',
  customerUrl: 'https://us.sombra.example.com/',
  isPrimarySombra: true,
};

describe('pickSombraId', () => {
  it('prefers the gateway matching SOMBRA_URL when several primaries exist', () => {
    expect(pickSombraId([GATEWAY_A, GATEWAY_B], 'https://us.sombra.example.com')).toBe('sombra-b');
  });

  it('uses the unique primary when SOMBRA_URL is unset', () => {
    expect(
      pickSombraId([
        { ...GATEWAY_A, isPrimarySombra: true },
        { ...GATEWAY_B, isPrimarySombra: false },
      ]),
    ).toBe('sombra-a');
  });

  it('lists available gateways when the agent must choose', () => {
    expect(() => pickSombraId([GATEWAY_A, GATEWAY_B])).toThrow(/Available Sombra gateways/);
  });
});

describe('customFunctionNextStep', () => {
  it('points create at an id-only test_run', () => {
    expect(customFunctionNextStep({ kind: 'created', id: 'cf-1' })).toContain(
      'custom_functions_test_run',
    );
  });

  it('points a draft at promote_version', () => {
    expect(
      customFunctionNextStep({ kind: 'draft', id: 'cf-1', draftVersionId: 'version-2' }),
    ).toContain('versionId "version-2"');
  });
});

describe('customFunctionDashboardUrl', () => {
  it('points at Developer Tools Custom Functions', () => {
    expect(customFunctionDashboardUrl('https://app.transcend.io/', 'cf-1')).toBe(
      'https://app.transcend.io/infrastructure/functions?functionId=cf-1',
    );
  });
});
