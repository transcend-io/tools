import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const checkPackagesScriptPath = fileURLToPath(new URL('./check-packages.ts', import.meta.url));
const temporaryRepositories: string[] = [];

afterEach(() => {
  while (temporaryRepositories.length > 0) {
    const repositoryPath = temporaryRepositories.pop();

    if (repositoryPath) {
      rmSync(repositoryPath, { force: true, recursive: true });
    }
  }
});

describe('check-packages', () => {
  it('passes for a repository that matches the package conventions', () => {
    const repositoryPath = createValidRepository();

    const result = runCheckPackages(repositoryPath);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('fails when required files and root tsconfig references are missing', () => {
    const repositoryPath = createValidRepository();

    writeRepositoryFile(
      repositoryPath,
      'tsconfig.json',
      JSON.stringify(
        {
          files: [],
          references: [{ path: './packages/core' }, { path: './packages/privacy-types' }],
        },
        null,
        2,
      ),
    );
    unlinkSync(join(repositoryPath, 'packages/core/src/index.ts'));

    const result = runCheckPackages(repositoryPath);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'tsconfig.json: missing root tsconfig reference ./packages/cli',
    );
    expect(result.stderr).toContain('packages/core: missing required file src/index.ts');
  });

  it('fails when publishable metadata and CLI-specific docs are missing', () => {
    const repositoryPath = createValidRepository();

    writePackageJson(repositoryPath, 'privacy-types', {
      author: undefined,
      homepage: undefined,
      publint: false,
      repository: undefined,
      version: '5.0.0',
    });
    unlinkSync(join(repositoryPath, 'packages/privacy-types/CHANGELOG.md'));
    unlinkSync(join(repositoryPath, 'packages/cli/DEVELOPERS.md'));
    writeRepositoryFile(
      repositoryPath,
      'packages/cli/vitest.config.ts',
      "export { somethingElse } from '../../vitest.config.ts';\n",
    );

    const result = runCheckPackages(repositoryPath);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('packages/privacy-types: author should be "Transcend Inc."');
    expect(result.stderr).toContain('packages/privacy-types: missing required file CHANGELOG.md');
    expect(result.stderr).toContain(
      'packages/privacy-types: scripts.check:publint should be "publint --level warning --strict --pack pnpm"',
    );
    expect(result.stderr).toContain(
      'packages/privacy-types: devDependencies.publint should be "catalog:"',
    );
    expect(result.stderr).toContain('packages/cli: missing required file DEVELOPERS.md');
    expect(result.stderr).toContain(
      'packages/cli: vitest.config.ts should re-export the root Vitest config',
    );
  });
});

function createValidRepository(): string {
  const repositoryPath = mkdtempSync(join(tmpdir(), 'check-packages-'));
  temporaryRepositories.push(repositoryPath);

  writeRepositoryFile(
    repositoryPath,
    'tsconfig.json',
    JSON.stringify(
      {
        files: [],
        references: [
          { path: './packages/core' },
          { path: './packages/privacy-types' },
          { path: './packages/cli' },
        ],
      },
      null,
      2,
    ),
  );

  createLibraryPackage(repositoryPath, {
    directory: 'core',
    private: true,
    version: '0.0.0',
  });
  createLibraryPackage(repositoryPath, {
    author: 'Transcend Inc.',
    changelog: true,
    directory: 'privacy-types',
    homepage: 'https://github.com/transcend-io/tools/tree/main/packages/privacy-types',
    repository: {
      directory: 'packages/privacy-types',
      type: 'git',
      url: 'https://github.com/transcend-io/tools.git',
    },
    version: '5.0.0',
  });
  createCliPackage(repositoryPath);

  return repositoryPath;
}

function createLibraryPackage(
  repositoryPath: string,
  options: {
    author?: string;
    changelog?: boolean;
    directory: string;
    homepage?: string;
    private?: boolean;
    repository?: Record<string, string>;
    version: string;
  },
): void {
  writePackageJson(repositoryPath, options.directory, {
    author: options.author,
    homepage: options.homepage,
    private: options.private,
    repository: options.repository,
    version: options.version,
  });
  writeRepositoryFile(repositoryPath, `packages/${options.directory}/src/index.ts`, 'export {};\n');
  writeRepositoryFile(
    repositoryPath,
    `packages/${options.directory}/tsconfig.json`,
    libraryTsconfig,
  );
  writeRepositoryFile(
    repositoryPath,
    `packages/${options.directory}/tsdown.config.ts`,
    libraryTsdownConfig,
  );

  if (options.changelog) {
    writeRepositoryFile(
      repositoryPath,
      `packages/${options.directory}/CHANGELOG.md`,
      '# Changelog\n',
    );
  }
}

function createCliPackage(repositoryPath: string): void {
  writePackageJson(repositoryPath, 'cli', {
    author: 'Transcend Inc.',
    bin: {
      transcend: 'dist/bin/cli.mjs',
    },
    homepage: 'https://github.com/transcend-io/tools/tree/main/packages/cli',
    main: './dist/index.mjs',
    repository: {
      directory: 'packages/cli',
      type: 'git',
      url: 'https://github.com/transcend-io/tools.git',
    },
    version: '10.0.1',
  });
  writeRepositoryFile(repositoryPath, 'packages/cli/src/index.ts', 'export {};\n');
  writeRepositoryFile(repositoryPath, 'packages/cli/CHANGELOG.md', '# Changelog\n');
  writeRepositoryFile(repositoryPath, 'packages/cli/DEVELOPERS.md', '# Developers\n');
  writeRepositoryFile(
    repositoryPath,
    'packages/cli/vitest.config.ts',
    "export { default } from '../../vitest.config.ts';\n",
  );
  writeRepositoryFile(repositoryPath, 'packages/cli/tsconfig.json', cliTsconfig);
  writeRepositoryFile(repositoryPath, 'packages/cli/tsdown.config.ts', cliTsdownConfig);
}

function writePackageJson(
  repositoryPath: string,
  directory: string,
  overrides: {
    author?: string | undefined;
    bin?: Record<string, string>;
    homepage?: string | undefined;
    main?: string;
    private?: boolean;
    publint?: boolean;
    repository?: Record<string, string> | undefined;
    version?: string;
  },
): void {
  const packageJson = {
    name: `@transcend-io/${directory}`,
    version: overrides.version ?? '0.0.0',
    ...(overrides.private === true ? { private: true } : {}),
    description: `${directory} package`,
    ...(typeof overrides.homepage === 'string' ? { homepage: overrides.homepage } : {}),
    license: 'Apache-2.0',
    ...(typeof overrides.author === 'string' ? { author: overrides.author } : {}),
    ...(overrides.repository ? { repository: overrides.repository } : {}),
    ...(overrides.bin ? { bin: overrides.bin } : {}),
    files: ['dist'],
    type: 'module',
    sideEffects: false,
    ...(typeof overrides.main === 'string' ? { main: overrides.main } : {}),
    types: './dist/index.d.mts',
    exports: {
      '.': {
        '@transcend-io/source': './src/index.ts',
        types: './dist/index.d.mts',
        default: './dist/index.mjs',
      },
    },
    publishConfig: {
      access: 'public',
    },
    scripts: {
      build: 'tsdown',
      test: 'vitest run',
      typecheck: 'tsc -p tsconfig.json --noEmit',
      'check:exports': 'attw --pack . --ignore-rules cjs-resolves-to-esm',
      ...(overrides.private === true || overrides.publint === false
        ? {}
        : { 'check:publint': 'publint --level warning --strict --pack pnpm' }),
    },
    devDependencies: {
      '@arethetypeswrong/cli': 'catalog:',
      '@types/node': 'catalog:',
      ...(overrides.private === true || overrides.publint === false ? {} : { publint: 'catalog:' }),
      tsdown: 'catalog:',
      typescript: 'catalog:',
      vitest: 'catalog:',
    },
    engines: {
      node: '>=22.0.0',
    },
  };

  writeRepositoryFile(
    repositoryPath,
    `packages/${directory}/package.json`,
    `${JSON.stringify(packageJson, null, 2)}\n`,
  );
}

function writeRepositoryFile(repositoryPath: string, filePath: string, contents: string): void {
  const absoluteFilePath = join(repositoryPath, filePath);
  const directoryPath = dirname(absoluteFilePath);

  mkdirSync(directoryPath, { recursive: true });
  writeFileSync(absoluteFilePath, contents.endsWith('\n') ? contents : `${contents}\n`);
}

function runCheckPackages(repositoryPath: string) {
  return spawnSync(process.execPath, [checkPackagesScriptPath], {
    cwd: repositoryPath,
    encoding: 'utf8',
  });
}

const libraryTsconfig = `{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*.ts"]
}
`;

const cliTsconfig = `{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node", "vitest/globals"],
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "isolatedDeclarations": false,
    "noUncheckedIndexedAccess": false,
    "useUnknownInCatchVariables": false,
    "verbatimModuleSyntax": false
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts"]
}
`;

const libraryTsdownConfig = `import { defineConfig } from 'tsdown';

import sharedConfig from '../../tsdown.config.base.ts';

export default defineConfig({
  ...sharedConfig,
  entry: ['src/index.ts'],
});
`;

const cliTsdownConfig = `import { defineConfig } from 'tsdown';

import sharedConfig from '../../tsdown.config.base.ts';

export default defineConfig({
  ...sharedConfig,
  entry: [
    'src/bin/cli.ts',
    'src/bin/bash-complete.ts',
    'src/bin/deprecated-command.ts',
    'src/index.ts',
  ],
  minify: true,
  splitting: true,
  tsconfig: 'tsconfig.json',
});
`;
