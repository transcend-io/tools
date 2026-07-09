import { gql } from 'graphql-request';

export const FETCH_PRIVACY_CENTER_ID = gql`
  query TranscendCliFetchPrivacyCenterId($url: String!) {
    privacyCenter(lookup: { url: $url }) {
      id
    }
  }
`;

export const DEPLOYED_PRIVACY_CENTER_URL = gql`
  query TranscendCliDeployedPrivacyCenterUrl {
    organization {
      deployedPrivacyCenterUrl
    }
  }
`;

export const PRIVACY_CENTER = gql`
  query TranscendCliFetchPrivacyCenters($url: String!) {
    privacyCenter(lookup: { url: $url }) {
      id
      url
      isDisabled
      showPrivacyRequestButton
      showPolicies
      showTrackingTechnologies
      showCookies
      showDataFlows
      showConsentManager
      showManageYourPrivacy
      showMarketingPreferences
      locales
      defaultLocale
      preferBrowserDefaultLocale
      supportEmail
      replyToEmail
      useNoReplyEmailAddress
      useCustomEmailDomain
      transformAccessReportJsonToCsv
      home
      expandSideMenuByDefault
      workflowsCustomFieldsRequired
      footerLayout
      themeStr
      childOrganizations {
        id
        uri
        name
      }
      footerLinks {
        id
        displayOrder
        title {
          defaultMessage
        }
        url {
          defaultMessage
        }
        iconOnly
      }
    }
  }
`;

export const UPDATE_PRIVACY_CENTER = gql`
  mutation TranscendCliUpdatePrivacyCenter($input: UpdatePrivacyCenterInput!) {
    updatePrivacyCenter(input: $input) {
      clientMutationId
    }
  }
`;

export const UPDATE_PRIVACY_CENTER_FOOTER_LINKS = gql`
  mutation TranscendCliUpdatePrivacyCenterFooterLinks(
    $input: UpdatePrivacyCenterFooterLinksInput!
  ) {
    updatePrivacyCenterFooterLinks(input: $input) {
      clientMutationId
    }
  }
`;

export const DELETE_PRIVACY_CENTER_FOOTER_LINKS = gql`
  mutation TranscendCliDeletePrivacyCenterFooterLinks(
    $input: DeletePrivacyCenterFooterLinksInput!
  ) {
    deletePrivacyCenterFooterLinks(input: $input) {
      clientMutationId
      success
    }
  }
`;
