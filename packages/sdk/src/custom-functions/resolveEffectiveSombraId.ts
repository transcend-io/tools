import type { Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';

import { ORGANIZATION } from '../api/gqls/organization.js';
import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import type { CustomFunction } from './fetchAllCustomFunctions.js';
import type { CustomFunctionConfigInput } from './syncCustomFunction.js';

/**
 * Resolve which Sombra gateway a custom function's code must be signed
 * against.
 *
 * Each custom function belongs to a single gateway, whose keys sign the code
 * and encrypt the env values — signing against any other gateway would
 * produce JWTs that fail verification at execution time. The gateway is
 * resolved as: the config's `sombraId`, else the existing function's
 * gateway, else the caller's default (e.g. a CLI flag), else `undefined`
 * meaning the organization's primary Sombra.
 *
 * A config that pins a different gateway than the existing function is an
 * error — the gateway of an existing function cannot be changed by a push.
 *
 * @param input - The custom function config
 * @param existing - The matching existing custom function, when there is one
 * @param defaultSombraId - Fallback gateway ID when neither the config nor the existing function specify one
 * @returns The Sombra gateway ID to sign against, or undefined for the primary gateway
 */
export function resolveEffectiveSombraId(
  input: Pick<CustomFunctionConfigInput, 'name' | 'sombraId'>,
  existing: Pick<CustomFunction, 'id' | 'sombraId'> | undefined,
  defaultSombraId?: string,
): string | undefined {
  if (input.sombraId && existing?.sombraId && input.sombraId !== existing.sombraId) {
    throw new Error(
      `Custom function "${input.name}" specifies sombra-id "${input.sombraId}" but the ` +
        `existing function (id: ${existing.id}) belongs to Sombra gateway "${existing.sombraId}". ` +
        'A push cannot move a custom function between gateways — fix the sombra-id in the ' +
        'manifest, or remove it to keep the existing gateway.',
    );
  }
  return input.sombraId ?? existing?.sombraId ?? defaultSombraId;
}

/**
 * Resolve the organization's primary Sombra gateway ID.
 *
 * @param client - GraphQL client authenticated with a Transcend API key
 * @param logger - Logger instance
 * @returns The primary Sombra ID
 */
export async function resolvePrimarySombraId(
  client: GraphQLClient,
  logger: Logger = NOOP_LOGGER,
): Promise<string> {
  const { organization } = await makeGraphQLRequest<{
    /** Organization query response */
    organization: {
      /** Primary Sombra gateway */
      sombra: {
        /** Sombra ID */
        id: string;
      } | null;
    };
  }>(client, ORGANIZATION, { logger });
  if (!organization.sombra?.id) {
    throw new Error(
      'Could not resolve the primary Sombra gateway of the organization, which is ' +
        'required to create a custom function. Specify a sombra-id on the manifest ' +
        'entry instead.',
    );
  }
  return organization.sombra.id;
}
