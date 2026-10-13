import { Buffer } from 'node:buffer';

import {
  ErrorCode,
  ToolError,
  TranscendRestClient,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_GENERAL_TEST_PAYLOAD,
  didCustomFunctionTestPass,
  injectDataSiloIntoDsrTestPayload,
  mapCustomFunctionTestRunError,
} from '../src/helpers/customFunctionTestRun.js';
import type { StoredContextJwtPayload } from '../src/helpers/decodeStoredContextJwt.js';
import { mapCustomFunctionUpsertError } from '../src/helpers/mapUpsertError.js';
import { customFunctionDashboardUrl, customFunctionNextStep } from '../src/helpers/nextStep.js';
import { pickSombraId } from '../src/helpers/resolveSombraId.js';
import { getCustomFunctionsTools } from '../src/tools.js';
import { CustomFunctionsTestRunSchema } from '../src/tools/custom_functions_test_run.js';
import { CustomFunctionsUpsertSchema } from '../src/tools/custom_functions_upsert.js';

const SIGNED = {
  signedCodeJwt: 'signed-code',
  signedCodeContextJwt: 'signed-context',
};

/**
 * Build a fake signed context JWT whose payload {@link decodeStoredContextJwt} can read.
 *
 * @param payload - Context fields stored in the JWT
 * @returns JWT pair for mocks
 */
function signedWithContext(payload: StoredContextJwtPayload = {}) {
  const header = Buffer.from(JSON.stringify({ alg: 'none' }), 'utf8').toString('base64url');
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return {
    signedCodeJwt: 'signed-code',
    signedCodeContextJwt: `${header}.${body}.test`,
  };
}

/** Sign context shape for Sombra >= 7.609 (split secret/plain env maps). */
function splitSignContext(options: {
  secretEnv?: Record<string, string>;
  plaintextEnv?: Record<string, string>;
  allowedHosts: string[];
  allowThirdPartyImports?: boolean;
  timeoutMs?: number;
}) {
  return {
    userDefinedEnv: {},
    secretEnv: options.secretEnv ?? {},
    plaintextEnv: options.plaintextEnv ?? {},
    allowedHosts: options.allowedHosts,
    allowThirdPartyImports: options.allowThirdPartyImports,
    timeoutMs: options.timeoutMs,
  };
}

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
    /** Mock summary-only fetch for promote pre-checks */
    getCustomFunctionSummary: ReturnType<typeof vi.fn>;
    /** Mock version history list */
    listCustomFunctionVersions: ReturnType<typeof vi.fn>;
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
          version: '7.700.0',
        },
      ]),
      createCustomFunctionDataSilo: vi.fn().mockResolvedValue({
        id: 'silo-new',
        title: 'Example',
      }),
      deleteDataSilo: vi.fn(),
      getCustomFunctionSummary: vi.fn().mockResolvedValue({
        id: 'cf-1',
        name: 'Example',
        type: 'GENERAL',
        sombraId: 'sombra-1',
        lifecycleState: 'ACTIVE',
        hasPendingDraft: false,
        activeVersion: {
          id: 'version-1',
          versionNumber: '1',
          lifecycleState: 'ACTIVE',
          successfulTestRun: false,
        },
      }),
      listCustomFunctionVersions: vi.fn().mockResolvedValue([
        {
          id: 'version-1',
          versionNumber: '1',
          lifecycleState: 'ACTIVE',
          lastModifiedAt: '2026-01-01T00:00:00.000Z',
          successfulTestRun: false,
        },
      ]),
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

  it('promote_version warns when the draft was not tested', async () => {
    graphql.getCustomFunctionSummary.mockResolvedValue({
      id: 'cf-1',
      name: 'Example',
      type: 'GENERAL',
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
      },
      dependencyWarnings: [],
    });

    const result = await getTool('custom_functions_promote_version').handler({
      customFunctionId: 'cf-1',
      versionId: 'version-2',
    });

    expect(graphql.promoteCustomFunctionVersion).toHaveBeenCalledWith('cf-1', 'version-2');
    expect(result).toMatchObject({
      success: true,
      data: { untestedWarning: expect.stringContaining('custom_functions_test_run') },
    });
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

  it('unwraps code without returning secret values from unwrap', async () => {
    graphql.getSignedCustomFunctionVersion.mockResolvedValue({
      customFunction: { id: 'cf-1', name: 'Example' },
      version: { id: 'version-1', lifecycleState: 'ACTIVE' },
      ...signedWithContext({
        userDefinedEncryptedEnv: { TOKEN: 'cipher' },
        userDefinedPlaintextEnv: {},
        allowedHosts: [],
      }),
    });
    rest.unwrapCustomFunction.mockResolvedValue({
      code: 'export default () => true;',
      context: {
        secretEnv: { TOKEN: 'super-secret-value' },
        plaintextEnv: {},
        allowedHosts: [],
      },
    });

    const result = await getTool('custom_functions_get_code').handler({ id: 'cf-1' });

    expect(result).toMatchObject({
      success: true,
      data: {
        code: 'export default () => true;',
        environmentVariables: [{ key: 'TOKEN', isSecret: true, isSet: true }],
      },
    });
    expect(JSON.stringify(result)).not.toContain('super-secret-value');
    expect(JSON.stringify(result)).not.toContain('signedCodeJwt');
  });

  it('get_code marks unset placeholder env vars', async () => {
    graphql.getSignedCustomFunctionVersion.mockResolvedValue({
      customFunction: { id: 'cf-1', name: 'Example' },
      version: { id: 'version-1', lifecycleState: 'ACTIVE' },
      ...signedWithContext({
        userDefinedEncryptedEnv: { TOKEN: 'cipher', API_KEY: 'cipher2' },
        userDefinedPlaintextEnv: {},
        allowedHosts: [],
      }),
    });
    rest.unwrapCustomFunction.mockResolvedValue({
      code: 'export default () => true;',
      context: {
        secretEnv: { TOKEN: 'secret', API_KEY: '${API_KEY}' },
        plaintextEnv: {},
        allowedHosts: [],
      },
    });

    const result = await getTool('custom_functions_get_code').handler({ id: 'cf-1' });

    expect(result).toMatchObject({
      success: true,
      data: {
        environmentVariables: [
          { key: 'API_KEY', isSecret: true, isSet: false },
          { key: 'TOKEN', isSecret: true, isSet: true },
        ],
      },
    });
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
        nextStep: expect.stringContaining('no pending draft'),
      },
    });
    expect(result.data).not.toHaveProperty('allowedHostsIgnoredWarning');
  });

  it('rejects allowedHosts on a stored id-only test run', () => {
    const parsed = CustomFunctionsTestRunSchema.safeParse({
      id: 'cf-1',
      type: 'GENERAL',
      allowedHosts: ['pokeapi.co'],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find((item) => item.path.join('.') === 'allowedHosts');
      expect(issue?.message).toMatch(/custom_functions_upsert/);
    }
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
      allowedHosts: [],
    });

    expect(graphql.testRunCustomFunction.mock.calls[0]?.[0]).not.toHaveProperty('signedCodeJwt');
    const call = graphql.testRunCustomFunction.mock.calls[0]?.[0] as {
      payload: string;
    };
    expect(JSON.parse(Buffer.from(call.payload, 'base64').toString('utf8'))).toMatchObject({
      extras: { dataSilo: { id: 'silo-new' } },
    });
    expect(graphql.updateCustomFunction).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'cf-dsr', successfulTestRun: true }),
    );
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
        allowedHosts: [],
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
      allowedHosts: [],
    });

    expect(graphql.testRunCustomFunction).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'GENERAL', ...SIGNED }),
    );
    expect(graphql.testRunCustomFunction.mock.calls[0]?.[0]).not.toHaveProperty('id');
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

  it('returns testFailed nextStep when a stored test run fails', async () => {
    graphql.getSignedCustomFunctionVersion.mockResolvedValue({
      customFunction: { id: 'cf-1', type: 'GENERAL', hasPendingDraft: true },
      version: { id: 'version-2', lifecycleState: 'DRAFT' },
      ...SIGNED,
    });
    graphql.testRunCustomFunction.mockResolvedValue({
      exitCode: 1,
      logs: [],
      error: { message: 'boom' },
      profile: { timeMs: 1 },
    });

    const result = await getTool('custom_functions_test_run').handler({ id: 'cf-1' });

    expect(result).toMatchObject({
      success: true,
      data: {
        passed: false,
        nextStep: expect.stringContaining('passed: false'),
      },
    });
  });
});
