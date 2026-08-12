import {
  TranscendGraphQLBase,
  type ListOptions,
  type PaginatedResponse,
  type Request,
  type RequestDataSilo,
  type RequestDetails,
  type RequestType,
} from '@transcend-io/mcp-server-base';

import { graphql } from './__generated__/gql.js';

const ListRequestsDoc = graphql(/* GraphQL */ `
  query DsrListRequests($first: Int, $after: String) {
    requests(first: $first, after: $after) {
      nodes {
        id
        type
        status
        createdAt
        updatedAt
        owners {
          id
          email
          name
        }
        teams {
          id
          name
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`);

const GetRequestDoc = graphql(/* GraphQL */ `
  query DsrGetRequest($id: ID!) {
    request(id: $id) {
      id
      type
      status
      createdAt
      updatedAt
      daysRemaining
      link
      locale
      isSilent
      owners {
        id
        email
        name
      }
      teams {
        id
        name
      }
    }
  }
`);

const ListRequestDataSilosDoc = graphql(/* GraphQL */ `
  query DsrListRequestDataSilos(
    $first: Int
    $offset: Int
    $filterBy: RequestDataSiloFiltersInput!
  ) {
    requestDataSilos(first: $first, offset: $offset, filterBy: $filterBy) {
      nodes {
        id
        status
        error
        details
        link
        dataSilo {
          id
          title
          type
          outerType
          isLive
          owners {
            id
            email
            name
          }
          teams {
            id
            name
          }
        }
      }
      totalCount
    }
  }
`);

const EmployeeMakeDataSubjectRequestDoc = graphql(/* GraphQL */ `
  mutation DsrEmployeeMakeRequest($input: EmployeeRequestInput!) {
    employeeMakeDataSubjectRequest(input: $input) {
      clientMutationId
      request {
        id
        type
        status
        createdAt
        updatedAt
      }
    }
  }
`);

const CancelRequestDoc = graphql(/* GraphQL */ `
  mutation DsrCancel($input: CommunicationInput!) {
    cancelRequest(input: $input) {
      clientMutationId
      request {
        id
        type
        status
        createdAt
        updatedAt
      }
    }
  }
`);

function mapOwners(
  owners: { id: string; email: string; name?: string | null }[] | null | undefined,
): Request['owners'] {
  return owners?.map((owner) => ({
    id: owner.id,
    email: owner.email,
    name: owner.name ?? undefined,
  }));
}

function mapTeams(teams: { id: string; name: string }[] | null | undefined): Request['teams'] {
  return teams?.map((team) => ({
    id: team.id,
    name: team.name,
  }));
}

/** Filters for listing request–data-silo jobs on a DSR */
export interface ListRequestDataSilosOptions extends ListOptions {
  /** Request ID to list silo jobs for (required) */
  requestId: string;
  /** Filter by raw request-data-silo status values (e.g. ERROR, RESOLVED) */
  status?: string[];
  /** Filter by a single visual status (includes WAITING_ON_DEPENDENCIES, etc.) */
  visualStatus?: string;
  /** Free-text filter on silo title */
  text?: string;
}

export class DSRMixin extends TranscendGraphQLBase {
  async listRequests(options?: ListOptions): Promise<PaginatedResponse<Request>> {
    const data = await this.makeRequest(ListRequestsDoc, {
      first: Math.min(options?.first ?? 50, 100),
      after: options?.after ?? null,
    });
    return {
      nodes: data.requests.nodes.map((node) => ({
        id: node.id,
        type: node.type as RequestType,
        status: node.status as Request['status'],
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
        owners: mapOwners(node.owners),
        teams: mapTeams(node.teams),
      })),
      pageInfo: {
        hasNextPage: data.requests.pageInfo.hasNextPage,
        hasPreviousPage: false,
        endCursor: data.requests.pageInfo.endCursor ?? undefined,
      },
      totalCount: data.requests.totalCount,
    };
  }

  async getRequest(id: string): Promise<RequestDetails> {
    const data = await this.makeRequest(GetRequestDoc, { id });
    const r = data.request;
    return {
      id: r.id,
      type: r.type as RequestType,
      status: r.status as Request['status'],
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      daysRemaining: r.daysRemaining ?? undefined,
      link: r.link,
      locale: r.locale,
      isSilent: r.isSilent,
      owners: mapOwners(r.owners),
      teams: mapTeams(r.teams),
    };
  }

  async listRequestDataSilos(
    options: ListRequestDataSilosOptions,
  ): Promise<PaginatedResponse<RequestDataSilo>> {
    const offset = options.offset ?? 0;
    const first = Math.min(options.first ?? 50, 100);
    const filterBy: {
      requestId: string;
      status?: string[];
      visualStatus?: string;
      text?: string;
    } = {
      requestId: options.requestId,
    };
    if (options.status?.length) {
      filterBy.status = options.status;
    }
    if (options.visualStatus) {
      filterBy.visualStatus = options.visualStatus;
    }
    if (options.text) {
      filterBy.text = options.text;
    }

    const data = await this.makeRequest(ListRequestDataSilosDoc, {
      first,
      offset,
      filterBy: filterBy as never,
    });
    const connection = data.requestDataSilos;
    const nodes: RequestDataSilo[] = connection.nodes.map((node) => ({
      id: node.id,
      status: node.status,
      error: node.error ?? undefined,
      details: node.details || undefined,
      link: node.link,
      dataSilo: {
        id: node.dataSilo.id,
        title: node.dataSilo.title,
        type: node.dataSilo.type,
        outerType: node.dataSilo.outerType ?? undefined,
        isLive: node.dataSilo.isLive,
        owners: mapOwners(node.dataSilo.owners),
        teams: mapTeams(node.dataSilo.teams),
      },
    }));
    const totalCount = connection.totalCount;
    return {
      nodes,
      pageInfo: {
        hasNextPage: offset + nodes.length < totalCount,
        hasPreviousPage: offset > 0,
      },
      totalCount,
    };
  }

  async employeeMakeDataSubjectRequest(input: {
    type: RequestType;
    email: string;
    coreIdentifier?: string;
    locale?: string;
    isSilent?: boolean;
    subjectType: string;
    attributes?: Record<string, unknown>;
    clientMutationId?: string;
  }): Promise<{ request: Request; clientMutationId?: string }> {
    const data = await this.makeRequest(EmployeeMakeDataSubjectRequestDoc, {
      input: input as never,
    });
    const payload = data.employeeMakeDataSubjectRequest;
    return {
      request: {
        id: payload.request.id,
        type: payload.request.type as RequestType,
        status: payload.request.status as Request['status'],
        createdAt: payload.request.createdAt,
        updatedAt: payload.request.updatedAt,
      },
      clientMutationId: payload.clientMutationId ?? undefined,
    };
  }

  async cancelRequest(input: {
    requestId: string;
    template?: string;
    subject?: string;
  }): Promise<{ request: Request; clientMutationId?: string }> {
    const data = await this.makeRequest(CancelRequestDoc, { input: input as never });
    const payload = data.cancelRequest;
    return {
      request: {
        id: payload.request.id,
        type: payload.request.type as RequestType,
        status: payload.request.status as Request['status'],
        createdAt: payload.request.createdAt,
        updatedAt: payload.request.updatedAt,
      },
      clientMutationId: payload.clientMutationId ?? undefined,
    };
  }
}
