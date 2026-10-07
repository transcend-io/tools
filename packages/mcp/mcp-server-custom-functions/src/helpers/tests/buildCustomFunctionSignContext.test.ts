import { describe, expect, it } from 'vitest';

import {
  applyEnvironmentVariablesInput,
  assertSignContextPreservesEnvKeys,
  buildCustomFunctionSignContext,
  envEntriesFromUnwrappedContext,
  plainToSecretFlipKeys,
  removeEnvironmentVariableKeys,
  secretToPlainFlipError,
  sombraSupportsCustomFunctionSplitEnv,
} from '../buildCustomFunctionSignContext.js';
import { unsetEnvPlaceholder } from '../redactEnv.js';

describe('sombraSupportsCustomFunctionSplitEnv', () => {
  it('returns true for versions at or above 7.609.0', () => {
    expect(sombraSupportsCustomFunctionSplitEnv('7.609.0')).toBe(true);
    expect(sombraSupportsCustomFunctionSplitEnv('7.700.1')).toBe(true);
  });

  it('returns false for older versions', () => {
    expect(sombraSupportsCustomFunctionSplitEnv('7.608.9')).toBe(false);
  });

  it('returns false when the signing gateway version is unknown', () => {
    expect(sombraSupportsCustomFunctionSplitEnv(undefined)).toBe(false);
    expect(sombraSupportsCustomFunctionSplitEnv('')).toBe(false);
    expect(sombraSupportsCustomFunctionSplitEnv('not-a-version')).toBe(false);
  });
});

describe(assertSignContextPreservesEnvKeys, () => {
  it('throws when the sign context would drop env keys', () => {
    expect(() =>
      assertSignContextPreservesEnvKeys(
        ['KEEP_ME'],
        buildCustomFunctionSignContext({
          supportsSplitEnv: true,
          allowedHosts: [],
          envEntries: [],
        }),
      ),
    ).toThrow(/KEEP_ME/);
  });
});

describe(buildCustomFunctionSignContext, () => {
  it('builds split maps with empty userDefinedEnv', () => {
    expect(
      buildCustomFunctionSignContext({
        supportsSplitEnv: true,
        allowedHosts: ['*'],
        envEntries: [
          { key: 'API_KEY', value: 'secret', isSecret: true },
          { key: 'HOST', value: 'https://example.com', isSecret: false },
        ],
      }),
    ).toEqual({
      userDefinedEnv: {},
      allowedHosts: ['*'],
      allowThirdPartyImports: undefined,
      timeoutMs: undefined,
      secretEnv: { API_KEY: 'secret' },
      plaintextEnv: { HOST: 'https://example.com' },
    });
  });

  it('includes empty plaintextEnv for secrets-only functions', () => {
    expect(
      buildCustomFunctionSignContext({
        supportsSplitEnv: true,
        allowedHosts: [],
        envEntries: [{ key: 'API_KEY', value: 'x', isSecret: true }],
      }).plaintextEnv,
    ).toEqual({});
  });

  it('falls back to legacy userDefinedEnv when split env is unsupported', () => {
    expect(
      buildCustomFunctionSignContext({
        supportsSplitEnv: false,
        allowedHosts: [],
        envEntries: [
          { key: 'API_KEY', value: 'secret', isSecret: true },
          { key: 'HOST', value: 'https://example.com', isSecret: false },
        ],
      }),
    ).toEqual({
      userDefinedEnv: { API_KEY: 'secret', HOST: 'https://example.com' },
      allowedHosts: [],
      allowThirdPartyImports: undefined,
      timeoutMs: undefined,
    });
  });
});

describe(envEntriesFromUnwrappedContext, () => {
  it('uses split unwrap maps when present', () => {
    expect(
      envEntriesFromUnwrappedContext({
        allowedHosts: [],
        secretEnv: { API_KEY: '' },
        plaintextEnv: { HOST: 'https://example.com' },
      }),
    ).toEqual([
      { key: 'API_KEY', value: '', isSecret: true },
      { key: 'HOST', value: 'https://example.com', isSecret: false },
    ]);
  });

  it('uses stored JWT classification when unwrap is legacy merged', () => {
    expect(
      envEntriesFromUnwrappedContext(
        {
          allowedHosts: [],
          userDefinedEnv: { API_KEY: 'cipher', HOST: 'https://example.com' },
        },
        {
          userDefinedEncryptedEnv: { API_KEY: 'cipher' },
          userDefinedPlaintextEnv: { HOST: 'https://example.com' },
        },
      ),
    ).toEqual([
      { key: 'API_KEY', value: 'cipher', isSecret: true },
      { key: 'HOST', value: 'https://example.com', isSecret: false },
    ]);
  });

  it('treats all keys as secret when the stored JWT uses legacy merged env only', () => {
    expect(
      envEntriesFromUnwrappedContext(
        {
          allowedHosts: [],
          userDefinedEnv: { CUSTOM_FLAG: 'plain-looking' },
        },
        {
          userDefinedEncryptedEnv: { CUSTOM_FLAG: 'cipher' },
        },
      ),
    ).toEqual([{ key: 'CUSTOM_FLAG', value: 'plain-looking', isSecret: true }]);
  });
});

describe(applyEnvironmentVariablesInput, () => {
  it('applies explicit isSecret classification', () => {
    const entries = applyEnvironmentVariablesInput(
      [],
      [
        { key: 'CUSTOM_FLAG', value: 'plain', isSecret: false },
        { key: 'WEBHOOK_SECRET', value: unsetEnvPlaceholder('WEBHOOK_SECRET'), isSecret: true },
      ],
    );
    expect(entries).toEqual([
      { key: 'CUSTOM_FLAG', value: 'plain', isSecret: false },
      {
        key: 'WEBHOOK_SECRET',
        value: unsetEnvPlaceholder('WEBHOOK_SECRET'),
        isSecret: true,
      },
    ]);
  });
});

describe(secretToPlainFlipError, () => {
  it('blocks flipping a stored secret to plain', () => {
    expect(
      secretToPlainFlipError(
        [{ key: 'API_KEY', value: 'cipher', isSecret: true }],
        [{ key: 'API_KEY', isSecret: false }],
      ),
    ).toMatch(/Cannot change "API_KEY"/);
  });
});

describe(removeEnvironmentVariableKeys, () => {
  it('drops listed keys from env rows', () => {
    expect(
      removeEnvironmentVariableKeys(
        [
          { key: 'OLD', value: 'x', isSecret: false },
          { key: 'KEEP', value: 'y', isSecret: false },
        ],
        ['OLD'],
      ),
    ).toEqual([{ key: 'KEEP', value: 'y', isSecret: false }]);
  });
});

describe(plainToSecretFlipKeys, () => {
  it('detects plain-to-secret classification changes', () => {
    expect(
      plainToSecretFlipKeys(
        [{ key: 'API_KEY', value: 'visible', isSecret: false }],
        [{ key: 'API_KEY', isSecret: true }],
      ),
    ).toEqual(['API_KEY']);
  });
});
