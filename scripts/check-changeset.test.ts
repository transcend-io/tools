import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
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
};

type RepositoryDefinition = {
  packages: PackageDefinition[];
};

type Repository = {
  baseSha: string;
  path: string;
};

afterEach(() => {
  while (temporaryRepositories.length > 0) {
    const repositoryPath = temporaryRepositories.pop();

    if (repositoryPath) {
      rmSync(repositoryPath, { force: true, recursive: true });
    }
  }
});

describe('check-changeset', () => {
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
          version: '1.0.0',
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
