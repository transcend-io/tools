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

export class AdminMixin extends TranscendGraphQLBase {
  async getOrganization(): Promise<Organization> {
    const query = `
      query {
        organization {
          id
          name
          createdAt
        }
      }
    `;
    const data = await this.makeRequest<{ organization: Organization }>(query);
    return data.organization;
  }

  async getCurrentUser(): Promise<User> {
    const query = `
      query {
        user {
          id
          email
          name
          createdAt
        }
      }
    `;
    const data = await this.makeRequest<{ user: User }>(query);
    return data.user;
  }

  async listUsers(
    options?: ListOptions & { filterBy?: { text?: string } },
  ): Promise<PaginatedResponse<User>> {
    const query = `
      query ListUsers($first: Int, $filterBy: UserFiltersInput) {
        users(first: $first, filterBy: $filterBy) {
          nodes {
            id
            email
            name
          }
          totalCount
        }
      }
    `;
    const data = await this.makeRequest<{ users: { nodes: User[]; totalCount: number } }>(query, {
      first: Math.min(options?.first || 50, 100),
      ...(options?.filterBy ? { filterBy: options.filterBy } : {}),
    });
    return {
      nodes: data.users.nodes,
      pageInfo: {
        hasNextPage: data.users.nodes.length < data.users.totalCount,
        hasPreviousPage: false,
      },
      totalCount: data.users.totalCount,
    };
  }

  async listTeams(options?: ListOptions): Promise<PaginatedResponse<Team>> {
    const query = `
      query ListTeams($first: Int) {
        teams(first: $first) {
          nodes {
            id
            name
          }
          totalCount
        }
      }
    `;
    const data = await this.makeRequest<{ teams: { nodes: Team[]; totalCount: number } }>(query, {
      first: Math.min(options?.first || 50, 100),
    });
    return {
      nodes: data.teams.nodes,
      pageInfo: {
        hasNextPage: data.teams.nodes.length < data.teams.totalCount,
        hasPreviousPage: false,
      },
      totalCount: data.teams.totalCount,
    };
  }

  async listApiKeys(options?: ListOptions): Promise<PaginatedResponse<ApiKey>> {
    const query = `
      query ListApiKeys($first: Int, $offset: Int) {
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
    `;
    const data = await this.makeRequest<{ apiKeys: { nodes: ApiKey[]; totalCount: number } }>(
      query,
      {
        first: Math.min(options?.first || 50, 100),
        offset: options?.offset || 0,
      },
    );
    return {
      nodes: data.apiKeys.nodes,
      pageInfo: {
        hasNextPage: data.apiKeys.nodes.length < data.apiKeys.totalCount,
        hasPreviousPage: false,
      },
      totalCount: data.apiKeys.totalCount,
    };
  }

  async createApiKey(input: ApiKeyCreateInput): Promise<{ apiKey: ApiKey; token: string }> {
    const mutation = `
      mutation CreateApiKey($input: ApiKeyInput!) {
        createApiKey(input: $input) {
          apiKey {
            id
            title
            scopes
            createdAt
          }
          token
        }
      }
    `;
    const data = await this.makeRequest<{ createApiKey: { apiKey: ApiKey; token: string } }>(
      mutation,
      { input },
    );
    return data.createApiKey;
  }

  async getPrivacyCenter(lookup?: { url?: string }): Promise<PrivacyCenter | null> {
    const query = `
      query GetPrivacyCenter($lookup: PrivacyCenterLookupInput) {
        privacyCenter(lookup: $lookup) {
          id
        }
      }
    `;
    try {
      const data = await this.makeRequest<{ privacyCenter: { id: string } | null }>(query, {
        lookup: lookup || undefined,
      });
      if (data.privacyCenter) {
        return {
          id: data.privacyCenter.id,
          name: 'Privacy Center',
          url: lookup?.url || '',
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
