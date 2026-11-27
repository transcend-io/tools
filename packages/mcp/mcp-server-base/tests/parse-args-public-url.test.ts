import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { parseTransportArgs } from '../src/server/parse-args.js';

describe('parseTransportArgs public URL', () => {
  const originalArgv = process.argv;

  beforeEach(() => {
    vi.stubEnv('TRANSCEND_MCP_INTROSPECTION_CLIENT_ID', 'mcp-resource-server');
    vi.stubEnv('TRANSCEND_MCP_INTROSPECTION_CLIENT_SECRET', 's3cret');
  });

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

  it('reads the introspection client credentials when a public URL is set', () => {
    process.argv = ['node', 'cli', '--transport', 'http'];
    vi.stubEnv('TRANSCEND_MCP_PUBLIC_URL', 'https://mcp.transcend.io');
    expect(parseTransportArgs().introspectionClient).toEqual({
      clientId: 'mcp-resource-server',
      clientSecret: 's3cret',
    });
  });

  it.each([
    [['TRANSCEND_MCP_INTROSPECTION_CLIENT_ID']],
    [['TRANSCEND_MCP_INTROSPECTION_CLIENT_SECRET']],
    [['TRANSCEND_MCP_INTROSPECTION_CLIENT_ID', 'TRANSCEND_MCP_INTROSPECTION_CLIENT_SECRET']],
  ])('fails startup with a public URL when %j is missing', (missing) => {
    process.argv = ['node', 'cli', '--transport', 'http'];
    vi.stubEnv('TRANSCEND_MCP_PUBLIC_URL', 'https://mcp.transcend.io');
    for (const name of missing) vi.stubEnv(name, ' ');

    expect(() => parseTransportArgs()).toThrow(`Set ${missing.join(' and ')}.`);
  });

  it('does not need introspection credentials without a public URL', () => {
    process.argv = ['node', 'cli', '--transport', 'http'];
    vi.stubEnv('TRANSCEND_MCP_PUBLIC_URL', '');
    vi.stubEnv('TRANSCEND_MCP_INTROSPECTION_CLIENT_ID', '');
    vi.stubEnv('TRANSCEND_MCP_INTROSPECTION_CLIENT_SECRET', '');

    expect(parseTransportArgs()).not.toHaveProperty('introspectionClient');
  });

  it('does not need introspection credentials on the stdio transport', () => {
    process.argv = ['node', 'cli'];
    vi.stubEnv('TRANSCEND_MCP_PUBLIC_URL', 'https://mcp.transcend.io');
    vi.stubEnv('TRANSCEND_MCP_INTROSPECTION_CLIENT_ID', '');
    vi.stubEnv('TRANSCEND_MCP_INTROSPECTION_CLIENT_SECRET', '');

    expect(parseTransportArgs()).not.toHaveProperty('introspectionClient');
  });
});
