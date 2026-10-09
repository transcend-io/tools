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
