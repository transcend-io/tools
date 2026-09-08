import { describe, expect, it } from 'vitest';

import { parseVariablesFromString } from '../parseVariablesFromString.js';

describe('parseVariablesFromString', () => {
  it('parses comma-separated key:value pairs', () => {
    expect(parseVariablesFromString('domain:acme.com,stage:staging')).toEqual({
      domain: 'acme.com',
      stage: 'staging',
    });
  });

  it('preserves colons and escaped commas in values', () => {
    expect(
      parseVariablesFromString(
        String.raw`endpoint:https://api.example.com:8443,token:first\,second,path:C:\\temp`,
      ),
    ).toEqual({
      endpoint: 'https://api.example.com:8443',
      token: 'first,second',
      path: String.raw`C:\temp`,
    });
  });

  it.each(['missing-separator', ':missing-key', 'missing-value:'])(
    'rejects invalid variable %s',
    (variable) => {
      expect(() => parseVariablesFromString(variable)).toThrow('Expected format: key:value');
    },
  );
});
