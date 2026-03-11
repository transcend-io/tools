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
