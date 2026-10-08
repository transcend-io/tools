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
    expect(graphql.listSombras).toHaveBeenCalled();
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
    graphql.listSombras.mockResolvedValue([
      {
        id: 'sombra-1',
        title: 'Local',
        customerUrl: 'https://sombra.example.com',
        isPrimarySombra: true,
        version: '7.600.0',
      },
    ]);
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

  it('does not delete an auto-created data silo when post-save verification fails', async () => {
    graphql.createCustomFunction.mockResolvedValue({
      id: 'cf-dsr',
      name: 'Fn',
      type: 'DSR',
      hasPendingDraft: true,
      draftVersion: { id: 'version-1', lifecycleState: 'DRAFT' },
    });
    graphql.getSignedCustomFunctionVersion.mockRejectedValue(
      new Error('verification unwrap failed'),
    );

    const result = await getTool('custom_functions_upsert').handler({
      type: 'DSR',
      name: 'Fn',
      code: 'export default () => true;',
    });

    expect(graphql.createCustomFunctionDataSilo).toHaveBeenCalled();
    expect(graphql.deleteDataSilo).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      success: true,
      data: {
        verificationWarning: expect.stringMatching(/verification failed/i),
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
        customFunction: {
          id: 'cf-1',
          type: 'GENERAL',
          sombraId: 'sombra-1',
          hasPendingDraft: false,
        },
        version: { id: 'version-1', lifecycleState: 'ACTIVE' },
        ...SIGNED,
      })
      .mockResolvedValueOnce({
        customFunction: {
          id: 'cf-1',
          type: 'GENERAL',
          sombraId: 'sombra-1',
          hasPendingDraft: true,
        },
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
});
