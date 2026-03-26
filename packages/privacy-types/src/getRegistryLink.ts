import { CodePackageType } from './code.js';

export const CODE_PACKAGE_TYPE_TO_LINK: {
  [k in CodePackageType]: (name: string) => string;
} = {
  [CodePackageType.CocoaPods]: (name) => `https://cocoapods.org/pods/${name}`,
  [CodePackageType.Gradle]: (name) =>
    `https://mvnrepository.com/artifact/${name.split(':').join('/')}`,
  [CodePackageType.PackageJson]: (name) => `https://www.npmjs.com/package/${name}`,
  [CodePackageType.RequirementsTxt]: (name) => `https://pypi.org/project/${name}`,
  [CodePackageType.Swift]: (name) => `https://swiftpackageindex.com/search?query=${name}`,
  [CodePackageType.Pubspec]: (name) => `https://pub.dev/packages/${name}`,
  [CodePackageType.Gemfile]: (name) => `https://rubygems.org/gems/${name}`,
  [CodePackageType.ComposerJson]: (name) => `https://packagist.org/packages/${name}`,
  [CodePackageType.Kotlin]: (name) =>
    `https://mvnrepository.com/artifact/${name.split(':').join('/')}`,
};

/**
 * Get the registry link for a given code package
 *
 * @param name - Name of package
 * @param type - Type of registry
 * @returns The registry link
 */
export function getRegistryLink(name: string, type: CodePackageType): string {
  return CODE_PACKAGE_TYPE_TO_LINK[type](name);
}
