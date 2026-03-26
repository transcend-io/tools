import { makeEnum } from '@transcend-io/type-utils';

/**
 * The types of files that can be used to detect a code package
 */
export const CodePackageType = makeEnum({
  PackageJson: 'PACKAGE_JSON',
  RequirementsTxt: 'REQUIREMENTS_TXT',
  Gradle: 'GRADLE',
  CocoaPods: 'COCOA_PODS',
  Swift: 'SWIFT',
  Kotlin: 'KOTLIN',
  Pubspec: 'PUBSPEC',
  Gemfile: 'GEMFILE',
  ComposerJson: 'COMPOSER_JSON',
});

/** Overrides type */
export type CodePackageType = (typeof CodePackageType)[keyof typeof CodePackageType];
