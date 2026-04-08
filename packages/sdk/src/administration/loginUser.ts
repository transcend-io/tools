import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { DETERMINE_LOGIN_METHOD, ASSUME_ROLE, LOGIN } from './gqls/auth.js';

export interface OrganizationPreview {
  /** Name of organization */
  name: string;
  /** Id of organization */
  id: string;
  /** uri of organization */
  uri: string;
  /** ID of parent organization */
  parentOrganizationId?: string;
}

export interface UserRole {
  /** ID of role */
  id: string;
  /** Related organization */
  organization: OrganizationPreview;
}

/**
 * Log in as a user
 *
 * @param client - GraphQL client
 * @param credentials - Email and password
 * @param options - Options
 * @returns Cookie and roles
 */
export async function loginUser(
  client: GraphQLClient,
  credentials: {
    /** Email of user */
    email: string;
    /** Password of user */
    password: string;
  },
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<{
  /** Cookie to be used to make subsequent requests */
  loginCookie: string;
  /** Roles of the user  */
  roles: UserRole[];
}> {
  const { email, password } = credentials;
  const { logger } = options;

  const {
    determineLoginMethod: { loginMethod },
  } = await makeGraphQLRequest<{
    /** Determine login method */
    determineLoginMethod: {
      /** Login method info */
      loginMethod: {
        /** Email being logged in */
        email: string;
        /** Sombra public key */
        sombraPublicKey: string;
      };
    };
  }>(client, DETERMINE_LOGIN_METHOD, {
    variables: { email },
    logger,
  });

  const res = await client.rawRequest<{
    /** Login */
    login: {
      /** User */
      user: {
        /** Roles of user */
        roles: UserRole[];
      };
    };
  }>(LOGIN, {
    email,
    password,
    publicKey: loginMethod.sombraPublicKey,
  });
  const {
    login: { user },
  } = res.data;

  // Get login cookie from response
  const loginCookie = res.headers.get('set-cookie');
  if (!loginCookie || !loginCookie.includes('laravel')) {
    throw new Error('Failed to get login cookie in response');
  }

  return {
    roles: user.roles,
    loginCookie,
  };
}

/**
 * Assume role for user into another organization
 *
 * @param client - GraphQL client
 * @param params - Email and role ID
 * @param options - Options
 */
export async function assumeRole(
  client: GraphQLClient,
  params: {
    /** Email of user */
    email: string;
    /** Role of user assuming into */
    roleId: string;
  },
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<void> {
  const { email, roleId } = params;
  const { logger } = options;

  const {
    determineLoginMethod: { loginMethod },
  } = await makeGraphQLRequest<{
    /** Determine login method */
    determineLoginMethod: {
      /** Login method info */
      loginMethod: {
        /** Email being logged in */
        email: string;
        /** Sombra public key */
        sombraPublicKey: string;
      };
    };
  }>(client, DETERMINE_LOGIN_METHOD, {
    variables: { email, userId: roleId },
    logger,
  });

  await client.rawRequest<{
    /** Assume role */
    assumeRole: {
      /** Mutation ID */
      clientMutationId: string;
    };
  }>(ASSUME_ROLE, {
    id: roleId,
    publicKey: loginMethod.sombraPublicKey,
  });
}
