import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildPolicyEngineClient,
  type BuildPolicyEngineClientDependencies,
} from '../buildPolicyEngineClient.js';

describe('buildPolicyEngineClient', () => {
  const extend = vi.fn<BuildPolicyEngineClientDependencies['extend']>();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds a client with the normalized base URL and auth headers', () => {
    extend.mockReturnValueOnce({} as never);

    buildPolicyEngineClient('https://api.transcend.io/', 'test-key', { extend });

    expect(extend).toHaveBeenCalledWith({
      prefixUrl: 'https://api.transcend.io',
      headers: {
        Authorization: 'Bearer test-key',
        accept: 'application/json',
      },
    });
  });

  it('rejects a --transcend-url ending with /v1 and suggests the fix', () => {
    expect(() =>
      buildPolicyEngineClient('https://api.transcend.io/v1', 'test-key', { extend }),
    ).toThrow(
      /must not include a trailing "\/v1"[\s\S]*use "https:\/\/api\.transcend\.io" instead/i,
    );
    expect(extend).not.toHaveBeenCalled();
  });

  it('rejects a --transcend-url ending with /v1 after a trailing slash', () => {
    expect(() =>
      buildPolicyEngineClient('https://api.transcend.io/v1/', 'test-key', { extend }),
    ).toThrow(/must not include a trailing "\/v1"/i);
  });

  it('accepts a URL whose path contains v1 but does not end with it', () => {
    extend.mockReturnValueOnce({} as never);

    expect(() =>
      buildPolicyEngineClient('https://api.transcend.io/v1beta1', 'test-key', { extend }),
    ).not.toThrow();
  });
});
