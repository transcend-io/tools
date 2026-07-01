import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseTransportArgs } from '../src/server/parse-args.js';

const originalArgv = process.argv;

function withArgv<T>(args: string[], callback: () => T): T {
  process.argv = ['node', 'mcp-server', ...args];
  return callback();
}

describe('parseTransportArgs', () => {
  afterEach(() => {
    process.argv = originalArgv;
    vi.restoreAllMocks();
  });

  it('prints version and exits before transport configuration', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(((code?: number | string | null) => {
      throw new Error(`exit:${code}`);
    }) as never);

    expect(() =>
      withArgv(['--version'], () =>
        parseTransportArgs({ name: 'Transcend MCP', version: '1.2.3' }),
      ),
    ).toThrow('exit:0');
    expect(log).toHaveBeenCalledWith('1.2.3');
  });

  it('prints help and exits before transport configuration', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(((code?: number | string | null) => {
      throw new Error(`exit:${code}`);
    }) as never);

    expect(() =>
      withArgv(['--help'], () => parseTransportArgs({ name: 'Transcend MCP', version: '1.2.3' })),
    ).toThrow('exit:0');
    expect(log.mock.calls[0]?.[0]).toContain('Usage: Transcend MCP [options]');
  });

  it('rejects unknown top-level flags', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(((code?: number | string | null) => {
      throw new Error(`exit:${code}`);
    }) as never);

    expect(() =>
      withArgv(['--bad-flag'], () =>
        parseTransportArgs({ name: 'Transcend MCP', version: '1.2.3' }),
      ),
    ).toThrow('exit:1');
    expect(error.mock.calls[0]?.[0]).toContain('bad-flag');
  });
});
