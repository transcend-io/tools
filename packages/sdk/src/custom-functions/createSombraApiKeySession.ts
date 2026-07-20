import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import {
  createDhEncryptionKeys,
  decryptDecryptionContext,
  type DecryptionContext,
} from './dhEncryption.js';
import { CREATE_SOMBRA_API_KEY_SESSION, ORGANIZATION_SOMBRAS } from './gqls/index.js';

/**
 * A Sombra employee session minted for an API key, used to authenticate
 * Diffie-Hellman channels (e.g. custom function code signing).
 */
export interface SombraApiKeySession {
  /** The unwrapped Sombra session secret (used as the DH `authSecret`) */
  authSecret: string;
  /** The ID of the Sombra gateway the session was created against */
  sombraId: string;
  /** The ECDH public key of that Sombra gateway (base64) */
  sombraPublicKeyECDH: string;
}

interface SombraPreview {
  /** Sombra ID */
  id: string;
  /** Sombra ECDH public key */
  publicKeyECDH: string | null;
}

/**
 * Exchange the API key authenticating the GraphQL client for a short-lived
 * Sombra employee session via the `createSombraApiKeySession` mutation.
 *
 * The session secret is wrapped for a freshly generated ephemeral ECDH key and
 * decrypted locally — it is never transmitted in plaintext.
 *
 * @param client - GraphQL client authenticated with a Transcend API key
 * @param options - Options
 * @returns The unwrapped session secret and the Sombra it belongs to
 */
export async function createSombraApiKeySession(
  client: GraphQLClient,
  options: {
    /** Specific Sombra gateway ID to create the session against (defaults to the primary Sombra) */
    sombraId?: string;
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<SombraApiKeySession> {
  const { sombraId, logger = NOOP_LOGGER } = options;

  // Resolve the target Sombra and its ECDH public key
  const { organization } = await makeGraphQLRequest<{
    /** Organization query response */
    organization: {
      /** Primary Sombra gateway */
      sombra: SombraPreview;
      /** All Sombra gateways in the organization */
      sombras: SombraPreview[];
    };
  }>(client, ORGANIZATION_SOMBRAS, { logger });

  const targetSombra = sombraId
    ? organization.sombras.find(({ id }) => id === sombraId)
    : organization.sombra;
  if (!targetSombra) {
    throw new Error(`Could not find a Sombra gateway with ID: "${sombraId}"`);
  }
  if (!targetSombra.publicKeyECDH) {
    throw new Error(
      `Sombra gateway "${targetSombra.id}" has no ECDH public key configured — ` +
        'cannot establish a Diffie-Hellman channel.',
    );
  }

  // Generate ephemeral keys and exchange the API key for a wrapped session
  const dhEncryptionKeys = createDhEncryptionKeys(targetSombra.publicKeyECDH);
  const {
    createSombraApiKeySession: { decryptionContext },
  } = await makeGraphQLRequest<{
    /** Mutation response */
    createSombraApiKeySession: {
      /** The wrapped session secret */
      decryptionContext: DecryptionContext;
    };
  }>(client, CREATE_SOMBRA_API_KEY_SESSION, {
    variables: {
      publicKey: dhEncryptionKeys.publicKey,
      sombraId: sombraId ?? undefined,
    },
    logger,
  });

  const authSecret = decryptDecryptionContext(decryptionContext, dhEncryptionKeys);

  return {
    authSecret,
    sombraId: targetSombra.id,
    sombraPublicKeyECDH: targetSombra.publicKeyECDH,
  };
}
