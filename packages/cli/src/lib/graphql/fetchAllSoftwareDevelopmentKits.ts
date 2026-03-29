import { CodePackageType } from '@transcend-io/privacy-types';
import { makeGraphQLRequest } from '@transcend-io/sdk';
import { GraphQLClient } from 'graphql-request';

import { logger } from '../../logger.js';
import { SOFTWARE_DEVELOPMENT_KITS } from './gqls/index.js';

export interface SoftwareDevelopmentKit {
  /** ID of software development kit */
  id: string;
  /** Name of software development kit */
  name: string;
  /** Description of software development kit */
  description: string;
  /** Type of software development kit */
  codePackageType: CodePackageType;
  /** Related documentation */
  documentationLinks: string[];
  /** Link to git repository */
  repositoryUrl?: string;
  /** The teams that manage the software development kit */
  teams: {
    /** ID of team */
    id: string;
    /** Name of team */
    name: string;
  }[];
  /** The users that manage the software development kit */
  owners: {
    /** ID of user */
    id: string;
    /** Email of user */
    email: string;
  }[];
}

const PAGE_SIZE = 20;

/**
 * Fetch all software development kits in the organization
 *
 * @param client - GraphQL client
 * @returns All software development kits in the organization
 */
export async function fetchAllSoftwareDevelopmentKits(
  client: GraphQLClient,
): Promise<SoftwareDevelopmentKit[]> {
  const softwareDevelopmentKits: SoftwareDevelopmentKit[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      softwareDevelopmentKits: { nodes },
    } = await makeGraphQLRequest<{
      /** Software development kits */
      softwareDevelopmentKits: {
        /** List */
        nodes: SoftwareDevelopmentKit[];
      };
    }>(client, SOFTWARE_DEVELOPMENT_KITS, {
      variables: { first: PAGE_SIZE, offset },
      logger,
    });
    softwareDevelopmentKits.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return softwareDevelopmentKits.sort((a, b) => a.name.localeCompare(b.name));
}
