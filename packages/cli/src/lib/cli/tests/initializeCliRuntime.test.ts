import type { Dispatcher } from 'undici';
import { describe, expect, it, vi } from 'vitest';

import { initializeCliRuntime } from '../initializeCliRuntime.js';

describe('initializeCliRuntime', () => {
  it('configures request and fetch clients from the CLI proxy flag', () => {
    const dispatcher = {} as Dispatcher;
    const bootstrap = vi.fn();
    const createProxyAgent = vi.fn(() => dispatcher);
    const logger = {
      info: vi.fn(),
    };
    const process = {
      argv: ['node', 'transcend', '--httpProxy=http://proxy.example:8080'],
      env: {},
    } as Pick<NodeJS.Process, 'argv' | 'env'>;
    const setGlobalDispatcher = vi.fn();

    initializeCliRuntime({
      bootstrap,
      createProxyAgent,
      logger,
      process,
      setGlobalDispatcher,
    });

    expect(process.env.GLOBAL_AGENT_HTTP_PROXY).toBe('http://proxy.example:8080');
    expect(bootstrap).toHaveBeenCalledOnce();
    expect(createProxyAgent).toHaveBeenCalledWith('http://proxy.example:8080');
    expect(setGlobalDispatcher).toHaveBeenCalledWith(dispatcher);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Initializing proxy: http://proxy.example:8080'),
    );
  });

  it('does not initialize proxy clients when no proxy is configured', () => {
    const bootstrap = vi.fn();
    const createProxyAgent = vi.fn();
    const logger = {
      info: vi.fn(),
    };
    const process = {
      argv: ['node', 'transcend', 'completion'],
      env: {},
    } as Pick<NodeJS.Process, 'argv' | 'env'>;
    const setGlobalDispatcher = vi.fn();

    initializeCliRuntime({
      bootstrap,
      createProxyAgent,
      logger,
      process,
      setGlobalDispatcher,
    });

    expect(bootstrap).not.toHaveBeenCalled();
    expect(createProxyAgent).not.toHaveBeenCalled();
    expect(setGlobalDispatcher).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('uses the lowercase proxy environment variable as a fallback', () => {
    const dispatcher = {} as Dispatcher;
    const bootstrap = vi.fn();
    const createProxyAgent = vi.fn(() => dispatcher);
    const logger = {
      info: vi.fn(),
    };
    const process = {
      argv: ['node', 'transcend', 'inventory', 'pull'],
      env: {
        http_proxy: 'http://environment-proxy.example:8080',
      },
    } as Pick<NodeJS.Process, 'argv' | 'env'>;
    const setGlobalDispatcher = vi.fn();

    initializeCliRuntime({
      bootstrap,
      createProxyAgent,
      logger,
      process,
      setGlobalDispatcher,
    });

    expect(process.env.GLOBAL_AGENT_HTTP_PROXY).toBe('http://environment-proxy.example:8080');
    expect(createProxyAgent).toHaveBeenCalledWith('http://environment-proxy.example:8080');
    expect(setGlobalDispatcher).toHaveBeenCalledWith(dispatcher);
  });
});
