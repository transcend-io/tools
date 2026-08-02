import { afterEach, describe, expect, it } from 'vitest';

import {
  ASSUME_CAPABILITIES_ENV_VAR,
  assumedCapabilitiesFromEnv,
  parseAssumedCapabilities,
} from '../src/capabilities/assume.js';
import { deriveClientCapabilities } from '../src/capabilities/derive.js';
import { McpClientCapability } from '../src/capabilities/types.js';

describe('parseAssumedCapabilities', () => {
  it('returns nothing for an unset or blank value', () => {
    for (const value of [undefined, '', '   ', ',,']) {
      expect(parseAssumedCapabilities(value)).toEqual({ capabilities: [], unknown: [] });
    }
  });

  it('parses a comma-separated list, tolerating spacing and casing', () => {
    expect(parseAssumedCapabilities(' mcp_app , elicitation ')).toEqual({
      capabilities: [McpClientCapability.McpApp, McpClientCapability.Elicitation],
      unknown: [],
    });
  });

  it('de-duplicates repeated entries', () => {
    expect(parseAssumedCapabilities('MCP_APP,MCP_APP').capabilities).toEqual([
      McpClientCapability.McpApp,
    ]);
  });

  it('collects unrecognized entries instead of throwing, since a typo should still boot', () => {
    const result = parseAssumedCapabilities('MCP_APP,SAMPLING,nonsense');
    expect(result.capabilities).toEqual([McpClientCapability.McpApp]);
    expect(result.unknown).toEqual(['SAMPLING', 'nonsense']);
  });
});

describe('assumedCapabilitiesFromEnv', () => {
  const original = process.env[ASSUME_CAPABILITIES_ENV_VAR];

  afterEach(() => {
    if (original === undefined) delete process.env[ASSUME_CAPABILITIES_ENV_VAR];
    else process.env[ASSUME_CAPABILITIES_ENV_VAR] = original;
  });

  it('reads the variable, and is empty when unset so the default stays strict negotiation', () => {
    process.env[ASSUME_CAPABILITIES_ENV_VAR] = 'MCP_APP';
    expect(assumedCapabilitiesFromEnv().capabilities).toEqual([McpClientCapability.McpApp]);

    delete process.env[ASSUME_CAPABILITIES_ENV_VAR];
    expect(assumedCapabilitiesFromEnv().capabilities).toEqual([]);
  });
});

describe('deriveClientCapabilities with assumed capabilities', () => {
  // The exact shape the v1 Inspector sends: an Apps tab, but nothing declared.
  const inspectorSource = {
    capabilities: {},
    clientInfo: { name: 'inspector', version: '1.0.1' },
  };

  it('forces a capability on when told to', () => {
    const report = deriveClientCapabilities({
      ...inspectorSource,
      assumeCapabilities: [McpClientCapability.McpApp],
    });
    expect(report.capabilities.has(McpClientCapability.McpApp)).toBe(true);
  });

  it('unions with what was genuinely detected rather than replacing it', () => {
    const report = deriveClientCapabilities({
      capabilities: { elicitation: { form: {} } },
      assumeCapabilities: [McpClientCapability.McpApp],
    });
    expect([...report.capabilities].sort()).toEqual([
      McpClientCapability.Elicitation,
      McpClientCapability.McpApp,
    ]);
  });

  it('changes nothing when the list is empty', () => {
    const report = deriveClientCapabilities({ ...inspectorSource, assumeCapabilities: [] });
    expect([...report.capabilities]).toEqual([]);
  });
});
