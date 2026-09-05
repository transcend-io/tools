import { CodePackageType } from '@transcend-io/privacy-types';
import { findAllWithRegex } from '@transcend-io/type-utils';

import { listFiles } from '../../api-keys/index.js';
import { type CodeScanningConfig, defaultCodeScanningFileRuntime } from '../types.js';

const GEM_PACKAGE_REGEX = /gem *('|")(.+?)('|")(, *('|")(.+?)('|")|)/;
const GEMFILE_PACKAGE_NAME_REGEX = /spec\.name *= *('|")(.+?)('|")/;
const GEMFILE_PACKAGE_DESCRIPTION_REGEX = /spec\.description *= *('|")(.+?)('|")/;
const GEMFILE_PACKAGE_SUMMARY_REGEX = /spec\.summary *= *('|")(.+?)('|")/;

export const gemfile: CodeScanningConfig = {
  supportedFiles: ['Gemfile'],
  ignoreDirs: ['bin'],
  scanFunction: (filePath, runtime = defaultCodeScanningFileRuntime) => {
    const fileContents = runtime.fs.readFileSync(filePath, 'utf-8');
    const directory = runtime.path.dirname(filePath);
    const filesInFolder = listFiles(directory, undefined, false, { fs: runtime.fs });

    // parse gemspec file for name
    const gemspec = filesInFolder.find((file) => file.endsWith('.gemspec'));
    const gemspecContents = gemspec
      ? runtime.fs.readFileSync(runtime.path.join(directory, gemspec), 'utf-8')
      : undefined;
    const gemfileName = gemspecContents
      ? (GEMFILE_PACKAGE_NAME_REGEX.exec(gemspecContents) || [])[2]
      : undefined;
    const gemfileDescription = gemspecContents
      ? (GEMFILE_PACKAGE_DESCRIPTION_REGEX.exec(gemspecContents) ||
          GEMFILE_PACKAGE_SUMMARY_REGEX.exec(gemspecContents) ||
          [])[1]
      : undefined;

    const targets = findAllWithRegex(
      {
        value: new RegExp(GEM_PACKAGE_REGEX, 'g'),
        matches: ['quote1', 'name', 'quote2', 'hasVersion', 'quote3', 'version', 'quote4'],
      },
      fileContents,
    );

    return [
      {
        name: gemfileName || runtime.path.basename(directory),
        description: gemfileDescription || undefined,
        type: CodePackageType.RequirementsTxt,
        softwareDevelopmentKits: targets.map((pkg) => ({
          name: pkg.name,
          version: pkg.version,
        })),
      },
    ];
  },
};
