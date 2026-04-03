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

export * from './api/index.js';
export * from './data-inventory/index.js';
export * from './preference-management/index.js';
export * from './administration/index.js';
export * from './consent/index.js';
export * from './ai/index.js';
export * from './assessments/index.js';
export * from './code-intelligence/index.js';
export * from './consent/index.js';
export * from './dsr-automation/index.js';
