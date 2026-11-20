import { describe, expect, it } from 'vitest';

import { parsePrefixModuleConfigFromJson, PrefixModuleConfig } from './prefixModule.js';

describe('parsePrefixModuleConfigFromJson', () => {
  it('parses a flat string map', () => {
    expect(parsePrefixModuleConfigFromJson('{"region":"EU"}', { moduleName: 'geo-gate' })).toEqual({
      region: 'EU',
    });
  });

  it('rejects non-string values', () => {
    expect(() =>
      parsePrefixModuleConfigFromJson('{"region":["EU"]}', { moduleName: 'geo-gate' }),
    ).toThrow(/invalid config/);
  });

  it('rejects malformed JSON', () => {
    expect(() => parsePrefixModuleConfigFromJson('{', { moduleName: 'geo-gate' })).toThrow(
      /invalid config JSON/,
    );
  });
});

describe('PrefixModuleConfig codec', () => {
  it('accepts only string values', () => {
    expect(PrefixModuleConfig.is({ foo: 'bar' })).toBe(true);
    expect(PrefixModuleConfig.is({ foo: 1 })).toBe(false);
  });
});
