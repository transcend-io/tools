import { describe, expect, it } from 'vitest';

import { validateCustomFunctionExecutionContext } from '../execution-context.js';

describe('validateCustomFunctionExecutionContext', () => {
  it('accepts production-style environment and host settings', () => {
    expect(() =>
      validateCustomFunctionExecutionContext({
        env: { API_TOKEN: 'secret', PATH: '/custom/bin' },
        allowedHosts: ['api.example.com:443', '[::1]:8080'],
      }),
    ).not.toThrow();
  });

  it('rejects reserved environment names and malformed hosts', () => {
    expect(() =>
      validateCustomFunctionExecutionContext({
        env: { NODE_EXTRA_CA_CERTS: '/tmp/cert.pem' },
      }),
    ).toThrow('Reserved environment variable names: NODE_EXTRA_CA_CERTS');
    expect(() =>
      validateCustomFunctionExecutionContext({
        allowedHosts: ['*', 'api.example.com'],
      }),
    ).toThrow('allowed-hosts cannot combine "*" with specific hosts');
    expect(() =>
      validateCustomFunctionExecutionContext({
        allowedHosts: ['api.example.com,evil.example.com'],
      }),
    ).toThrow('Invalid allowed-hosts');
  });
});
