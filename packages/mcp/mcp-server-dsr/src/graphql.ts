import {
  TranscendGraphQLBase,
  type ListOptions,
  type PaginatedResponse,
  type Request,
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
