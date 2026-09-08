import type { Got } from 'got';
import { describe, expect, it, vi } from 'vitest';

import { signCustomFunctionCode } from '../signCustomFunctionCode.js';

const PAYLOAD = {
  code: 'export default async () => 42;',
  context: { userDefinedEnv: { API_KEY: 'secret' }, allowedHosts: ['api.example.com'] },
};

const JWTS = { signedCodeJwt: 'a.b.c', signedCodeContextJwt: 'd.e.f' };

/**
 * Build a got stub whose `post` resolves or rejects.
 *
 * @param result - The JSON response, or an error to reject with
 * @returns The stub and a spy on `post`
 */
function makeSombraStub(result: object | Error): {
  /** The got stub */
  sombra: Got;
  /** Spy on post */
  post: ReturnType<typeof vi.fn>;
} {
  const post = vi.fn().mockReturnValue({
    json: () => (result instanceof Error ? Promise.reject(result) : Promise.resolve(result)),
  });
  return { sombra: { post } as unknown as Got, post };
}

describe('signCustomFunctionCode', () => {
  it('posts the plaintext payload to v1/custom/sign and returns the JWTs', async () => {
    const { sombra, post } = makeSombraStub(JWTS);
    const result = await signCustomFunctionCode(sombra, PAYLOAD, {
      customFunctionId: 'cf-123',
    });
    expect(result).toEqual(JWTS);
    expect(post).toHaveBeenCalledWith('v1/custom/sign', {
      json: {
        code: PAYLOAD.code,
        context: PAYLOAD.context,
        customFunction: { id: 'cf-123' },
      },
    });
  });

  it('omits the customFunction log context when no ID is provided', async () => {
    const { sombra, post } = makeSombraStub(JWTS);
    await signCustomFunctionCode(sombra, PAYLOAD);
    expect(post).toHaveBeenCalledWith('v1/custom/sign', {
      json: { code: PAYLOAD.code, context: PAYLOAD.context },
    });
  });

  it('throws a friendly error when the route does not exist (404)', async () => {
    const httpError = Object.assign(new Error('Response code 404 (Not Found)'), {
      response: { statusCode: 404 },
    });
    const { sombra } = makeSombraStub(httpError);
    await expect(signCustomFunctionCode(sombra, PAYLOAD)).rejects.toThrow(
      /does not support the \/v1\/custom\/sign route/,
    );
  });

  it('rethrows other errors unchanged', async () => {
    const httpError = Object.assign(new Error('Response code 401 (Unauthorized)'), {
      response: { statusCode: 401 },
    });
    const { sombra } = makeSombraStub(httpError);
    await expect(signCustomFunctionCode(sombra, PAYLOAD)).rejects.toThrow(
      'Response code 401 (Unauthorized)',
    );
  });
});
