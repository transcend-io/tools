import { gql } from 'graphql-request';

export const APPROVE_PRIVACY_REQUEST = gql`
  mutation TranscendCliApprovePrivacyRequest($input: CommunicationInput!) {
    approveRequest(input: $input) {
      request {
        id
      }
    }
  }
`;
export const CANCEL_PRIVACY_REQUEST = gql`
  mutation TranscendCliCancelPrivacyRequest($input: CommunicationInput!) {
    cancelRequest(input: $input) {
      request {
        id
      }
    }
  }
`;

export const UPDATE_PRIVACY_REQUEST = gql`
  mutation TranscendCliUpdatePrivacyRequest($input: UpdateRequestInput!) {
    updateRequest(input: $input) {
      request {
        id
      }
    }
  }
`;

export const NOTIFY_ADDITIONAL_TIME = gql`
  mutation TranscendCliNotifyAdditionalTime($input: AdditionalTimeInput!) {
    notifyAdditionalTime(input: $input) {
      clientMutationId
    }
  }
`;
