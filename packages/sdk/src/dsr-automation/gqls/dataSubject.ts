import { parse, type DocumentNode } from 'graphql';
import { gql } from 'graphql-request';

export const DATA_SUBJECTS: DocumentNode = parse(gql`
  query TranscendCliDataSubjects {
    internalSubjects {
      id
      title {
        defaultMessage
      }
      active
      type
      subjectClass
      adminDashboardDefaultSilentMode
      supportsAuthorizedAgent
      actions {
        type
      }
    }
  }
`);

export const CREATE_DATA_SUBJECT: DocumentNode = parse(gql`
  mutation TranscendCliCreateDataSubject($input: CreateSubjectInput!) {
    createSubject(input: $input) {
      subject {
        id
        type
      }
    }
  }
`);

export const UPDATE_DATA_SUBJECT: DocumentNode = parse(gql`
  mutation TranscendCliUpdateDataSubject($input: UpdateSubjectInput!) {
    updateSubject(input: $input) {
      clientMutationId
    }
  }
`);
