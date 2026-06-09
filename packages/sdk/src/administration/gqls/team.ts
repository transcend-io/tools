import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
// useMaster: false
export const TEAMS = gql`
  query TranscendCliTeams($first: Int!, $offset: Int!, $input: TeamFiltersInput) {
    teams(
      first: $first
      offset: $offset
      filterBy: $input
      orderBy: [{ field: createdAt, direction: ASC }, { field: name, direction: ASC }]
    ) {
      nodes {
        id
        name
        description
        ssoDepartment
        ssoGroup
        ssoTitle
        users {
          id
          email
          name
        }
        scopes {
          id
          name
          title
        }
        parentTeam {
          id
          name
        }
      }
    }
  }
`;

export const PARENT_ORGANIZATION_TEAMS = gql`
  query TranscendCliParentOrganizationTeams(
    $first: Int!
    $offset: Int!
    $filterBy: ParentTeamFiltersInput
  ) {
    parentOrganizationTeams(
      first: $first
      offset: $offset
      filterBy: $filterBy
      orderBy: [{ field: createdAt, direction: ASC }, { field: name, direction: ASC }]
    ) {
      nodes {
        id
        name
      }
      totalCount
    }
  }
`;

export const CREATE_TEAM = gql`
  mutation TranscendCliCreateTeam($input: TeamInput!) {
    createTeam(input: $input) {
      team {
        id
        name
      }
    }
  }
`;

export const UPDATE_TEAM = gql`
  mutation TranscendCliUpdateTeam($input: UpdateTeamInput!) {
    updateTeam(input: $input) {
      team {
        id
        name
      }
    }
  }
`;
