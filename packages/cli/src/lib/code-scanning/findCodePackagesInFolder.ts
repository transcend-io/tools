import { getEntries } from '@transcend-io/type-utils';
import colors from 'colors';
import fastGlob from 'fast-glob';

import { CodePackageInput } from '../../codecs.js';
import { CODE_SCANNING_CONFIGS } from './constants.js';
import { type CodeScanningRuntime, defaultCodeScanningRuntime } from './types.js';

/**
 * Helper to scan and discovery all of the code packages within a folder
 *
 * @param options - Options
 * @param runtime - Runtime dependencies used to scan package files
 * @returns the list of integrations
 */
export async function findCodePackagesInFolder(
  {
    scanPath,
    ignoreDirs = [],
    repositoryName,
  }: {
    /** The name of the github repository reporting packages for */
    repositoryName: string;
    /** Where to look for package.json files */
    scanPath: string;
    /** The directories to ignore (excludes node_modules and serverless-build) */
    ignoreDirs?: string[];
  },
  runtime: CodeScanningRuntime = defaultCodeScanningRuntime,
): Promise<CodePackageInput[]> {
  const allCodePackages = await Promise.all(
    getEntries(CODE_SCANNING_CONFIGS).map(async ([codePackageType, config]) => {
      const { ignoreDirs: configIgnoreDirs, supportedFiles, scanFunction } = config;
      const dirsToIgnore = [...ignoreDirs, ...configIgnoreDirs].filter((dir) => dir.length > 0);
      try {
        const filesToScan: string[] = await fastGlob(`${scanPath}/**/${supportedFiles.join('|')}`, {
          ignore: dirsToIgnore.map((dir: string) => `${scanPath}/**/${dir}`),
          unique: true,
          onlyFiles: true,
        });
        runtime.logger.info(
          colors.magenta(`Scanning: ${filesToScan.length} files of type ${codePackageType}`),
        );
        const allPackages = filesToScan
          .map((filePath) =>
            scanFunction(filePath, runtime).map((result) => ({
              ...result,
              relativePath: filePath.replace(`${scanPath}/`, ''),
            })),
          )
          .flat();
        runtime.logger.info(
          colors.green(
            `Found: ${allPackages.length} packages and ${
              allPackages.map(({ softwareDevelopmentKits = [] }) => softwareDevelopmentKits).flat()
                .length
            } sdks`,
          ),
        );

        return allPackages.map(
          (pkg): CodePackageInput => ({
            ...pkg,
            type: codePackageType,
            repositoryName,
          }),
        );
      } catch (error) {
        throw new Error(`Error scanning globs ${supportedFiles} with error: ${error}`);
      }
    }),
  );

  return allCodePackages.flat();
}
