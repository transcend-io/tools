import { gql } from 'graphql-request';

export const COMPLIANCE_REPORTS = gql`
  query TranscendCliComplianceReports($first: Int!, $offset: Int!) {
    complianceReports(first: $first, offset: $offset, useMaster: false) {
      nodes {
        id
        title
        description
        processingActivitiesFilter
        dataProtectionOfficer {
          id
          email
        }
      }
    }
  }
`;

export const COMPLIANCE_REPORT_DATA = gql`
  query TranscendCliComplianceReportData($id: ID!) {
    complianceReportData(filterBy: { id: $id }) {
      data {
        columns {
          id
          name
          source
        }
      }
    }
  }
`;

export const CREATE_COMPLIANCE_REPORT = gql`
  mutation TranscendCliCreateComplianceReport($input: CreateComplianceReportInput!) {
    createComplianceReport(input: $input) {
      complianceReport {
        id
        title
      }
    }
  }
`;

export const UPDATE_COMPLIANCE_REPORT = gql`
  mutation TranscendCliUpdateComplianceReport($input: UpdateComplianceReportInput!) {
    updateComplianceReport(input: $input) {
      complianceReport {
        id
        title
      }
    }
  }
`;

export const REPROCESS_COMPLIANCE_REPORT = gql`
  mutation TranscendCliReprocessComplianceReport($input: ReprocessComplianceReportInput!) {
    reprocessComplianceReport(input: $input) {
      complianceReport {
        id
        title
      }
    }
  }
`;

export const DELETE_COMPLIANCE_REPORTS = gql`
  mutation TranscendCliDeleteComplianceReports($input: DeleteComplianceReportsInput!) {
    deleteComplianceReports(input: $input) {
      clientMutationId
    }
  }
`;
