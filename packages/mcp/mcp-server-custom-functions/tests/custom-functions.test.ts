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
import { mergeEnvVarNames } from '../src/helpers/redactEnv.js';
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
    /** Mock primary Sombra version query */
    getPrimarySombraVersion: ReturnType<typeof vi.fn>;
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
        },
      ]),
      createCustomFunctionDataSilo: vi.fn().mockResolvedValue({
        id: 'silo-new',
        title: 'Example',
      }),
      deleteDataSilo: vi.fn(),
      getPrimarySombraVersion: vi.fn().mockResolvedValue('7.700.0'),
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
    graphql.getSignedCustomFunctionVersion.mockResolvedValue({
      customFunction: {
        id: 'cf-1',
        name: 'Example',
        type: 'GENERAL',
        hasPendingDraft: false,
      },
      version: { id: 'version-1', lifecycleState: 'ACTIVE' },
      ...SIGNED,
    });
    rest.unwrapCustomFunction.mockResolvedValue({
      code: 'export default () => true;',
      context: { userDefinedEnv: {}, allowedHosts: [] },
    });

    const result = await getTool('custom_functions_upsert').handler({
      type: 'GENERAL',
      name: 'Example',
      sombraId: 'sombra-1',
      code: 'export default () => true;',
      allowedHosts: [],
    });

    expect(rest.signCustomFunction).toHaveBeenCalledWith({
      code: 'export default () => true;',
      context: splitSignContext({ allowedHosts: [] }),
    });
    expect(graphql.createCustomFunction).toHaveBeenCalledWith(expect.objectContaining(SIGNED));
    expect(graphql.listSombras).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain('signedCodeJwt');
    expect(JSON.stringify(result)).not.toContain('signedCodeContextJwt');
    expect(JSON.stringify(result)).not.toContain('dashboardHint');
    expect(result).toMatchObject({
      success: true,
      data: {
        environmentVariables: [],
        settings: { allowedHosts: [] },
        allowedHostsPersistWarning: undefined,
        nextStep: expect.stringMatching(/custom_functions_test_run/),
      },
    });
  });

  it('preserves stored env and hosts on update when omitted', async () => {
    graphql.getCustomFunctionSummary.mockResolvedValue({
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
    });
    graphql.getSignedCustomFunctionVersion.mockResolvedValue({
      customFunction: {
        id: 'cf-1',
        name: 'Example',
        type: 'GENERAL',
        sombraId: 'sombra-1',
        hasPendingDraft: false,
      },
      version: { id: 'version-1', lifecycleState: 'ACTIVE' },
      ...SIGNED,
    });
    rest.unwrapCustomFunction.mockResolvedValue({
      code: 'export default () => false;',
      context: {
        userDefinedEnv: { TOKEN: 'secret' },
        allowedHosts: ['api.example.com', 'localhost'],
        allowThirdPartyImports: true,
        timeoutMs: 5000,
      },
    });
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

    await getTool('custom_functions_upsert').handler({
      id: 'cf-1',
      type: 'GENERAL',
      code: 'export default () => true;',
    });

    expect(rest.unwrapCustomFunction).toHaveBeenCalled();
    expect(rest.signCustomFunction).toHaveBeenCalledWith({
      code: 'export default () => true;',
      context: splitSignContext({
        secretEnv: { TOKEN: 'secret' },
        allowedHosts: ['api.example.com', 'localhost'],
        allowThirdPartyImports: true,
        timeoutMs: 5000,
      }),
    });
  });

  it('creates empty env placeholders from environmentVariables without secret values', async () => {
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
    rest.unwrapCustomFunction.mockResolvedValue({
      code: 'export default () => true;',
      context: {
        secretEnv: { API_KEY: '${API_KEY}' },
        plaintextEnv: { BASE_URL: '${BASE_URL}' },
        allowedHosts: [],
      },
    });
    graphql.getSignedCustomFunctionVersion.mockResolvedValue({
      customFunction: {
        id: 'cf-1',
        name: 'Example',
        type: 'GENERAL',
        hasPendingDraft: false,
      },
      version: { id: 'version-1', lifecycleState: 'ACTIVE' },
      ...signedWithContext({
        userDefinedEncryptedEnv: { API_KEY: 'cipher' },
        userDefinedPlaintextEnv: { BASE_URL: '${BASE_URL}' },
        allowedHosts: [],
      }),
    });

    const result = await getTool('custom_functions_upsert').handler({
      type: 'GENERAL',
      name: 'Example',
      sombraId: 'sombra-1',
      code: 'export default () => true;',
      environmentVariables: [
        { key: 'API_KEY', isSecret: true },
        { key: 'BASE_URL', isSecret: false },
      ],
      allowedHosts: [],
    });

    expect(rest.signCustomFunction).toHaveBeenCalledWith({
      code: 'export default () => true;',
      context: splitSignContext({
        secretEnv: { API_KEY: '${API_KEY}' },
        plaintextEnv: { BASE_URL: '${BASE_URL}' },
        allowedHosts: [],
      }),
    });
    expect(result).toMatchObject({
      success: true,
      data: {
        environmentVariables: expect.arrayContaining([
          { key: 'API_KEY', isSecret: true, isSet: false },
          { key: 'BASE_URL', isSecret: false, isSet: false },
        ]),
        envPersistWarning: undefined,
        settings: { allowedHosts: [] },
        allowedHostsPersistWarning: undefined,
        nextStep: expect.stringContaining('API_KEY'),
        dashboardHint: expect.any(String),
      },
    });
  });

  it('adds missing env names on update without overwriting stored secrets', async () => {
    graphql.getCustomFunctionSummary.mockResolvedValue({
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
    });
    const activeSigned = {
      customFunction: {
        id: 'cf-1',
        name: 'Example',
        type: 'GENERAL',
        sombraId: 'sombra-1',
        hasPendingDraft: false,
      },
      version: { id: 'version-1', lifecycleState: 'ACTIVE' },
      ...SIGNED,
    };
    graphql.getSignedCustomFunctionVersion
      .mockResolvedValueOnce(activeSigned)
      .mockResolvedValueOnce(activeSigned);
    rest.unwrapCustomFunction
      .mockResolvedValueOnce({
        code: 'export default () => false;',
        context: {
          userDefinedEnv: { TOKEN: 'secret' },
          allowedHosts: [],
        },
      })
      .mockResolvedValueOnce({
        code: 'export default () => true;',
        context: {
          userDefinedEnv: { TOKEN: 'secret', NEW_HOST: '${NEW_HOST}' },
          allowedHosts: [],
        },
      });
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

    graphql.getSignedCustomFunctionVersion.mockResolvedValueOnce({
      customFunction: {
        id: 'cf-1',
        name: 'Example',
        type: 'GENERAL',
        sombraId: 'sombra-1',
        hasPendingDraft: true,
        draftVersion: { id: 'version-2' },
      },
      version: { id: 'version-2', lifecycleState: 'DRAFT' },
      ...signedWithContext({
        userDefinedEncryptedEnv: { TOKEN: 'cipher' },
        userDefinedPlaintextEnv: { NEW_HOST: '${NEW_HOST}' },
        allowedHosts: [],
      }),
    });

    const result = await getTool('custom_functions_upsert').handler({
      id: 'cf-1',
      code: 'export default () => true;',
      environmentVariables: [
        { key: 'TOKEN', isSecret: true },
        { key: 'NEW_HOST', isSecret: false },
      ],
      allowedHosts: [],
    });

    expect(rest.signCustomFunction).toHaveBeenCalledWith({
      code: 'export default () => true;',
      context: splitSignContext({
        secretEnv: { TOKEN: 'secret' },
        plaintextEnv: { NEW_HOST: '${NEW_HOST}' },
        allowedHosts: [],
      }),
    });
    expect(result).toMatchObject({
      success: true,
      data: {
        nextStep: expect.stringMatching(/promote_version/),
      },
    });
  });

  it('returns envPersistWarning when declared names are missing after write', async () => {
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
    graphql.getSignedCustomFunctionVersion.mockResolvedValue({
      customFunction: { id: 'cf-1', hasPendingDraft: false },
      version: { id: 'version-1', lifecycleState: 'ACTIVE' },
      ...SIGNED,
    });
    rest.unwrapCustomFunction.mockResolvedValue({
      code: 'export default () => true;',
      context: { userDefinedEnv: {}, allowedHosts: [] },
    });

    const result = await getTool('custom_functions_upsert').handler({
      type: 'GENERAL',
      name: 'Example',
      sombraId: 'sombra-1',
      code: 'export default () => true;',
      environmentVariables: [{ key: 'TRANSCEND_API_KEY', isSecret: true }],
      allowedHosts: [],
    });

    expect(result).toMatchObject({
      success: true,
      data: {
        environmentVariables: [],
        envPersistWarning: expect.stringContaining('TRANSCEND_API_KEY'),
      },
    });
  });

  it('returns verified allowedHosts after create', async () => {
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
    graphql.getSignedCustomFunctionVersion.mockResolvedValue({
      customFunction: { id: 'cf-1', hasPendingDraft: false },
      version: { id: 'version-1', lifecycleState: 'ACTIVE' },
      ...signedWithContext({
        allowedHosts: ['localhost', 'pokeapi.co'],
        userDefinedPlaintextEnv: {},
      }),
    });
    rest.unwrapCustomFunction.mockResolvedValue({
      code: 'export default () => true;',
      context: {
        userDefinedEnv: {},
        allowedHosts: ['localhost', 'pokeapi.co'],
      },
    });

    const result = await getTool('custom_functions_upsert').handler({
      type: 'GENERAL',
      name: 'Example',
      sombraId: 'sombra-1',
      code: 'export default () => true;',
      allowedHosts: ['pokeapi.co', 'localhost'],
    });

    expect(rest.signCustomFunction).toHaveBeenCalledWith({
      code: 'export default () => true;',
      context: splitSignContext({ allowedHosts: ['pokeapi.co', 'localhost'] }),
    });
    expect(result).toMatchObject({
      success: true,
      data: {
        settings: { allowedHosts: ['localhost', 'pokeapi.co'] },
        allowedHostsPersistWarning: undefined,
      },
    });
  });

  it('returns allowedHostsPersistWarning when declared hosts are missing after write', async () => {
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
    graphql.getSignedCustomFunctionVersion.mockResolvedValue({
      customFunction: { id: 'cf-1', hasPendingDraft: false },
      version: { id: 'version-1', lifecycleState: 'ACTIVE' },
      ...SIGNED,
    });
    rest.unwrapCustomFunction.mockResolvedValue({
      code: 'export default () => true;',
      context: { userDefinedEnv: {}, allowedHosts: [] },
    });

    const result = await getTool('custom_functions_upsert').handler({
      type: 'GENERAL',
      name: 'Example',
      sombraId: 'sombra-1',
      code: 'export default () => true;',
      allowedHosts: ['pokeapi.co', 'localhost'],
    });

    expect(result).toMatchObject({
      success: true,
      data: {
        settings: { allowedHosts: [] },
        allowedHostsPersistWarning: expect.stringContaining('pokeapi.co'),
      },
    });
  });

  it('replaces allowedHosts on update when provided', async () => {
    graphql.getCustomFunctionSummary.mockResolvedValue({
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
    });
    const activeSigned = {
      customFunction: {
        id: 'cf-1',
        name: 'Example',
        type: 'GENERAL',
        sombraId: 'sombra-1',
        hasPendingDraft: false,
      },
      version: { id: 'version-1', lifecycleState: 'ACTIVE' },
      ...SIGNED,
    };
    const draftSigned = {
      customFunction: {
        id: 'cf-1',
        name: 'Example',
        type: 'GENERAL',
        hasPendingDraft: true,
        draftVersion: { id: 'version-2' },
      },
      version: { id: 'version-2', lifecycleState: 'DRAFT' },
      ...signedWithContext({
        allowedHosts: ['pokeapi.co', 'localhost'],
        userDefinedPlaintextEnv: {},
      }),
    };
    graphql.getSignedCustomFunctionVersion
      .mockResolvedValueOnce(activeSigned)
      .mockResolvedValueOnce(draftSigned);
    rest.unwrapCustomFunction
      .mockResolvedValueOnce({
        code: 'export default () => "stored";',
        context: {
          userDefinedEnv: {},
          allowedHosts: ['old.example.com'],
        },
      })
      .mockResolvedValueOnce({
        code: 'export default () => "stored";',
        context: {
          userDefinedEnv: {},
          allowedHosts: ['pokeapi.co', 'localhost'],
        },
      });
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

    const result = await getTool('custom_functions_upsert').handler({
      id: 'cf-1',
      type: 'GENERAL',
      allowedHosts: ['pokeapi.co', 'localhost'],
    });

    expect(rest.signCustomFunction).toHaveBeenCalledWith({
      code: 'export default () => "stored";',
      context: splitSignContext({ allowedHosts: ['pokeapi.co', 'localhost'] }),
    });

    expect(result).toMatchObject({
      success: true,
      data: {
        settings: { allowedHosts: ['pokeapi.co', 'localhost'] },
        allowedHostsPersistWarning: undefined,
      },
    });
  });

  it('re-signs stored code when code is omitted on update', async () => {
    graphql.getCustomFunctionSummary.mockResolvedValue({
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
    });
    graphql.getSignedCustomFunctionVersion.mockResolvedValue({
      customFunction: {
        id: 'cf-1',
        name: 'Example',
        type: 'GENERAL',
        sombraId: 'sombra-1',
        hasPendingDraft: false,
      },
      version: { id: 'version-1', lifecycleState: 'ACTIVE' },
      ...SIGNED,
    });
    rest.unwrapCustomFunction
      .mockResolvedValueOnce({
        code: 'export default () => "stored";',
        context: {
          userDefinedEnv: {},
          allowedHosts: ['api.example.com'],
        },
      })
      .mockResolvedValueOnce({
        code: 'export default () => "stored";',
        context: {
          userDefinedEnv: { API_KEY: '${API_KEY}' },
          allowedHosts: ['api.example.com'],
        },
      });
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

    await getTool('custom_functions_upsert').handler({
      id: 'cf-1',
      environmentVariables: [{ key: 'API_KEY', isSecret: true }],
    });

    expect(rest.signCustomFunction).toHaveBeenCalledWith({
      code: 'export default () => "stored";',
      context: splitSignContext({
        secretEnv: { API_KEY: '${API_KEY}' },
        allowedHosts: ['api.example.com'],
      }),
    });
  });

  it('rejects create without code', () => {
    expect(() =>
      CustomFunctionsUpsertSchema.parse({
        type: 'GENERAL',
        name: 'Example',
      }),
    ).toThrow(/code/);
  });

  it('uses legacy userDefinedEnv when Sombra predates split env maps', async () => {
    graphql.getCustomFunctionSummary.mockResolvedValue({
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
    });
    graphql.getPrimarySombraVersion.mockResolvedValue('7.600.0');
    rest.unwrapCustomFunction.mockResolvedValue({
      code: 'export default () => true;',
      context: { userDefinedEnv: { TOKEN: 'secret' }, allowedHosts: [] },
    });
    graphql.getSignedCustomFunctionVersion.mockResolvedValue({
      customFunction: {
        id: 'cf-1',
        name: 'Example',
        type: 'GENERAL',
        sombraId: 'sombra-1',
        hasPendingDraft: false,
      },
      version: { id: 'version-1', lifecycleState: 'ACTIVE' },
      ...SIGNED,
    });
    graphql.updateCustomFunction.mockResolvedValue({
      id: 'cf-1',
      name: 'Example',
      type: 'GENERAL',
      hasPendingDraft: true,
      draftVersion: { id: 'version-2' },
    });

    await getTool('custom_functions_upsert').handler({
      id: 'cf-1',
      type: 'GENERAL',
      code: 'export default () => true;',
    });

    expect(rest.signCustomFunction).toHaveBeenCalledWith({
      code: 'export default () => true;',
      context: {
        userDefinedEnv: { TOKEN: 'secret' },
        allowedHosts: [],
        allowThirdPartyImports: undefined,
        timeoutMs: undefined,
      },
    });
  });

  it('honors environmentVariables isSecret on create', async () => {
    graphql.createCustomFunction.mockResolvedValue({
      id: 'cf-1',
      name: 'Example',
      type: 'GENERAL',
      hasPendingDraft: false,
    });
    graphql.getSignedCustomFunctionVersion.mockResolvedValue({
      customFunction: { id: 'cf-1', hasPendingDraft: false },
      version: { id: 'version-1', lifecycleState: 'ACTIVE' },
      ...SIGNED,
    });
    rest.unwrapCustomFunction.mockResolvedValue({
      code: 'export default () => true;',
      context: { userDefinedEnv: {}, allowedHosts: [] },
    });

    await getTool('custom_functions_upsert').handler({
      type: 'GENERAL',
      name: 'Example',
      sombraId: 'sombra-1',
      code: 'export default () => true;',
      environmentVariables: [
        { key: 'NOT_A_SECRET_NAME', value: '${NOT_A_SECRET_NAME}', isSecret: true },
        { key: 'PUBLIC_HOST', value: 'https://example.com', isSecret: false },
      ],
      allowedHosts: [],
    });

    expect(rest.signCustomFunction).toHaveBeenCalledWith({
      code: 'export default () => true;',
      context: splitSignContext({
        secretEnv: { NOT_A_SECRET_NAME: '${NOT_A_SECRET_NAME}' },
        plaintextEnv: { PUBLIC_HOST: 'https://example.com' },
        allowedHosts: [],
      }),
    });
  });

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

  it('description-only upsert skips signing and does not send JWTs', async () => {
    graphql.updateCustomFunction.mockResolvedValue({
      id: 'cf-1',
      name: 'Renamed',
      type: 'GENERAL',
      hasPendingDraft: false,
    });

    await getTool('custom_functions_upsert').handler({
      id: 'cf-1',
      description: 'New description only',
    });

    expect(rest.signCustomFunction).not.toHaveBeenCalled();
    expect(graphql.updateCustomFunction).toHaveBeenCalledWith({
      id: 'cf-1',
      description: 'New description only',
    });
    expect(graphql.getSignedCustomFunctionVersion).not.toHaveBeenCalled();
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
    graphql.getSignedCustomFunctionVersion.mockResolvedValue({
      customFunction: { id: 'cf-1', hasPendingDraft: false },
      version: { id: 'version-1', lifecycleState: 'ACTIVE' },
      ...SIGNED,
    });
    rest.unwrapCustomFunction.mockResolvedValue({
      code: 'export default () => true;',
      context: { userDefinedEnv: {}, allowedHosts: [] },
    });

    await getTool('custom_functions_upsert').handler({
      type: 'GENERAL',
      name: 'Example',
      code: 'export default () => true;',
      allowedHosts: [],
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
    graphql.getSignedCustomFunctionVersion.mockResolvedValue({
      customFunction: { id: 'cf-dsr', hasPendingDraft: false },
      version: { id: 'version-1', lifecycleState: 'ACTIVE' },
      ...SIGNED,
    });
    rest.unwrapCustomFunction.mockResolvedValue({
      code: 'export const enricher = () => true; export default enricher;',
      context: { userDefinedEnv: {}, allowedHosts: [] },
    });

    await getTool('custom_functions_upsert').handler({
      type: 'DSR',
      name: 'DSR Example',
      code: 'export const enricher = () => true; export default enricher;',
      allowedHosts: [],
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
        allowedHosts: [],
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

  it('continues the pending draft when versionId is omitted on GENERAL update', async () => {
    graphql.getCustomFunctionSummary.mockResolvedValue({
      id: 'cf-1',
      name: 'Example',
      type: 'GENERAL',
      sombraId: 'sombra-1',
      lifecycleState: 'ACTIVE',
      hasPendingDraft: true,
      activeVersion: {
        id: 'version-1',
        versionNumber: '1',
        lifecycleState: 'ACTIVE',
        successfulTestRun: true,
      },
      draftVersion: {
        id: 'version-2',
        versionNumber: '1.1',
        lifecycleState: 'DRAFT',
        successfulTestRun: false,
      },
    });
    graphql.getSignedCustomFunctionVersion
      .mockResolvedValueOnce({
        customFunction: {
          id: 'cf-1',
          type: 'GENERAL',
          hasPendingDraft: true,
          draftVersion: { id: 'version-2' },
        },
        version: { id: 'version-2', lifecycleState: 'DRAFT' },
        ...SIGNED,
      })
      .mockResolvedValueOnce({
        customFunction: {
          id: 'cf-1',
          type: 'GENERAL',
          hasPendingDraft: true,
          draftVersion: { id: 'version-2' },
        },
        version: { id: 'version-2', lifecycleState: 'DRAFT' },
        ...signedWithContext({ allowedHosts: ['api.example.com'], userDefinedPlaintextEnv: {} }),
      });
    rest.unwrapCustomFunction
      .mockResolvedValueOnce({
        code: 'export default () => "draft";',
        context: { userDefinedEnv: {}, allowedHosts: [] },
      })
      .mockResolvedValueOnce({
        code: 'export default () => "draft";',
        context: { userDefinedEnv: {}, allowedHosts: ['api.example.com'] },
      });
    graphql.updateCustomFunction.mockResolvedValue({
      id: 'cf-1',
      type: 'GENERAL',
      hasPendingDraft: true,
      draftVersion: { id: 'version-2', lifecycleState: 'DRAFT', successfulTestRun: false },
    });

    await getTool('custom_functions_upsert').handler({
      id: 'cf-1',
      allowedHosts: ['api.example.com'],
    });

    expect(graphql.updateCustomFunction).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'cf-1', versionId: 'version-2' }),
    );
  });

  it('rejects editing the active version by versionId', async () => {
    graphql.getCustomFunctionSummary.mockResolvedValue({
      id: 'cf-1',
      type: 'GENERAL',
      hasPendingDraft: true,
      activeVersion: {
        id: 'version-1',
        versionNumber: '1',
        lifecycleState: 'ACTIVE',
        successfulTestRun: true,
      },
      draftVersion: {
        id: 'version-2',
        versionNumber: '1.1',
        lifecycleState: 'DRAFT',
        successfulTestRun: false,
      },
    });

    await expect(
      getTool('custom_functions_upsert').handler({
        id: 'cf-1',
        versionId: 'version-1',
        code: 'export default () => true;',
      }),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_ERROR });
  });

  it('rejects type changes on update', async () => {
    graphql.getCustomFunctionSummary.mockResolvedValue({
      id: 'cf-1',
      type: 'GENERAL',
      hasPendingDraft: false,
      activeVersion: { id: 'version-1', lifecycleState: 'ACTIVE', successfulTestRun: false },
    });

    await expect(
      getTool('custom_functions_upsert').handler({
        id: 'cf-1',
        type: 'DSR',
        code: 'export default () => true;',
      }),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_ERROR });
  });

  it('rejects no-op updates with only id', async () => {
    await expect(getTool('custom_functions_upsert').handler({ id: 'cf-1' })).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_ERROR,
    });
  });

  it('removes environment variables on update', async () => {
    graphql.getCustomFunctionSummary.mockResolvedValue({
      id: 'cf-1',
      type: 'GENERAL',
      sombraId: 'sombra-1',
      hasPendingDraft: false,
      activeVersion: { id: 'version-1', lifecycleState: 'ACTIVE', successfulTestRun: false },
    });
    graphql.getSignedCustomFunctionVersion
      .mockResolvedValueOnce({
        customFunction: { id: 'cf-1', type: 'GENERAL', hasPendingDraft: false },
        version: { id: 'version-1', lifecycleState: 'ACTIVE' },
        ...SIGNED,
      })
      .mockResolvedValueOnce({
        customFunction: { id: 'cf-1', type: 'GENERAL', hasPendingDraft: true },
        version: { id: 'version-2', lifecycleState: 'DRAFT' },
        ...signedWithContext({
          userDefinedPlaintextEnv: { KEEP: 'y' },
          allowedHosts: [],
        }),
      });
    rest.unwrapCustomFunction
      .mockResolvedValueOnce({
        code: 'export default () => true;',
        context: {
          plaintextEnv: { OLD_KEY: 'x', KEEP: 'y' },
          secretEnv: {},
          allowedHosts: [],
        },
      })
      .mockResolvedValueOnce({
        code: 'export default () => true;',
        context: {
          plaintextEnv: { KEEP: 'y' },
          secretEnv: {},
          allowedHosts: [],
        },
      });
    graphql.updateCustomFunction.mockResolvedValue({
      id: 'cf-1',
      type: 'GENERAL',
      hasPendingDraft: true,
      draftVersion: { id: 'version-2', lifecycleState: 'DRAFT', successfulTestRun: false },
    });

    await getTool('custom_functions_upsert').handler({
      id: 'cf-1',
      removeEnvironmentVariables: ['OLD_KEY'],
    });

    expect(rest.signCustomFunction).toHaveBeenCalledWith({
      code: 'export default () => true;',
      context: splitSignContext({
        plaintextEnv: { KEEP: 'y' },
        allowedHosts: [],
      }),
    });
  });

  it('returns envClassificationWarning on plain-to-secret flip', async () => {
    graphql.getCustomFunctionSummary.mockResolvedValue({
      id: 'cf-1',
      type: 'GENERAL',
      sombraId: 'sombra-1',
      hasPendingDraft: false,
      activeVersion: { id: 'version-1', lifecycleState: 'ACTIVE', successfulTestRun: false },
    });
    graphql.getSignedCustomFunctionVersion
      .mockResolvedValueOnce({
        customFunction: { id: 'cf-1', type: 'GENERAL', hasPendingDraft: false },
        version: { id: 'version-1', lifecycleState: 'ACTIVE' },
        ...SIGNED,
      })
      .mockResolvedValueOnce({
        customFunction: { id: 'cf-1', type: 'GENERAL', hasPendingDraft: true },
        version: { id: 'version-2', lifecycleState: 'DRAFT' },
        ...signedWithContext({
          userDefinedEncryptedEnv: { API_KEY: 'cipher' },
          allowedHosts: [],
        }),
      });
    rest.unwrapCustomFunction
      .mockResolvedValueOnce({
        code: 'export default () => true;',
        context: {
          plaintextEnv: { API_KEY: 'visible' },
          secretEnv: {},
          allowedHosts: [],
        },
      })
      .mockResolvedValueOnce({
        code: 'export default () => true;',
        context: {
          plaintextEnv: {},
          secretEnv: { API_KEY: 'visible' },
          allowedHosts: [],
        },
      });
    graphql.updateCustomFunction.mockResolvedValue({
      id: 'cf-1',
      type: 'GENERAL',
      hasPendingDraft: true,
      draftVersion: { id: 'version-2', lifecycleState: 'DRAFT', successfulTestRun: false },
    });

    const result = await getTool('custom_functions_upsert').handler({
      id: 'cf-1',
      environmentVariables: [{ key: 'API_KEY', isSecret: true }],
    });

    expect(result).toMatchObject({
      success: true,
      data: {
        envClassificationWarning: expect.stringContaining('API_KEY'),
      },
    });
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

describe('mergeEnvVarNames', () => {
  it('creates non-empty placeholders for new names and keeps stored values', () => {
    expect(
      mergeEnvVarNames({
        stored: { TOKEN: 'secret' },
        envVarNames: ['TOKEN', 'API_KEY'],
      }),
    ).toEqual({ TOKEN: 'secret', API_KEY: '${API_KEY}' });
  });

  it('returns empty object when creating with no names', () => {
    expect(mergeEnvVarNames({})).toEqual({});
  });

  it('uses a non-empty sentinel so Sombra does not drop new keys', () => {
    expect(mergeEnvVarNames({ envVarNames: ['TRANSCEND_API_KEY'] })).toEqual({
      TRANSCEND_API_KEY: '${TRANSCEND_API_KEY}',
    });
  });
});

describe('customFunctionNextStep', () => {
  it('points create at test_run', () => {
    const step = customFunctionNextStep({ kind: 'created', id: 'cf-1' });
    expect(step).toContain('custom_functions_test_run');
  });

  it('names unset env keys after create', () => {
    expect(
      customFunctionNextStep({
        kind: 'created',
        id: 'cf-1',
        unsetEnvKeys: ['API_KEY', 'BASE_URL'],
      }),
    ).toContain('API_KEY, BASE_URL');
  });

  it('tells the agent to upsert after an unsaved trial', () => {
    expect(customFunctionNextStep({ kind: 'storedTestNeedsSave', id: 'cf-1' })).toContain(
      'custom_functions_upsert',
    );
  });

  it('points a draft at test_run then promote_version', () => {
    expect(
      customFunctionNextStep({ kind: 'draft', id: 'cf-1', draftVersionId: 'version-2' }),
    ).toContain('versionId "version-2"');
    expect(
      customFunctionNextStep({ kind: 'draft', id: 'cf-1', draftVersionId: 'version-2' }),
    ).toContain('custom_functions_test_run');
  });
});

describe('mapCustomFunctionUpsertError', () => {
  it('rewrites silo eligibility failures with inventory recovery guidance', () => {
    const mapped = mapCustomFunctionUpsertError(
      new Error('Data silo connectionState must be NOT_CONFIGURED to attach a function'),
      { dataSiloId: 'silo-1' },
    );
    expect(mapped).toBeInstanceOf(ToolError);
    expect(mapped.message).toMatch(/inventory_get_data_silo[\s\S]*omit dataSiloId/);
    expect((mapped as ToolError).code).toBe(ErrorCode.VALIDATION_ERROR);
    expect((mapped as ToolError).retryable).toBe(false);
    expect((mapped as ToolError).details).toEqual({
      dataSiloId: 'silo-1',
      recoveryTool: 'inventory_get_data_silo',
    });
  });

  it('passes through unrelated GraphQL errors unchanged', () => {
    const original = new Error('name already has been taken');
    expect(mapCustomFunctionUpsertError(original)).toBe(original);
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
