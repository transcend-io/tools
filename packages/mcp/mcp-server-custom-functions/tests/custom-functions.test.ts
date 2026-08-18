import { TranscendRestClient, type ToolClients } from '@transcend-io/mcp-server-base';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_GENERAL_TEST_PAYLOAD,
  didCustomFunctionTestPass,
  injectDataSiloIntoDsrTestPayload,
  mapCustomFunctionTestRunError,
} from '../src/helpers/customFunctionTestRun.js';
import { customFunctionDashboardUrl, customFunctionNextStep } from '../src/helpers/nextStep.js';
import { pickSombraId } from '../src/helpers/resolveSombraId.js';
import { getCustomFunctionsTools } from '../src/tools.js';
import { CustomFunctionsTestRunSchema } from '../src/tools/custom_functions_test_run.js';
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
    /** Mock test-run mutation */
    testRunCustomFunction: ReturnType<typeof vi.fn>;
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
      testRunCustomFunction: vi.fn(),
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

  it('registers the five expected tools', () => {
    expect(getTools().map((tool) => tool.name)).toEqual([
      'custom_functions_upsert',
      'custom_functions_list',
      'custom_functions_get_code',
      'custom_functions_promote_version',
      'custom_functions_test_run',
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

  it.each(['DSR', 'GENERAL'] as const)('signs unsaved %s code before a test run', async (type) => {
    graphql.testRunCustomFunction.mockResolvedValue({
      exitCode: 0,
      logs: [],
      profile: { timeMs: 1 },
    });
    const payload =
      type === 'DSR' ? { extras: { dataSilo: { id: 'silo-1' } } } : { event: { type: 'test' } };

    const result = await getTool('custom_functions_test_run').handler({
      type,
      code: 'export default () => true;',
      payload,
      ...(type === 'DSR' ? { dataSiloId: 'silo-1' } : {}),
      userDefinedEnv: {},
      allowedHosts: [],
    });

    expect(graphql.testRunCustomFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        type,
        ...SIGNED,
        ...(type === 'GENERAL' ? { sombraId: 'sombra-1' } : { sombraId: undefined }),
      }),
    );
    expect(result).toMatchObject({
      success: true,
      data: { passed: true, exitCode: 0, timeMs: 1 },
    });
    expect(JSON.stringify(result)).not.toContain('signed-code');
    expect(JSON.stringify(result)).not.toContain('spawnArgs');
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

  it('tests a stored GENERAL function by replaying JWTs like the dashboard', async () => {
    graphql.getSignedCustomFunctionVersion.mockResolvedValue({
      customFunction: {
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
      },
      version: {
        id: 'version-1',
        versionNumber: '1',
        lifecycleState: 'ACTIVE',
        successfulTestRun: false,
      },
      ...SIGNED,
    });
    graphql.testRunCustomFunction.mockResolvedValue({
      exitCode: 0,
      logs: [],
      profile: { timeMs: 4 },
    });

    const result = await getTool('custom_functions_test_run').handler({
      id: 'cf-1',
      type: 'GENERAL',
      userDefinedEnv: {},
      allowedHosts: [],
    });

    expect(rest.signCustomFunction).not.toHaveBeenCalled();
    expect(graphql.testRunCustomFunction).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'GENERAL', ...SIGNED }),
    );
    expect(graphql.testRunCustomFunction.mock.calls[0]?.[0]).not.toHaveProperty('id');
    expect(graphql.updateCustomFunction).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      success: true,
      data: {
        passed: true,
        customFunction: { activeVersion: { successfulTestRun: false } },
        nextStep: expect.stringContaining('testPayloads'),
      },
    });
  });

  it('marks a stored draft tested after a passing id-only run', async () => {
    graphql.getSignedCustomFunctionVersion.mockResolvedValue({
      customFunction: {
        id: 'cf-1',
        name: 'Example',
        type: 'GENERAL',
        lifecycleState: 'INACTIVE',
        sombraId: 'sombra-1',
        hasPendingDraft: true,
        draftVersion: {
          id: 'version-1',
          versionNumber: '1',
          lifecycleState: 'DRAFT',
          successfulTestRun: false,
        },
      },
      version: {
        id: 'version-1',
        versionNumber: '1',
        lifecycleState: 'DRAFT',
        successfulTestRun: false,
      },
      ...SIGNED,
    });
    graphql.testRunCustomFunction.mockResolvedValue({
      exitCode: 0,
      logs: [],
      profile: { timeMs: 4 },
    });
    graphql.updateCustomFunction.mockResolvedValue({
      id: 'cf-1',
      type: 'GENERAL',
      hasPendingDraft: true,
      draftVersion: { successfulTestRun: true },
    });

    const result = await getTool('custom_functions_test_run').handler({
      id: 'cf-1',
      type: 'GENERAL',
      userDefinedEnv: {},
      allowedHosts: [],
    });

    expect(graphql.updateCustomFunction).toHaveBeenCalledWith({
      id: 'cf-1',
      versionId: 'version-1',
      successfulTestRun: true,
      ...SIGNED,
    });
    expect(result).toMatchObject({
      success: true,
      data: {
        passed: true,
        customFunction: { draftVersion: { successfulTestRun: true } },
        nextStep: expect.stringContaining('successfulTestRun'),
      },
    });
  });

  it('does not mark a stored version tested when trial code is supplied with id', async () => {
    graphql.getSignedCustomFunctionVersion.mockResolvedValue({
      customFunction: {
        id: 'cf-1',
        name: 'Example',
        type: 'GENERAL',
        lifecycleState: 'ACTIVE',
        sombraId: 'sombra-1',
        hasPendingDraft: false,
      },
      version: {
        id: 'version-1',
        versionNumber: '1',
        lifecycleState: 'ACTIVE',
        successfulTestRun: false,
      },
      ...SIGNED,
    });
    graphql.testRunCustomFunction.mockResolvedValue({
      exitCode: 0,
      logs: [],
      profile: { timeMs: 1 },
    });

    await getTool('custom_functions_test_run').handler({
      id: 'cf-1',
      type: 'GENERAL',
      code: 'export default () => true;',
      userDefinedEnv: {},
      allowedHosts: [],
    });

    expect(rest.signCustomFunction).toHaveBeenCalled();
    expect(graphql.testRunCustomFunction).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'GENERAL', ...SIGNED }),
    );
    expect(graphql.testRunCustomFunction.mock.calls[0]?.[0]).not.toHaveProperty('id');
    expect(graphql.updateCustomFunction).not.toHaveBeenCalled();
  });

  it('defaults a GENERAL test payload when omitted', async () => {
    graphql.testRunCustomFunction.mockResolvedValue({
      exitCode: 0,
      logs: [],
      profile: { timeMs: 1 },
    });

    await getTool('custom_functions_test_run').handler({
      type: 'GENERAL',
      code: 'export default () => true;',
      userDefinedEnv: {},
      allowedHosts: [],
    });

    const call = graphql.testRunCustomFunction.mock.calls[0]?.[0] as {
      payload: string;
    };
    expect(JSON.parse(Buffer.from(call.payload, 'base64').toString('utf8'))).toEqual(
      DEFAULT_GENERAL_TEST_PAYLOAD,
    );
  });

  it('injects the stored DSR silo into a test payload', async () => {
    graphql.getSignedCustomFunctionVersion.mockResolvedValue({
      customFunction: {
        id: 'cf-dsr',
        name: 'DSR Example',
        type: 'DSR',
        lifecycleState: 'ACTIVE',
        dataSiloId: 'silo-new',
        hasPendingDraft: false,
      },
      version: {
        id: 'version-1',
        versionNumber: '1',
        lifecycleState: 'ACTIVE',
        successfulTestRun: false,
      },
      ...SIGNED,
    });
    graphql.testRunCustomFunction.mockResolvedValue({
      exitCode: 0,
      logs: [],
      profile: { timeMs: 1 },
    });

    await getTool('custom_functions_test_run').handler({
      id: 'cf-dsr',
      type: 'DSR',
      userDefinedEnv: {},
      allowedHosts: [],
    });

    expect(graphql.testRunCustomFunction.mock.calls[0]?.[0]).not.toHaveProperty('signedCodeJwt');
    const call = graphql.testRunCustomFunction.mock.calls[0]?.[0] as {
      payload: string;
    };
    expect(JSON.parse(Buffer.from(call.payload, 'base64').toString('utf8'))).toMatchObject({
      extras: { dataSilo: { id: 'silo-new' } },
    });
    expect(graphql.updateCustomFunction).not.toHaveBeenCalled();
  });

  it('test-runs upsert payloads before create and sets successfulTestRun', async () => {
    graphql.testRunCustomFunction.mockResolvedValue({
      exitCode: 0,
      logs: [],
      profile: { timeMs: 1 },
    });
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
        successfulTestRun: true,
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
      testPayloads: [{ payload: { message: 'smoke' } }],
    });

    expect(graphql.testRunCustomFunction).toHaveBeenCalled();
    expect(graphql.createCustomFunction).toHaveBeenCalledWith(
      expect.objectContaining({ successfulTestRun: true, ...SIGNED }),
    );
    expect(result).toMatchObject({
      success: true,
      data: { testResults: [{ passed: true, exitCode: 0 }] },
    });
  });

  it('omits id when testPayloads gate an update so GraphQL accepts signed JWTs', async () => {
    graphql.testRunCustomFunction.mockResolvedValue({
      exitCode: 0,
      logs: [],
      profile: { timeMs: 1 },
    });
    graphql.updateCustomFunction.mockResolvedValue({
      id: 'cf-1',
      type: 'DSR',
      dataSiloId: 'silo-1',
      hasPendingDraft: true,
      draftVersion: { id: 'version-2', successfulTestRun: true },
    });

    await getTool('custom_functions_upsert').handler({
      id: 'cf-1',
      type: 'DSR',
      dataSiloId: 'silo-1',
      code: 'export const enricher = () => true; export default enricher;',
      userDefinedEnv: {},
      allowedHosts: [],
      setActive: true,
      promote: false,
      testPayloads: [{}],
    });

    expect(graphql.testRunCustomFunction).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DSR', ...SIGNED }),
    );
    expect(graphql.testRunCustomFunction.mock.calls[0]?.[0]).not.toHaveProperty('id');
  });

  it('rolls back a created DSR silo when upsert testPayloads fail', async () => {
    graphql.testRunCustomFunction.mockResolvedValue({
      exitCode: 1,
      logs: [],
      error: { message: 'boom' },
      profile: { timeMs: 1 },
    });

    const result = await getTool('custom_functions_upsert').handler({
      type: 'DSR',
      name: 'DSR Example',
      code: 'export const enricher = () => true; export default enricher;',
      userDefinedEnv: {},
      allowedHosts: [],
      setActive: true,
      promote: false,
      testPayloads: [{ payload: {} }],
    });

    expect(graphql.createCustomFunction).not.toHaveBeenCalled();
    expect(graphql.deleteDataSilo).toHaveBeenCalledWith('silo-new');
    expect(result).toMatchObject({
      success: false,
      code: 'TEST_FAILED',
    });
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

  it('infers type from a stored function when test_run omits type', async () => {
    graphql.getSignedCustomFunctionVersion.mockResolvedValue({
      customFunction: {
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
      },
      version: {
        id: 'version-1',
        versionNumber: '1',
        lifecycleState: 'ACTIVE',
        successfulTestRun: false,
      },
      ...SIGNED,
    });
    graphql.testRunCustomFunction.mockResolvedValue({
      exitCode: 0,
      logs: [],
      profile: { timeMs: 1 },
    });

    await getTool('custom_functions_test_run').handler({
      id: 'cf-1',
      userDefinedEnv: {},
      allowedHosts: [],
    });

    expect(graphql.testRunCustomFunction).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'GENERAL', ...SIGNED }),
    );
    expect(graphql.testRunCustomFunction.mock.calls[0]?.[0]).not.toHaveProperty('id');
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

  it('rejects unsaved DSR test_run without dataSiloId at the schema', () => {
    const parsed = CustomFunctionsTestRunSchema.safeParse({
      type: 'DSR',
      code: 'export default () => true; export async function enricher() {}',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path[0] === 'dataSiloId')).toBe(true);
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

  it('tells the agent to save after an untested stored run', () => {
    expect(customFunctionNextStep({ kind: 'storedTestNeedsSave', id: 'cf-1' })).toContain(
      'testPayloads',
    );
  });

  it('points a draft at promote_version', () => {
    expect(
      customFunctionNextStep({ kind: 'draft', id: 'cf-1', draftVersionId: 'version-2' }),
    ).toContain('versionId "version-2"');
  });
});

describe('mapCustomFunctionTestRunError', () => {
  it('rewrites JWT-plus-id GraphQL errors', () => {
    expect(
      mapCustomFunctionTestRunError(
        new Error(
          'signedCodeJwt/signedCodeContextJwt are only valid when testing unsaved custom function code; omit them when `input.id` is set',
        ),
      ).message,
    ).toMatch(/omit trial code/);
  });
});

describe('customFunctionDashboardUrl', () => {
  it('points at Developer Tools Custom Functions', () => {
    expect(customFunctionDashboardUrl('https://app.transcend.io/', 'cf-1')).toBe(
      'https://app.transcend.io/infrastructure/functions?functionId=cf-1',
    );
  });
});

describe('didCustomFunctionTestPass', () => {
  it('treats exitCode 0 with no error as a pass', () => {
    expect(didCustomFunctionTestPass({ exitCode: 0 })).toBe(true);
  });

  it('treats negative exit codes as success-with-metadata', () => {
    expect(didCustomFunctionTestPass({ exitCode: -1 })).toBe(true);
  });

  it('fails on a positive exit code or an error', () => {
    expect(didCustomFunctionTestPass({ exitCode: 1 })).toBe(false);
    expect(didCustomFunctionTestPass({ exitCode: 0, error: { message: 'boom' } })).toBe(false);
  });
});

describe('injectDataSiloIntoDsrTestPayload', () => {
  it('overrides extras.dataSilo.id and defaults missing silo fields', () => {
    expect(
      injectDataSiloIntoDsrTestPayload(
        { extras: { dataSilo: { id: 'old' }, request: { id: 'req' } } },
        { id: 'silo-new', title: 'DSR Example' },
      ),
    ).toEqual({
      extras: {
        request: { id: 'req' },
        dataSilo: {
          title: 'DSR Example',
          description: '',
          link: '',
          id: 'silo-new',
        },
      },
    });
  });
});
