import { describePackageName } from '@transcend-io/utils';

export interface MonorepoPackageDefinition {
  directory: string;
  displayName: string;
  packageName: string;
}

export function createMonorepoPackageDefinition(
  name: string,
  directory: string,
): MonorepoPackageDefinition {
  const packageNameParts = describePackageName(name);

  return {
    directory,
    displayName: packageNameParts.displayName,
    packageName: `@transcend-io/${packageNameParts.slug}`,
  };
}

export * from './gqls/index.js';
export * from './api/index.js';
export * from './data-inventory/index.js';
export * from './preference-management/index.js';
export * from './administration/index.js';
export * from './consent/index.js';
export * from './dsr-automation/index.js';
export * from './ai/index.js';
export * from './assessments/index.js';
export * from './code-intelligence/index.js';
export * from './custom-functions/index.js';
export {
  TranscendInput,
  normalizeTranscendInput,
  CookieCsvInput,
  DataFlowCsvInput,
  StoredApiKey,
  CodePackageInput,
  CodePackageSdk,
  ImportOnetrustAssessmentsInput,
  ConsentManagerServiceMetadata,
  CookieInput,
  DataFlowInput,
  DataSiloInput,
  BusinessEntityInput,
  ConsentManagerInput,
  DataCategoryInput,
  ProcessingPurposeInput,
  ProcessingActivityInput,
  VendorInput,
  DataSubjectInput,
  EnricherInput,
  IdentifierInput,
  AttributeInput,
  AttributeValueInput,
  IntlMessageInput,
  RegionInput,
  TeamInput,
  ActionItemCollectionInput,
  ActionItemInput,
  RepositoryInput,
  SoftwareDevelopmentKitInput,
  ConsentManageExperienceInput,
  PartitionInput,
  PolicyInput,
  PrivacyCenterInput,
} from './transcend-yml/codecs.js';
export {
  parseTranscendYaml,
  serializeTranscendYaml,
  replaceVariablesInYaml,
} from './transcend-yml/transcendYaml.js';
export { mergeTranscendInputs } from './transcend-yml/mergeTranscendInputs.js';
export { pullTranscendConfiguration } from './transcend-yml/pullTranscendConfiguration.js';
export { syncConfigurationToTranscend } from './transcend-yml/syncConfigurationToTranscend.js';
export { syncDataSilos } from './transcend-yml/syncDataSilos.js';
export { buildDeletionDependenciesInput } from './transcend-yml/buildDeletionDependencies.js';
export { ensureAllDataSubjectsExist } from './transcend-yml/ensureAllDataSubjectsExist.js';
export { normalizeDeletionDependencies } from './transcend-yml/normalizeDeletionDependencies.js';
export { validatePreferenceManagementSlugs } from './transcend-yml/validatePreferenceManagementSlugs.js';
export {
  TR_PULL_RESOURCE_SCOPE_MAP,
  TR_PUSH_RESOURCE_SCOPE_MAP,
  TR_YML_RESOURCE_TO_FIELD_NAME,
} from './transcend-yml/constants.js';
export { TranscendPullResource } from './transcend-yml/enums.js';
