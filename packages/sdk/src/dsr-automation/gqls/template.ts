import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - order by createdAt
// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
export const TEMPLATES = gql`
  query TranscendCliTemplates($title: String, $first: Int!, $offset: Int!) {
    templates(filterBy: { text: $title }, first: $first, offset: $offset, useMaster: false) {
      nodes {
        id
        title
        type
        subject {
          defaultMessage
        }
        template {
          defaultMessage
        }
      }
    }
  }
`;

export const CREATE_TEMPLATE = gql`
  mutation TranscendCliCreateTemplate($input: TemplateInput!) {
    createTemplate(input: $input) {
      clientMutationId
    }
  }
`;

export const UPDATE_TEMPLATE = gql`
  mutation TranscendCliUpdateTemplate($input: UpdateTemplateInput!) {
    updateTemplate(input: $input) {
      clientMutationId
    }
  }
`;
