import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const checkChangesetScriptPath = fileURLToPath(new URL('./check-changeset.ts', import.meta.url));
const temporaryRepositories: string[] = [];

type PackageDefinition = {
  directory: string;
  name: string;
  private?: boolean;
  version?: string;
};

type RepositoryDefinition = {
  packages: PackageDefinition[];
};

type Repository = {
  baseSha: string;
  path: string;
};

type PackageJson = Record<string, unknown>;

afterEach(() => {
  while (temporaryRepositories.length > 0) {
    const repositoryPath = temporaryRepositories.pop();

    if (repositoryPath) {
      rmSync(repositoryPath, { force: true, recursive: true });
    }
  }
});

describe('check-changeset', () => {
  it('ignores packages at version 0.0.0 until the first real release', () => {
    const repository = createRepository({
      packages: [{ directory: 'alpha-pkg', name: '@transcend-io/alpha-pkg', version: '0.0.0' }],
    });

    writeRepositoryFile(
      repository.path,
      'packages/alpha-pkg/src/index.ts',
      'export const value = 2;\n',
    );
    commitAll(repository.path, 'change placeholder package without changeset');

    const result = runCheckChangeset(repository.path, repository.baseSha);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('passes when a nested workspace package (e.g. packages/mcp/...) is covered', () => {
    const repository = createRepository({
      packages: [{ directory: 'mcp/mcp', name: '@transcend-io/mcp' }],
    });

    writeRepositoryFile(
      repository.path,
      'packages/mcp/mcp/src/index.ts',
      'export const value = 2;\n',
    );
    writeRepositoryFile(
      repository.path,
      '.changeset/mcp.md',
      `---
"@transcend-io/mcp": patch
---

Update the MCP server package.
`,
    );
    commitAll(repository.path, 'change mcp server');

    const result = runCheckChangeset(repository.path, repository.baseSha);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('passes when every changed publishable package is covered', () => {
    const repository = createRepository({
      packages: [
        { directory: 'cli', name: '@transcend-io/cli' },
        { directory: 'privacy-types', name: '@transcend-io/privacy-types' },
      ],
    });

    writeRepositoryFile(repository.path, 'packages/cli/src/index.ts', 'export const value = 2;\n');
    writeRepositoryFile(
      repository.path,
      '.changeset/cli.md',
      `---
"@transcend-io/cli": patch
---

Update the CLI package.
`,
    );
    commitAll(repository.path, 'change cli');

    const result = runCheckChangeset(repository.path, repository.baseSha);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('fails when a changed publishable package is missing from changeset frontmatter', () => {
    const repository = createRepository({
      packages: [
        { directory: 'cli', name: '@transcend-io/cli' },
        { directory: 'privacy-types', name: '@transcend-io/privacy-types' },
      ],
    });

    writeRepositoryFile(repository.path, 'packages/cli/src/index.ts', 'export const value = 2;\n');
    writeRepositoryFile(
      repository.path,
      '.changeset/privacy-types.md',
      `---
"@transcend-io/privacy-types": patch
---

Update privacy types.
`,
    );
    commitAll(repository.path, 'change cli without coverage');

    const result = runCheckChangeset(repository.path, repository.baseSha);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('they do not mention every changed publishable package');
    expect(result.stderr).toContain('@transcend-io/cli');
    expect(result.stderr).toContain('@transcend-io/privacy-types');
  });

  it('ignores private packages', () => {
    const repository = createRepository({
      packages: [{ directory: 'core', name: '@transcend-io/core', private: true }],
    });

    writeRepositoryFile(repository.path, 'packages/core/src/index.ts', 'export const value = 2;\n');
    commitAll(repository.path, 'change private package');

    const result = runCheckChangeset(repository.path, repository.baseSha);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('ignores package.json metadata-only changes', () => {
    const repository = createRepository({
      packages: [{ directory: 'cli', name: '@transcend-io/cli' }],
    });

    updatePackageJson(repository.path, 'packages/cli/package.json', (packageJson) => ({
      ...packageJson,
      description: 'Updated CLI description.',
      homepage: 'https://example.com/cli',
    }));
    commitAll(repository.path, 'update package metadata');

    const result = runCheckChangeset(repository.path, repository.baseSha);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('fails when package.json dependencies change without a changeset', () => {
    const repository = createRepository({
      packages: [{ directory: 'cli', name: '@transcend-io/cli' }],
    });

    updatePackageJson(repository.path, 'packages/cli/package.json', (packageJson) => ({
      ...packageJson,
      dependencies: {
        lodash: '^4.17.21',
      },
    }));
    commitAll(repository.path, 'update package dependencies');

    const result = runCheckChangeset(repository.path, repository.baseSha);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('No changeset was found');
    expect(result.stderr).toContain('@transcend-io/cli');
  });

  it.each([
    ['build', 'tsdown --watch'],
    ['start', './dist/bin/alt-cli.mjs'],
  ])(
    'fails when package.json scripts.%s changes without a changeset',
    (scriptName, scriptCommand) => {
      const repository = createRepository({
        packages: [{ directory: 'cli', name: '@transcend-io/cli' }],
      });

      updatePackageJson(repository.path, 'packages/cli/package.json', (packageJson) => ({
        ...packageJson,
        scripts: {
          [scriptName]: scriptCommand,
        },
      }));
      commitAll(repository.path, `update package script ${scriptName}`);

      const result = runCheckChangeset(repository.path, repository.baseSha);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('No changeset was found');
      expect(result.stderr).toContain('@transcend-io/cli');
    },
  );

  it('ignores package.json scripts.test changes', () => {
    const repository = createRepository({
      packages: [{ directory: 'cli', name: '@transcend-io/cli' }],
    });

    updatePackageJson(repository.path, 'packages/cli/package.json', (packageJson) => ({
      ...packageJson,
      scripts: {
        test: 'vitest --watch=false',
      },
    }));
    commitAll(repository.path, 'update package test script');

    const result = runCheckChangeset(repository.path, repository.baseSha);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });
});

function createRepository({ packages }: RepositoryDefinition): Repository {
  const repositoryPath = mkdtempSync(join(tmpdir(), 'check-changeset-'));
  temporaryRepositories.push(repositoryPath);

  runGit(repositoryPath, ['init', '--initial-branch=main']);
  writeRepositoryFile(
    repositoryPath,
    '.changeset/config.json',
    `${JSON.stringify({ ignore: [] }, null, 2)}\n`,
  );

  for (const packageDefinition of packages) {
    writeRepositoryFile(
      repositoryPath,
      `packages/${packageDefinition.directory}/package.json`,
      `${JSON.stringify(
        {
          name: packageDefinition.name,
          private: packageDefinition.private === true || undefined,
          version: packageDefinition.version ?? '1.0.0',
        },
        null,
        2,
      )}\n`,
    );
    writeRepositoryFile(
      repositoryPath,
      `packages/${packageDefinition.directory}/src/index.ts`,
      'export const value = 1;\n',
    );
  }

  commitAll(repositoryPath, 'base');

  return {
    baseSha: runGit(repositoryPath, ['rev-parse', 'HEAD']),
    path: repositoryPath,
  };
}

function writeRepositoryFile(repositoryPath: string, filePath: string, contents: string) {
  const absoluteFilePath = join(repositoryPath, filePath);
  const directoryPath = dirname(absoluteFilePath);

  mkdirSync(directoryPath, { recursive: true });
  writeFileSync(absoluteFilePath, contents);
}

function updatePackageJson(
  repositoryPath: string,
  filePath: string,
  update: (packageJson: PackageJson) => PackageJson,
) {
  const absoluteFilePath = join(repositoryPath, filePath);
  const packageJson = JSON.parse(readFileSync(absoluteFilePath, 'utf8')) as PackageJson;

  writeFileSync(absoluteFilePath, `${JSON.stringify(update(packageJson), null, 2)}\n`);
}

function commitAll(repositoryPath: string, message: string) {
  runGit(repositoryPath, ['add', '.']);
  runGit(repositoryPath, [
    '-c',
    'user.name=Test User',
    '-c',
    'user.email=test@example.com',
    'commit',
    '-m',
    message,
  ]);
}

function runGit(repositoryPath: string, args: string[]) {
  return execFileSync('git', args, {
    cwd: repositoryPath,
    encoding: 'utf8',
  }).trim();
}

function runCheckChangeset(repositoryPath: string, baseSha: string) {
  return spawnSync(process.execPath, [checkChangesetScriptPath], {
    cwd: repositoryPath,
    encoding: 'utf8',
    env: {
      ...process.env,
      CHANGESET_BASE_SHA: baseSha,
    },
  });
}
