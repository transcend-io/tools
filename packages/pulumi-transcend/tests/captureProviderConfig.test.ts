import { describe, expect, it } from 'vitest';

import { readProviderSettings } from '../src/plugin/captureProviderConfig.js';
import { CredentialStore } from '../src/plugin/credentials.js';

function request(variables: Record<string, string>): Parameters<typeof readProviderSettings>[0] {
  return {
    getVariablesMap: () => ({
      forEach: (callback) =>
        Object.entries(variables).forEach(([key, value]) => callback(value, key)),
    }),
  };
}

describe('readProviderSettings', () => {
  it('reads bare strings and JSON-quoted strings', () => {
    expect(
      readProviderSettings(
        request({ 'transcend:apiKey': 'secret', 'transcend:url': '"https://api.us.transcend.io"' }),
      ),
    ).toEqual({ apiKey: 'secret', url: 'https://api.us.transcend.io' });
  });

  it('ignores other packages and settings', () => {
    expect(readProviderSettings(request({ 'aws:region': 'us-east-1' }))).toEqual({});
  });
});

describe('CredentialStore', () => {
  it('prefers stack config over the environment', () => {
    const store = new CredentialStore({
      TRANSCEND_API_KEY: 'env',
      TRANSCEND_API_URL: 'https://env',
    });
    store.setSettings({ apiKey: 'config', url: 'https://config/' });
    expect(store.resolve()).toEqual({ apiKey: 'config', url: 'https://config' });
  });

  it('falls back to the environment and then the EU API', () => {
    expect(new CredentialStore({ TRANSCEND_API_KEY: 'env' }).resolve()).toEqual({
      apiKey: 'env',
      url: 'https://api.transcend.io',
    });
  });

  it('throws when no key is set', () => {
    expect(() => new CredentialStore({}).resolve()).toThrow(/API key/);
  });
});
