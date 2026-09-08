import { describe, expect, it } from 'vitest';

import {
  parsePolicyToolVersion,
  unsupportedOpaVersionMessage,
  unsupportedRegalVersionMessage,
} from '../policy-runtime.js';

describe('policy runtime versions', () => {
  it('parses OPA and Regal version output', () => {
    expect(parsePolicyToolVersion('Version: 1.13.1\nGo Version: go1.25.6\n')).toEqual({
      version: '1.13.1',
      major: 1,
    });
    expect(parsePolicyToolVersion('Version:       v0.42.0\nOPA Version: 1.18.2\n')).toEqual({
      version: '0.42.0',
      major: 0,
    });
  });

  it('requires OPA 1.x with official upgrade guidance', () => {
    expect(unsupportedOpaVersionMessage('Version: 1.13.1\n')).toBeUndefined();
    expect(unsupportedOpaVersionMessage('Version: 0.68.0\n')).toMatch(
      /OPA 1\.x is required; found 0\.68\.0[\s\S]*openpolicyagent\.org\/docs/u,
    );
  });

  it('requires Regal 0.30.0 or newer for first-class OPA 1 support', () => {
    expect(unsupportedRegalVersionMessage('Version: 0.42.0\n')).toBeUndefined();
    expect(unsupportedRegalVersionMessage('Version: 1.0.0\n')).toBeUndefined();
    expect(unsupportedRegalVersionMessage('Version: 0.29.2\n')).toMatch(
      /Regal 0\.30\.0 or newer[\s\S]*openpolicyagent\.org\/projects\/regal/u,
    );
  });

  it('supports stricter capabilities compatibility through the shared parser', () => {
    expect(
      unsupportedRegalVersionMessage('Version: 0.38.1\n', '0.39.0', 'OPA 1.13.1 capabilities'),
    ).toMatch(/Regal 0\.39\.0 or newer[\s\S]*OPA 1\.13\.1 capabilities/u);
    expect(
      unsupportedRegalVersionMessage('Version: 0.39.0\n', '0.39.0', 'OPA 1.13.1 capabilities'),
    ).toBeUndefined();
  });

  it('rejects unparseable tool output with official guidance', () => {
    expect(unsupportedOpaVersionMessage('development build')).toMatch(
      /unable to parse[\s\S]*openpolicyagent\.org\/docs/u,
    );
    expect(unsupportedRegalVersionMessage('development build')).toMatch(
      /unable to parse[\s\S]*openpolicyagent\.org\/projects\/regal/u,
    );
  });
});
