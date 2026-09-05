import { CodePackageSdk } from '../../../codecs.js';
import { type CodeScanningConfig, defaultCodeScanningFileRuntime } from '../types.js';

export const javascriptPackageJson: CodeScanningConfig = {
  supportedFiles: ['package.json'],
  ignoreDirs: ['node_modules', 'serverless-build', 'lambda-build'],
  scanFunction: (filePath, runtime = defaultCodeScanningFileRuntime) => {
    const file = runtime.fs.readFileSync(filePath, 'utf-8');
    const directory = runtime.path.dirname(filePath);
    const asJson = JSON.parse(file);
    const {
      name,
      description,
      dependencies = {},
      devDependencies = {},
      optionalDependencies = {},
    } = asJson;
    return [
      {
        // name of the package
        name: name || runtime.path.basename(directory),
        description,
        softwareDevelopmentKits: [
          ...Object.entries(dependencies).map(
            ([name, version]): CodePackageSdk => ({
              name,
              version: typeof version === 'string' ? version : undefined,
            }),
          ),
          ...Object.entries(devDependencies).map(
            ([name, version]): CodePackageSdk => ({
              name,
              version: typeof version === 'string' ? version : undefined,
              isDevDependency: true,
            }),
          ),
          ...Object.entries(optionalDependencies).map(
            ([name, version]): CodePackageSdk => ({
              name,
              version: typeof version === 'string' ? version : undefined,
            }),
          ),
        ],
      },
    ];
  },
};
