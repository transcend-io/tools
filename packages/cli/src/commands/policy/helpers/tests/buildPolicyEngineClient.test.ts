import { describe, expect, it, vi, beforeEach } from 'vitest';

const gotExtendMock = vi.hoisted(() => vi.fn());

vi.mock('got', () => ({
  default: Object.assign(vi.fn(), {
    extend: gotExtendMock,
  }),
}));

import { buildPolicyEngineClient } from '../buildPolicyEngineClient.js';

describe('buildPolicyEngineClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds a client with the normalized base URL and auth headers', () => {
    gotExtendMock.mockReturnValueOnce({} as never);

    buildPolicyEngineClient('https://api.transcend.io/', 'test-key');

    expect(gotExtendMock).toHaveBeenCalledWith({
      prefixUrl: 'https://api.transcend.io',
      headers: {
        Authorization: 'Bearer test-key',
        accept: 'application/json',
      },
    });
  });

  it('rejects a --transcend-url ending with /v1 and suggests the fix', () => {
    expect(() => buildPolicyEngineClient('https://api.transcend.io/v1', 'test-key')).toThrow(
      /must not include a trailing "\/v1"[\s\S]*use "https:\/\/api\.transcend\.io" instead/i,
    );
    expect(gotExtendMock).not.toHaveBeenCalled();
  });

  it('rejects a --transcend-url ending with /v1 after a trailing slash', () => {
    expect(() => buildPolicyEngineClient('https://api.transcend.io/v1/', 'test-key')).toThrow(
      /must not include a trailing "\/v1"/i,
    );
  });

  it('accepts a URL whose path contains v1 but does not end with it', () => {
    gotExtendMock.mockReturnValueOnce({} as never);

    expect(() =>
      buildPolicyEngineClient('https://api.transcend.io/v1beta1', 'test-key'),
    ).not.toThrow();
  });
});
