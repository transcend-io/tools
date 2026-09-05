import { CodePackageSdk } from '../../../codecs.js';
import { type CodeScanningConfig, defaultCodeScanningFileRuntime } from '../types.js';

export const composerJson: CodeScanningConfig = {
  supportedFiles: ['composer.json'],
  ignoreDirs: ['vendor', 'node_modules', 'cache', 'build', 'dist'],
  scanFunction: (filePath, runtime = defaultCodeScanningFileRuntime) => {
    const file = runtime.fs.readFileSync(filePath, 'utf-8');
    const directory = runtime.path.dirname(filePath);
    const asJson = JSON.parse(file);
    const {
      name,
      description,
      require: requireDependencies = {},
      'require-dev': requiredDevDependencies = {},
    } = asJson;
    return [
      {
        // name of the package
        name: name || runtime.path.basename(directory),
        description,
        softwareDevelopmentKits: [
          ...Object.entries(requireDependencies).map(
            ([name, version]): CodePackageSdk => ({
              name,
              version: typeof version === 'string' ? version : undefined,
            }),
          ),
          ...Object.entries(requiredDevDependencies).map(
            ([name, version]): CodePackageSdk => ({
              name,
              version: typeof version === 'string' ? version : undefined,
              isDevDependency: true,
            }),
          ),
        ],
      },
    ];
  },
};
