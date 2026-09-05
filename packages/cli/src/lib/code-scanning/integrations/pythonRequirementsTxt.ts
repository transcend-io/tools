import { CodePackageType } from '@transcend-io/privacy-types';
import { findAllWithRegex } from '@transcend-io/type-utils';

import { listFiles } from '../../api-keys/index.js';
import { type CodeScanningConfig, defaultCodeScanningFileRuntime } from '../types.js';

const REQUIREMENTS_PACKAGE_MATCH = /(.+?)(=+)(.+)/;
const PACKAGE_NAME = /name *= *('|")(.+?)('|")/;
const PACKAGE_DESCRIPTION = /description *= *('|")(.+?)('|")/;

export const pythonRequirementsTxt: CodeScanningConfig = {
  supportedFiles: ['requirements.txt'],
  ignoreDirs: ['build', 'lib', 'lib64'],
  scanFunction: (filePath, runtime = defaultCodeScanningFileRuntime) => {
    const fileContents = runtime.fs.readFileSync(filePath, 'utf-8');
    const directory = runtime.path.dirname(filePath);
    const filesInFolder = listFiles(directory, undefined, false, { fs: runtime.fs });

    // parse setup file for name
    const setupFile = filesInFolder.find((file) => file === 'setup.py');
    const setupFileContents = setupFile
      ? runtime.fs.readFileSync(runtime.path.join(directory, setupFile), 'utf-8')
      : undefined;
    const packageName = setupFileContents
      ? (PACKAGE_NAME.exec(setupFileContents) || [])[2]
      : undefined;
    const packageDescription = setupFileContents
      ? (PACKAGE_DESCRIPTION.exec(setupFileContents) || [])[2]
      : undefined;

    const targets = findAllWithRegex(
      {
        value: new RegExp(REQUIREMENTS_PACKAGE_MATCH, 'g'),
        matches: ['name', 'equals', 'version'],
      },
      fileContents,
    );

    return [
      {
        name: packageName || runtime.path.basename(directory),
        description: packageDescription || undefined,
        type: CodePackageType.RequirementsTxt,
        softwareDevelopmentKits: targets.map((pkg) => ({
          name: pkg.name,
          version: pkg.version,
        })),
      },
    ];
  },
};
