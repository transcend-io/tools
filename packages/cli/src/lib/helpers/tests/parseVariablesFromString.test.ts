import { describe, expect, it } from 'vitest';

import {
  parseParametersFromFlags,
  parseParametersFromString,
  parseVariablesFromString,
} from '../parseVariablesFromString.js';

describe('parseParametersFromString', () => {
  it('parses comma-separated key:value pairs', () => {
    expect(parseParametersFromString('domain:acme.com,stage:staging')).toEqual({
      domain: 'acme.com',
      stage: 'staging',
    });
  });

  it('preserves the legacy parser export', () => {
    expect(parseVariablesFromString).toBe(parseParametersFromString);
  });
});

describe('parseParametersFromFlags', () => {
  it('prefers the canonical parameters flag', () => {
    expect(
      parseParametersFromFlags({
        parameters: 'apiKey:secret',
        variables: '',
      }),
    ).toEqual({ apiKey: 'secret' });
  });

  it('preserves the variables compatibility alias', () => {
    expect(
      parseParametersFromFlags({
        parameters: '',
        variables: 'apiKey:legacy-secret',
      }),
    ).toEqual({ apiKey: 'legacy-secret' });
  });

  it('rejects ambiguous values from both flags', () => {
    expect(() =>
      parseParametersFromFlags({
        parameters: 'apiKey:new',
        variables: 'apiKey:old',
      }),
    ).toThrow('Pass either --parameters or --variables, not both.');
  });
});
