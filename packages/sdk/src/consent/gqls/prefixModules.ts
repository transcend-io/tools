import { gql } from 'graphql-request';

/** A prefix module release attached to an airgap bundle */
export interface TranscendAirgapBundlePrefixModuleGql {
  /** ID of the bundle to module link */
  id: string;
  /** JSON config for the module on this bundle */
  config: string | null;
  /** Release of the module that is attached */
  airgapPrefixModuleRelease: {
    /** Version of the module */
    version: string;
    /** Module the release belongs to */
    airgapPrefixModule: {
      /** ID of the module */
      id: string;
      /** Name of the module */
      name: string;
      /** Organization that owns the module, null for Transcend provided modules */
      organizationId: string | null;
    };
  };
}

/** Full response from FETCH_AIRGAP_BUNDLE_PREFIX_MODULES */
export interface TranscendCliFetchAirgapBundlePrefixModulesResponse {
  /** Prefix modules payload */
  airgapBundleAirgapPrefixModules: {
    /** Prefix modules on the bundle */
    nodes: TranscendAirgapBundlePrefixModuleGql[];
    /** Total number of prefix modules on the bundle */
    totalCount: number;
  };
}

export const FETCH_AIRGAP_BUNDLE_PREFIX_MODULES = gql`
  query TranscendCliFetchAirgapBundlePrefixModules(
    $airgapBundleId: ID!
    $first: Int!
    $offset: Int!
  ) {
    airgapBundleAirgapPrefixModules(
      input: { airgapBundleId: $airgapBundleId }
      first: $first
      offset: $offset
    ) {
      totalCount
      nodes {
        id
        config
        airgapPrefixModuleRelease {
          version
          airgapPrefixModule {
            id
            name
            organizationId
          }
        }
      }
    }
  }
`;
