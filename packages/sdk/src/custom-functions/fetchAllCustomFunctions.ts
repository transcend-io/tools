import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { CUSTOM_FUNCTIONS } from './gqls/index.js';

/**
 * The product-facing type of a custom function.
 */
export type CustomFunctionType = 'DSR' | 'GENERAL';

/**
 * The lifecycle state of a custom function.
 */
export type CustomFunctionLifecycleState = 'INACTIVE' | 'ACTIVE' | 'ARCHIVED';

/**
 * The lifecycle state of a custom function version.
 */
export type CustomFunctionVersionLifecycleState = 'ACTIVE' | 'DRAFT' | 'INACTIVE';

/**
 * Preview of a custom function version.
 */
export interface CustomFunctionVersionPreview {
  /** Version ID */
  id: string;
  /** Monotonic version number (e.g. "1.0") */
  versionNumber: string;
  /** Lifecycle state of the version */
  lifecycleState: CustomFunctionVersionLifecycleState;
  /** Signed code JWT for this specific version's code */
  signedCodeJwt: string;
}

/**
 * A custom function as returned by the `customFunctions` query.
 */
export interface CustomFunction {
  /** Custom function ID */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description?: string | null;
  /** Product-facing type */
  type: CustomFunctionType;
  /** Lifecycle state */
  lifecycleState: CustomFunctionLifecycleState;
  /** Signed code JWT of the preferred (draft if pending, else active) version */
  signedCodeJwt: string;
  /** Signed code context JWT of the preferred version */
  signedCodeContextJwt: string;
  /** Whether a draft version is newer than the current active version */
  hasPendingDraft: boolean;
  /** Current active version metadata */
  activeVersion?: CustomFunctionVersionPreview | null;
  /** Pending draft version metadata */
  draftVersion?: CustomFunctionVersionPreview | null;
}

const PAGE_SIZE = 20;

/**
 * Fetch all custom functions in the organization
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns All custom functions in the organization
 */
export async function fetchAllCustomFunctions(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger?: Logger;
    /** Filter options */
    filterBy?: {
      /** Filter by text match on name or description */
      text?: string;
    };
  } = {},
): Promise<CustomFunction[]> {
  const { logger = NOOP_LOGGER, filterBy } = options;
  const { text } = filterBy ?? {};
  const customFunctions: CustomFunction[] = [];
  let offset = 0;

  let shouldContinue = false;
  do {
    const {
      customFunctions: { nodes },
    } = await makeGraphQLRequest<{
      /** Query response */
      customFunctions: {
        /** List of matches */
        nodes: CustomFunction[];
      };
    }>(client, CUSTOM_FUNCTIONS, {
      variables: { first: PAGE_SIZE, offset, text },
      logger,
    });
    customFunctions.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return customFunctions.sort((a, b) => a.name.localeCompare(b.name));
}
