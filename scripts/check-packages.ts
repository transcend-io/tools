import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { fileExists, readJsonFile, readRepoFile, repoRoot } from './lib/repo-files.ts';
import { logGroup, prominentError } from './lib/reporting.ts';

type PackageManifest = {
  author?: unknown;
  bin?: unknown;
  devDependencies?: unknown;
  engines?: unknown;
  exports?: unknown;
  files?: unknown;
  homepage?: unknown;
  license?: unknown;
  main?: unknown;
  name?: unknown;
  private?: unknown;
  publishConfig?: unknown;
  repository?: unknown;
  scripts?: unknown;
  sideEffects?: unknown;
  type?: unknown;
  types?: unknown;
  version?: unknown;
};

type PackageTsconfig = {
  compilerOptions?: unknown;
  extends?: unknown;
  include?: unknown;
};

type RootTsconfig = {
  references?: unknown;
};

type ValidationProblem = {
  scope: string;
  message: string;
};

const packagesRoot = join(repoRoot, 'packages');
const requiredPackageScripts = {
  build: 'tsdown',
  test: 'vitest run',
  typecheck: 'tsc -p tsconfig.json --noEmit',
  'check:exports': 'attw --pack . --ignore-rules cjs-resolves-to-esm',
} as const;
const requiredPublishablePackageScripts = {
  'check:publint': 'publint --level warning --strict --pack pnpm',
} as const;
const requiredDevDependencies = [
  '@arethetypeswrong/cli',
  '@types/node',
  'tsdown',
  'typescript',
  'vitest',
] as const;
const requiredPublishableDevDependencies = ['publint'] as const;

try {
  run();
} catch (error) {
  const details = error instanceof Error ? error.message : String(error);
  console.error(details);
  process.exit(1);
}

function run(): void {
  const packageDirectories = getPackageDirectories();
  const problems: ValidationProblem[] = [];

  validateRootTsconfigReferences(packageDirectories, problems);

  for (const packageDirectory of packageDirectories) {
    validatePackage(packageDirectory, problems);
  }

  if (problems.length === 0) {
    return;
  }

  prominentError(
    'Package consistency check failed',
    'Package consistency rules were violated.\nFix the package metadata or layout issues below before merging.',
  );
  logGroup(
    'Consistency issues',
    problems
      .sort((a, b) =>
        a.scope === b.scope ? a.message.localeCompare(b.message) : a.scope.localeCompare(b.scope),
      )
      .map(({ scope, message }) => `- ${scope}: ${message}`),
  );
  process.exit(1);
}

function getPackageDirectories(): string[] {
  return readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `packages/${entry.name}`)
    .filter((packageDirectory) => fileExists(`${packageDirectory}/package.json`))
    .sort((a, b) => a.localeCompare(b));
}

function validateRootTsconfigReferences(
  packageDirectories: string[],
  problems: ValidationProblem[],
): void {
  const rootTsconfig = readJsonFile<RootTsconfig>('tsconfig.json');
  const references = Array.isArray(rootTsconfig.references) ? rootTsconfig.references : [];
  const actualReferences = new Set(
    references
      .map((reference) => {
        if (!isRecord(reference) || typeof reference.path !== 'string') {
          return null;
        }

        return reference.path;
      })
      .filter((reference): reference is string => reference !== null),
  );

  for (const packageDirectory of packageDirectories) {
    const expectedReference = `./${packageDirectory}`;

    if (!actualReferences.has(expectedReference)) {
      problems.push({
        message: `missing root tsconfig reference ${expectedReference}`,
        scope: 'tsconfig.json',
      });
    }
  }

  for (const reference of actualReferences) {
    if (reference.startsWith('./packages/') && !packageDirectories.includes(reference.slice(2))) {
      problems.push({
        message: `contains stale root tsconfig reference ${reference}`,
        scope: 'tsconfig.json',
      });
    }
  }
}

function validatePackage(packageDirectory: string, problems: ValidationProblem[]): void {
  const manifest = readJsonFile<PackageManifest>(`${packageDirectory}/package.json`);
  const isPrivatePackage = manifest.private === true;

  expectFile(packageDirectory, 'tsconfig.json', problems);
  expectFile(packageDirectory, 'tsdown.config.ts', problems);
  expectFile(packageDirectory, 'src/index.ts', problems);

  validateManifest(packageDirectory, manifest, problems);
  validateTsconfig(packageDirectory, problems);
  validateTsdownConfig(packageDirectory, problems);

  if (!isPrivatePackage) {
    validatePublishableTooling(packageDirectory, manifest, problems);
    validatePublishableMetadata(packageDirectory, manifest, problems);
  }

  if (!isPrivatePackage && shouldRequireChangelog(manifest)) {
    expectFile(packageDirectory, 'CHANGELOG.md', problems);
  }
}

function validateManifest(
  packageDirectory: string,
  manifest: PackageManifest,
  problems: ValidationProblem[],
): void {
  const packageName = getExpectedPackageName(packageDirectory);

  expectEqual(packageDirectory, 'name', manifest.name, packageName, problems);
  expectEqual(packageDirectory, 'license', manifest.license, 'Apache-2.0', problems);
  expectEqual(packageDirectory, 'type', manifest.type, 'module', problems);
  expectEqual(packageDirectory, 'sideEffects', manifest.sideEffects, false, problems);
  expectEqual(packageDirectory, 'types', manifest.types, './dist/index.d.mts', problems);
  expectEqual(
    packageDirectory,
    'engines.node',
    getNestedValue(manifest, 'engines', 'node'),
    '>=22.12.0',
    problems,
  );
  expectEqual(
    packageDirectory,
    'publishConfig.access',
    getNestedValue(manifest, 'publishConfig', 'access'),
    'public',
    problems,
  );
  expectArrayEqual(packageDirectory, 'files', manifest.files, ['dist'], problems);

  const exportDot = getNestedValue(manifest, 'exports', '.');
  expectEqual(
    packageDirectory,
    'exports["."].@transcend-io/source',
    getNestedValue(exportDot, '@transcend-io/source'),
    './src/index.ts',
    problems,
  );
  expectEqual(
    packageDirectory,
    'exports["."].types',
    getNestedValue(exportDot, 'types'),
    './dist/index.d.mts',
    problems,
  );
  expectEqual(
    packageDirectory,
    'exports["."].default',
    getNestedValue(exportDot, 'default'),
    './dist/index.mjs',
    problems,
  );

  for (const [scriptName, expectedCommand] of Object.entries(requiredPackageScripts)) {
    expectEqual(
      packageDirectory,
      `scripts.${scriptName}`,
      getNestedValue(manifest, 'scripts', scriptName),
      expectedCommand,
      problems,
    );
  }

  for (const dependencyName of requiredDevDependencies) {
    expectEqual(
      packageDirectory,
      `devDependencies.${dependencyName}`,
      getNestedValue(manifest, 'devDependencies', dependencyName),
      'catalog:',
      problems,
    );
  }
}

function validatePublishableMetadata(
  packageDirectory: string,
  manifest: PackageManifest,
  problems: ValidationProblem[],
): void {
  const packagePath = packageDirectory.replace(/^packages\//, '');
  const expectedHomepage = `https://github.com/transcend-io/tools/tree/main/${packageDirectory}`;

  expectEqual(packageDirectory, 'homepage', manifest.homepage, expectedHomepage, problems);
  expectEqual(packageDirectory, 'author', manifest.author, 'Transcend Inc.', problems);
  expectEqual(
    packageDirectory,
    'repository.type',
    getNestedValue(manifest, 'repository', 'type'),
    'git',
    problems,
  );
  expectEqual(
    packageDirectory,
    'repository.url',
    getNestedValue(manifest, 'repository', 'url'),
    'https://github.com/transcend-io/tools.git',
    problems,
  );
  expectEqual(
    packageDirectory,
    'repository.directory',
    getNestedValue(manifest, 'repository', 'directory'),
    `packages/${packagePath}`,
    problems,
  );
}

function validatePublishableTooling(
  packageDirectory: string,
  manifest: PackageManifest,
  problems: ValidationProblem[],
): void {
  for (const [scriptName, expectedCommand] of Object.entries(requiredPublishablePackageScripts)) {
    expectEqual(
      packageDirectory,
      `scripts.${scriptName}`,
      getNestedValue(manifest, 'scripts', scriptName),
      expectedCommand,
      problems,
    );
  }

  for (const dependencyName of requiredPublishableDevDependencies) {
    expectEqual(
      packageDirectory,
      `devDependencies.${dependencyName}`,
      getNestedValue(manifest, 'devDependencies', dependencyName),
      'catalog:',
      problems,
    );
  }
}

function validateTsconfig(packageDirectory: string, problems: ValidationProblem[]): void {
  if (!fileExists(`${packageDirectory}/tsconfig.json`)) {
    return;
  }

  const tsconfig = readJsonFile<PackageTsconfig>(`${packageDirectory}/tsconfig.json`);
  const compilerOptions = isRecord(tsconfig.compilerOptions) ? tsconfig.compilerOptions : {};
  const include = Array.isArray(tsconfig.include)
    ? tsconfig.include.filter((value): value is string => typeof value === 'string')
    : [];
  const types = Array.isArray(compilerOptions.types)
    ? compilerOptions.types.filter((value): value is string => typeof value === 'string')
    : [];

  expectEqual(
    packageDirectory,
    'tsconfig.extends',
    tsconfig.extends,
    '../../tsconfig.base.json',
    problems,
  );
  expectEqual(
    packageDirectory,
    'tsconfig.compilerOptions.outDir',
    compilerOptions.outDir,
    'dist',
    problems,
  );
  expectEqual(
    packageDirectory,
    'tsconfig.compilerOptions.rootDir',
    compilerOptions.rootDir,
    'src',
    problems,
  );

  expectArrayContains(packageDirectory, 'tsconfig.compilerOptions.types', types, 'node', problems);
  expectArrayContains(
    packageDirectory,
    'tsconfig.compilerOptions.types',
    types,
    'vitest/globals',
    problems,
  );
  expectArrayContains(packageDirectory, 'tsconfig.include', include, 'src/**/*.ts', problems);
}

function validateTsdownConfig(packageDirectory: string, problems: ValidationProblem[]): void {
  const configPath = `${packageDirectory}/tsdown.config.ts`;

  if (!fileExists(configPath)) {
    return;
  }

  const configContents = readRepoFile(configPath);

  expectTextContains(
    packageDirectory,
    'tsdown.config.ts',
    configContents,
    "import sharedConfig from '../../tsdown.config.base.ts';",
    problems,
  );
  expectTextContains(
    packageDirectory,
    'tsdown.config.ts',
    configContents,
    '...sharedConfig',
    problems,
  );
  expectTextContains(
    packageDirectory,
    'tsdown.config.ts',
    configContents,
    "'src/index.ts'",
    problems,
  );
}

function shouldRequireChangelog(manifest: PackageManifest): boolean {
  return typeof manifest.version === 'string' && manifest.version !== '0.0.0';
}

function getExpectedPackageName(packageDirectory: string): string {
  return `@transcend-io/${packageDirectory.replace(/^packages\//, '')}`;
}

function expectFile(
  packageDirectory: string,
  relativePath: string,
  problems: ValidationProblem[],
): void {
  const filePath = `${packageDirectory}/${relativePath}`;

  if (!fileExists(filePath)) {
    problems.push({
      message: `missing required file ${relativePath}`,
      scope: packageDirectory,
    });
  }
}

function expectEqual(
  scope: string,
  label: string,
  actual: unknown,
  expected: unknown,
  problems: ValidationProblem[],
): void {
  if (actual !== expected) {
    problems.push({
      message: `${label} should be ${formatValue(expected)} (received ${formatValue(actual)})`,
      scope,
    });
  }
}

function expectArrayEqual(
  scope: string,
  label: string,
  actual: unknown,
  expected: string[],
  problems: ValidationProblem[],
): void {
  const actualValues = Array.isArray(actual)
    ? actual.filter((value): value is string => typeof value === 'string')
    : null;

  if (!actualValues || actualValues.length !== expected.length) {
    problems.push({
      message: `${label} should be ${formatValue(expected)} (received ${formatValue(actual)})`,
      scope,
    });
    return;
  }

  for (let index = 0; index < expected.length; index += 1) {
    if (actualValues[index] !== expected[index]) {
      problems.push({
        message: `${label} should be ${formatValue(expected)} (received ${formatValue(actualValues)})`,
        scope,
      });
      return;
    }
  }
}

function expectArrayContains(
  scope: string,
  label: string,
  actual: string[],
  expectedValue: string,
  problems: ValidationProblem[],
): void {
  if (!actual.includes(expectedValue)) {
    problems.push({
      message: `${label} should include ${formatValue(expectedValue)} (received ${formatValue(actual)})`,
      scope,
    });
  }
}

function expectTextContains(
  scope: string,
  label: string,
  actualText: string,
  expectedSnippet: string,
  problems: ValidationProblem[],
): void {
  if (!actualText.includes(expectedSnippet)) {
    problems.push({
      message: `${label} should include ${formatValue(expectedSnippet)}`,
      scope,
    });
  }
}

function getNestedValue(value: unknown, ...keys: string[]): unknown {
  let current: unknown = value;

  for (const key of keys) {
    if (!isRecord(current)) {
      return undefined;
    }

    current = current[key];
  }

  return current;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'undefined') {
    return 'undefined';
  }

  return JSON.stringify(value);
}

/** Prominent failure output: GitHub Actions annotations (::error::) or ANSI red locally. */
