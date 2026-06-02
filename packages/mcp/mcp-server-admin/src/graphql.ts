import {
  TranscendGraphQLBase,
  type ApiKey,
  type ApiKeyCreateInput,
  type ListOptions,
  type Organization,
  type PaginatedResponse,
  type PrivacyCenter,
  type Team,
  type User,
} from '@transcend-io/mcp-server-base';

import { graphql } from './__generated__/gql.js';
import type { ScopeName } from './__generated__/graphql.js';

const GetOrganizationDoc = graphql(/* GraphQL */ `
  query AdminGetOrganization {
    organization {
      id
      name
      uri
      createdAt
    }
  }
`);

const GetCurrentUserDoc = graphql(/* GraphQL */ `
  query AdminGetCurrentUser {
    user {
      id
      email
      name
      createdAt
    }
  }
`);

const ListUsersDoc = graphql(/* GraphQL */ `
  query AdminListUsers($first: Int, $filterBy: UserFiltersInput) {
    users(first: $first, filterBy: $filterBy) {
      nodes {
        id
        email
        name
      }
      totalCount
    }
  }
`);

const ListTeamsDoc = graphql(/* GraphQL */ `
  query AdminListTeams($first: Int) {
    teams(first: $first) {
      nodes {
        id
        name
      }
      totalCount
    }
  }
`);

const ListApiKeysDoc = graphql(/* GraphQL */ `
  query AdminListApiKeys($first: Int, $offset: Int) {
    apiKeys(first: $first, offset: $offset) {
      nodes {
        id
        title
        scopes {
          id
          name
        }
        lastUsedAt
        createdAt
      }
      totalCount
    }
  }
`);

const CreateApiKeyDoc = graphql(/* GraphQL */ `
  mutation AdminCreateApiKey($input: ApiKeyInput!) {
    createApiKey(input: $input) {
      apiKey {
        id
        title
        apiKey
        preview
        scopes {
          id
          name
        }
        createdAt
      }
    }
  }
`);

const GetPrivacyCenterDoc = graphql(/* GraphQL */ `
  query AdminGetPrivacyCenter($lookup: PrivacyCenterLookupInput) {
    privacyCenter(lookup: $lookup) {
      id
    }
  }
`);

/**
 * The plain-text token returned by `createApiKey`. Exposed once -- the
 * server never returns this value again, so callers must persist it
 * immediately.
 */
export interface CreatedApiKey extends ApiKey {
  /**
   * The plain-text bearer token. Only returned by `createApiKey`/`duplicateApiKey`;
   * re-fetching the API key later returns the `preview` instead.
   */
  token: string;
}

export class AdminMixin extends TranscendGraphQLBase {
  async getOrganization(): Promise<Organization> {
    const data = await this.makeRequest(GetOrganizationDoc);
    return {
      id: data.organization.id,
      name: data.organization.name,
      uri: data.organization.uri,
      createdAt: data.organization.createdAt,
    };
  }

  async getCurrentUser(): Promise<User> {
    const data = await this.makeRequest(GetCurrentUserDoc);
    if (!data.user) {
      throw new Error('No user is currently authenticated for this API key.');
    }
    return {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      isActive: true,
      createdAt: new Date(0).toISOString(),
    };
  }

  async listUsers(
    options?: ListOptions & { filterBy?: { text?: string } },
  ): Promise<PaginatedResponse<User>> {
    const data = await this.makeRequest(ListUsersDoc, {
      first: Math.min(options?.first ?? 50, 100),
      filterBy: options?.filterBy ?? null,
    });
    return {
      nodes: data.users.nodes.map((node) => ({
        id: node.id,
        email: node.email,
        name: node.name,
        isActive: true,
        createdAt: new Date(0).toISOString(),
      })),
      pageInfo: {
        hasNextPage: data.users.nodes.length < data.users.totalCount,
        hasPreviousPage: false,
      },
      totalCount: data.users.totalCount,
    };
  }

  async listTeams(options?: ListOptions): Promise<PaginatedResponse<Team>> {
    const data = await this.makeRequest(ListTeamsDoc, {
      first: Math.min(options?.first ?? 50, 100),
    });
    return {
      nodes: data.teams.nodes.map((node) => ({
        id: node.id,
        name: node.name,
        createdAt: new Date(0).toISOString(),
      })),
      pageInfo: {
        hasNextPage: data.teams.nodes.length < data.teams.totalCount,
        hasPreviousPage: false,
      },
      totalCount: data.teams.totalCount,
    };
  }

  async listApiKeys(options?: ListOptions): Promise<PaginatedResponse<ApiKey>> {
    const data = await this.makeRequest(ListApiKeysDoc, {
      first: Math.min(options?.first ?? 50, 100),
      offset: options?.offset ?? 0,
    });
    return {
      nodes: data.apiKeys.nodes.map((node) => ({
        id: node.id,
        title: node.title,
        scopes: node.scopes.map((scope) => ({
          id: scope.id,
          name: scope.name,
        })),
        lastUsedAt: node.lastUsedAt ?? undefined,
        createdAt: node.createdAt,
      })),
      pageInfo: {
        hasNextPage: data.apiKeys.nodes.length < data.apiKeys.totalCount,
        hasPreviousPage: false,
      },
      totalCount: data.apiKeys.totalCount,
    };
  }

  /**
   * Create a new API key. The returned `token` is the plain-text bearer the
   * caller must surface to the user immediately -- the API key endpoint never
   * returns it again. The previous implementation read a top-level `token`
   * field that does not exist in the schema; the token is on
   * `createApiKey.apiKey.apiKey` (a sibling of `id`/`title`/`scopes`).
   */
  async createApiKey(input: ApiKeyCreateInput): Promise<CreatedApiKey> {
    const data = await this.makeRequest(CreateApiKeyDoc, {
      input: {
        title: input.title,
        // The manual ApiKeyCreateInput type accepts string[] for backwards
        // compatibility; the GraphQL schema expects the ScopeName enum, which
        // codegen emits as a string-valued TS enum. Cast at the boundary --
        // invalid scopes still surface as a server-side validation error.
        scopes: input.scopes as ScopeName[],
        dataSilos: input.dataSilos ?? null,
      },
    });
    const created = data.createApiKey.apiKey;
    return {
      id: created.id,
      title: created.title,
      scopes: created.scopes.map((scope) => ({
        id: scope.id,
        name: scope.name,
      })),
      createdAt: created.createdAt,
      token: created.apiKey,
    };
  }

  async getPrivacyCenter(lookup?: { url?: string }): Promise<PrivacyCenter | null> {
    try {
      const data = await this.makeRequest(GetPrivacyCenterDoc, {
        lookup: lookup ?? null,
      });
      if (data.privacyCenter) {
        return {
          id: data.privacyCenter.id,
          name: 'Privacy Center',
          url: lookup?.url ?? '',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      return null;
    } catch {
      return null;
    }
  }
}
