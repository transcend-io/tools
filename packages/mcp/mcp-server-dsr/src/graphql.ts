import {
  TranscendGraphQLBase,
  type ListOptions,
  type PaginatedResponse,
  type Request,
  type RequestDetails,
  type RequestType,
} from '@transcend-io/mcp-server-base';

export class DSRMixin extends TranscendGraphQLBase {
  async listRequests(options?: ListOptions): Promise<PaginatedResponse<Request>> {
    const query = `
      query ListRequests($first: Int, $after: String) {
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
    `;
    const data = await this.makeRequest<{ requests: PaginatedResponse<Request> }>(query, {
      first: Math.min(options?.first || 50, 100),
      after: options?.after,
    });
    return data.requests;
  }

  async getRequest(id: string): Promise<RequestDetails> {
    const query = `
      query GetRequest($id: ID!) {
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
    `;
    const data = await this.makeRequest<{ request: RequestDetails }>(query, { id });
    return data.request;
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
    const mutation = `
      mutation EmployeeMakeDataSubjectRequest($input: EmployeeRequestInput!) {
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
    `;
    const data = await this.makeRequest<{
      employeeMakeDataSubjectRequest: { request: Request; clientMutationId?: string };
    }>(mutation, { input });
    return data.employeeMakeDataSubjectRequest;
  }

  async cancelRequest(input: {
    requestId: string;
    template?: string;
    subject?: string;
  }): Promise<{ request: Request; clientMutationId?: string }> {
    const mutation = `
      mutation CancelRequest($input: CommunicationInput!) {
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
    `;
    const data = await this.makeRequest<{
      cancelRequest: { request: Request; clientMutationId?: string };
    }>(mutation, { input });
    return data.cancelRequest;
  }
}
