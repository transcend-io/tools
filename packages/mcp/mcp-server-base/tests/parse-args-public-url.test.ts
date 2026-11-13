import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseTransportArgs } from '../src/server/parse-args.js';
import { tryResolveAuth } from '../src/server/resolve-auth.js';

describe('parseTransportArgs public URL', () => {
  const originalArgv = process.argv;

  afterEach(() => {
    process.argv = originalArgv;
    vi.unstubAllEnvs();
  });

  it('leaves publicUrl unset by default', () => {
    process.argv = ['node', 'cli', '--transport', 'http'];
    vi.stubEnv('TRANSCEND_MCP_PUBLIC_URL', '');
    expect(parseTransportArgs()).not.toHaveProperty('publicUrl');
  });

  it('reads TRANSCEND_MCP_PUBLIC_URL and strips trailing slashes', () => {
    process.argv = ['node', 'cli', '--transport', 'http'];
    vi.stubEnv('TRANSCEND_MCP_PUBLIC_URL', 'https://mcp.transcend.io/');
    expect(parseTransportArgs().publicUrl).toBe('https://mcp.transcend.io');
  });

  it('prefers --public-url over the environment variable', () => {
    process.argv = [
      'node',
      'cli',
      '--transport',
      'http',
      '--public-url',
      'https://flag.example.com',
    ];
    vi.stubEnv('TRANSCEND_MCP_PUBLIC_URL', 'https://env.example.com');
    expect(parseTransportArgs().publicUrl).toBe('https://flag.example.com');
  });

  it('rejects values that are not http(s) URLs', () => {
    process.argv = ['node', 'cli', '--transport', 'http', '--public-url', 'mcp.transcend.io'];
    expect(() => parseTransportArgs()).toThrow(/Invalid public URL/);
  });
});

describe('tryResolveAuth ignoreEnvApiKey', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the env API key by default', () => {
    vi.stubEnv('TRANSCEND_API_KEY', 'env-key');
    expect(tryResolveAuth({})).toEqual({ type: 'apiKey', apiKey: 'env-key' });
  });

  it('skips the env API key when asked, but still honors Bearer headers', () => {
    vi.stubEnv('TRANSCEND_API_KEY', 'env-key');
    expect(tryResolveAuth({}, { ignoreEnvApiKey: true })).toBeNull();
    expect(tryResolveAuth({ authorization: 'Bearer tok' }, { ignoreEnvApiKey: true })).toEqual({
      type: 'apiKey',
      apiKey: 'tok',
    });
  });
});
