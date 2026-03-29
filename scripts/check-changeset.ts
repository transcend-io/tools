import { execFileSync } from 'node:child_process';

import { fileExists, readJsonFile, readRepoFile } from './lib/repo-files.ts';
import { logGroup, prominentError } from './lib/reporting.ts';

type ChangesetConfig = {
  ignore?: unknown;
};

type PackageJson = {
  name?: unknown;
  private?: unknown;
};

type PackageMetadata = {
  directory: string;
  name: string;
  private: boolean;
};

const changesetConfig = readJsonFile<ChangesetConfig>('.changeset/config.json');
const ignoredPackages = new Set(
  (Array.isArray(changesetConfig.ignore) ? changesetConfig.ignore : []).filter(
    (value): value is string => typeof value === 'string',
  ),
);
const packageMetadataCache = new Map<string, PackageMetadata>();

const baseRef =
  process.env.CHANGESET_BASE_SHA ??
  (process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : 'origin/main');

try {
  run();
} catch (error) {
  const details = error instanceof Error ? error.message : String(error);
  console.error(details);
  process.exit(1);
}

function run(): void {
  const changedFiles = getChangedFiles(baseRef);
  const changedPackageFiles = changedFiles.filter(isRelevantPackageChange);
  const changedPublishablePackages = getChangedPublishablePackages(changedPackageFiles);

  if (changedPublishablePackages.length === 0) {
    return;
  }

  const changedChangesetFiles = changedFiles.filter(isChangesetFile).filter(fileExists);
  const referencedPackages = getReferencedPackages(changedChangesetFiles);
  const uncoveredPackages = changedPublishablePackages.filter(
    ({ name }) => !referencedPackages.has(name),
  );

  if (uncoveredPackages.length === 0) {
    return;
  }

  const uncoveredPackageDirectories = new Set(uncoveredPackages.map(({ directory }) => directory));
  const uncoveredPackageFiles = changedPackageFiles.filter((filePath) => {
    const packageDirectory = getPackageDirectory(filePath);

    return packageDirectory !== null && uncoveredPackageDirectories.has(packageDirectory);
  });
  const hasChangesetFiles = changedChangesetFiles.length > 0;

  prominentError(
    hasChangesetFiles ? 'Incomplete changeset' : 'Missing changeset',
    hasChangesetFiles
      ? 'Changeset files were found for this change, but they do not mention every changed publishable package.\nRun `pnpm changeset` or update the changeset frontmatter so each changed publishable package is listed before merging. See CONTRIBUTING.md for more information.'
      : 'No changeset was found for this change. Changes to publishable packages require a changeset.\nRun `pnpm changeset` and commit the generated file before merging. See CONTRIBUTING.md for more information.',
  );
  logGroup('Packages missing changeset coverage', uncoveredPackages.map(formatPackageInfo));
  logGroup('Changed publishable packages', changedPublishablePackages.map(formatPackageInfo));

  if (hasChangesetFiles) {
    logGroup(
      'Packages referenced by changesets',
      referencedPackages.size === 0
        ? ['- (none)']
        : Array.from(referencedPackages)
            .sort((a, b) => a.localeCompare(b))
            .map((packageName) => `- ${packageName}`),
    );
    logGroup(
      'Changed changeset files',
      changedChangesetFiles.map((filePath) => `- ${filePath}`),
    );
  }

  logGroup(
    'Changed files missing coverage',
    uncoveredPackageFiles.map((filePath) => `- ${filePath}`),
  );

  process.exit(1);
}

function getChangedFiles(base: string): string[] {
  try {
    const output = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], {
      encoding: 'utf8',
    });

    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);

    console.error(`Failed to compare changes against ${base}.`);
    console.error(details);
    process.exit(1);
  }
}

function isChangesetFile(filePath: string): boolean {
  return (
    filePath.startsWith('.changeset/') &&
    filePath.endsWith('.md') &&
    filePath !== '.changeset/README.md'
  );
}

function isRelevantPackageChange(filePath: string): boolean {
  if (!filePath.startsWith('packages/')) {
    return false;
  }

  const [, packageName, ...rest] = filePath.split('/');
  const relativePath = rest.join('/');

  if (!packageName || !relativePath) {
    return false;
  }

  if (
    relativePath.startsWith('.turbo/') ||
    relativePath.startsWith('dist/') ||
    relativePath.startsWith('node_modules/') ||
    relativePath.endsWith('.test.ts') ||
    relativePath.endsWith('.test.tsx') ||
    relativePath.endsWith('.spec.ts') ||
    relativePath.endsWith('.spec.tsx') ||
    // *.md files on package roots (e.g. README.md files)
    relativePath.split('/')[0]?.endsWith('.md')
  ) {
    return false;
  }

  return true;
}

function getPackageDirectory(filePath: string): string | null {
  const [, packageDirectory] = filePath.split('/');

  if (!packageDirectory) {
    return null;
  }

  return `packages/${packageDirectory}`;
}

function getChangedPublishablePackages(filePaths: string[]): PackageMetadata[] {
  const changedPublishablePackages = new Map<string, PackageMetadata>();

  for (const filePath of filePaths) {
    const packageDirectory = getPackageDirectory(filePath);

    if (!packageDirectory) {
      continue;
    }

    const packageMetadata = getPackageMetadata(packageDirectory);

    if (packageMetadata.private || ignoredPackages.has(packageMetadata.name)) {
      continue;
    }

    changedPublishablePackages.set(packageMetadata.name, packageMetadata);
  }

  return Array.from(changedPublishablePackages.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

function getPackageMetadata(packageDirectory: string): PackageMetadata {
  const cachedMetadata = packageMetadataCache.get(packageDirectory);

  if (cachedMetadata) {
    return cachedMetadata;
  }

  const packageJsonPath = `${packageDirectory}/package.json`;
  const packageJson = readJsonFile<PackageJson>(packageJsonPath);

  if (typeof packageJson.name !== 'string' || packageJson.name.length === 0) {
    throw new Error(`Missing package name in ${packageJsonPath}.`);
  }

  const packageMetadata = {
    directory: packageDirectory,
    name: packageJson.name,
    private: packageJson.private === true,
  };

  packageMetadataCache.set(packageDirectory, packageMetadata);

  return packageMetadata;
}

function getReferencedPackages(changesetFiles: string[]): Set<string> {
  const referencedPackages = new Set<string>();

  for (const filePath of changesetFiles) {
    for (const packageName of getReferencedPackagesFromChangeset(filePath)) {
      referencedPackages.add(packageName);
    }
  }

  return referencedPackages;
}

function getReferencedPackagesFromChangeset(filePath: string): string[] {
  const content = readRepoFile(filePath);
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)^---(?:\r?\n|$)/m);

  if (!frontmatterMatch) {
    throw new Error(`Could not parse changeset frontmatter in ${filePath}.`);
  }

  const frontmatter = frontmatterMatch[1]?.trim() ?? '';

  if (!frontmatter) {
    return [];
  }

  return frontmatter
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => parseChangesetFrontmatterLine(line, filePath));
}

function parseChangesetFrontmatterLine(line: string, filePath: string): string {
  const separatorIndex = line.indexOf(':');

  if (separatorIndex === -1) {
    throw new Error(`Invalid changeset frontmatter line in ${filePath}: ${line}`);
  }

  const rawPackageName = line.slice(0, separatorIndex).trim();
  const rawReleaseType = line
    .slice(separatorIndex + 1)
    .trim()
    .replace(/\s+#.*$/, '');
  const packageName = unwrapQuotes(rawPackageName);

  if (!packageName) {
    throw new Error(`Invalid package name in ${filePath}: ${line}`);
  }

  if (!isReleaseType(rawReleaseType)) {
    throw new Error(`Invalid release type in ${filePath}: ${line}`);
  }

  return packageName;
}

function unwrapQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).trim();
  }

  return value;
}

function isReleaseType(value: string): boolean {
  return value === 'major' || value === 'minor' || value === 'patch';
}

function formatPackageInfo({ name, directory }: PackageMetadata): string {
  return `- ${name} (${directory})`;
}
