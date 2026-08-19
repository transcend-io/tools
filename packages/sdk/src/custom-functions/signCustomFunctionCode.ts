import type { Got } from 'got';

import type { CustomFunctionSignPayload } from './codeSigning.js';

/**
 * The signed JWT pair returned by Sombra's customer-ingress
 * `/v1/custom/sign` endpoint.
 */
export interface SignedCustomFunctionJwts {
  /** HMAC-signed JWT wrapping the function code */
  signedCodeJwt: string;
  /** HMAC-signed JWT wrapping the execution context (env values encrypted at sign time) */
  signedCodeContextJwt: string;
}

/**
 * Sign custom function code against the Sombra customer-ingress
 * `/v1/custom/sign` route.
 *
 * The route is authenticated by the sombra instance's bearer headers (the
 * Transcend API key, plus the Sombra internal key when self-hosting — see
 * `createSombraGotInstance`). Code and env values travel to the customer's
 * own Sombra gateway over TLS and never reach Transcend's backend in
 * plaintext.
 *
 * @param sombra - Got instance authenticated against the Sombra customer ingress
 * @param payload - The plaintext code and execution context to sign
 * @param options - Options
 * @returns The signed code and context JWTs to store via the GraphQL API
 */
export async function signCustomFunctionCode(
  sombra: Got,
  payload: CustomFunctionSignPayload,
  options: {
    /** Existing custom function ID, forwarded for Sombra log context */
    customFunctionId?: string;
  } = {},
): Promise<SignedCustomFunctionJwts> {
  const { customFunctionId } = options;
  try {
    return await sombra
      .post('v1/custom/sign', {
        json: {
          code: payload.code,
          context: payload.context,
          ...(customFunctionId ? { customFunction: { id: customFunctionId } } : {}),
        },
      })
      .json<SignedCustomFunctionJwts>();
  } catch (err) {
    const statusCode = (err as { response?: { statusCode?: number } })?.response?.statusCode;
    if (statusCode === 404) {
      throw new Error(
        'The Sombra gateway does not support the /v1/custom/sign route. ' +
          'Upgrade your Sombra gateway to a version that supports custom function code signing.',
      );
    }
    throw err;
  }
}
