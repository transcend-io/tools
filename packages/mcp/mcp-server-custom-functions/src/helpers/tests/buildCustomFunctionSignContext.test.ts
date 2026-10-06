import { describe, expect, it } from 'vitest';

import {
  applyEnvVarNames,
  applyEnvironmentVariablesInput,
  buildCustomFunctionSignContext,
  envEntriesFromUnwrappedContext,
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

describe(applyEnvVarNames, () => {
  it('classifies TOKEN as secret and HOST as plain', () => {
    expect(applyEnvVarNames([], ['TOKEN', 'HOST'])).toEqual([
      { key: 'HOST', value: unsetEnvPlaceholder('HOST'), isSecret: false },
      { key: 'TOKEN', value: unsetEnvPlaceholder('TOKEN'), isSecret: true },
    ]);
  });
});
