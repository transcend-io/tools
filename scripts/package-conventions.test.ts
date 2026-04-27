import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { fileExists, readJsonFile, readRepoFile, repoRoot } from './lib/repo-files.ts';

type DependencyMap = Record<string, string>;

type PackageManifest = {
  author?: string;
  dependencies?: DependencyMap;
  devDependencies?: DependencyMap;
  engines?: {
    node?: string;
  };
  exports?: {
    '.': {
      '@transcend-io/source'?: string;
      default?: string;
      types?: string;
    };
  };
  files?: string[];
  homepage?: string;
  license?: string;
  name?: string;
  peerDependencies?: DependencyMap;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
  private?: boolean;
  publishConfig?: {
    access?: string;
  };
  repository?: {
    directory?: string;
    type?: string;
    url?: string;
  };
  scripts?: Record<string, string>;
  sideEffects?: boolean;
  type?: string;
  types?: string;
  version?: string;
};

type DependencyManifestSubset = {
  peerDependencies?: DependencyMap;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
};

type CompilerOptions = Record<string, unknown> & {
  outDir?: string;
  rootDir?: string;
  types?: string[];
};

type PackageTsconfig = {
  compilerOptions?: CompilerOptions;
  extends?: string;
  include?: string[];
};

type BaseTsconfig = {
  compilerOptions?: Record<string, unknown>;
};

type RootTsconfig = {
  references?: Array<{
    path?: string;
  }>;
};

type WorkspacePackage = {
  /** Relative directory path from repo root (e.g. "packages/cli" or "packages/mcp/mcp-server-dsr") */
  directory: string;
  /** Package basename used for name inference (last segment of directory path) */
  basename: string;
  /** Number of path segments — determines relative path depth to repo root */
  depth: number;
  manifest: PackageManifest;
  tsconfig: PackageTsconfig;
  tsdownConfig: string;
};

const requiredPackageScripts = {
  build: 'tsdown',
  test: 'vitest run',
  typecheck: 'tsc -p tsconfig.json --noEmit',
  'check:exports': 'attw --pack . --ignore-rules cjs-resolves-to-esm',
} as const;

const requiredPublishablePackageScripts = {
  'check:publint': 'publint --level warning --strict --pack pnpm',
} as const;

const requiredDevDependencies = {
  '@arethetypeswrong/cli': 'catalog:',
  '@types/node': 'catalog:',
  tsdown: 'catalog:',
  typescript: 'catalog:',
  vitest: 'catalog:',
} as const;

const requiredPublishableDevDependencies = {
  publint: 'catalog:',
} as const;

const workspacePackages = getWorkspacePackages();
const publishablePackages = workspacePackages.filter(({ manifest }) => manifest.private !== true);
const releasedPackages = publishablePackages.filter(
  ({ manifest }) => typeof manifest.version === 'string' && manifest.version !== '0.0.0',
);
const baseCompilerOptions = readJsonFile<BaseTsconfig>('tsconfig.base.json').compilerOptions ?? {};
const sharedCompilerOptionKeys = sortStrings(Object.keys(baseCompilerOptions));
const workspaceSharedCompilerOptionCases = workspacePackages.flatMap((workspacePackage) =>
  sharedCompilerOptionKeys.map((compilerOptionKey) => ({
    ...workspacePackage,
    compilerOptionKey,
  })),
);

describe('package conventions', () => {
  test('root tsconfig references every workspace package', () => {
    const rootTsconfig = readJsonFile<RootTsconfig>('tsconfig.json');
    const actualReferences = sortStrings(
      (rootTsconfig.references ?? [])
        .flatMap((reference) => (typeof reference.path === 'string' ? [reference.path] : []))
        .filter((path) => path.startsWith('./packages/')),
    );
    const expectedReferences = sortStrings(
      workspacePackages.map(({ directory }) => `./${directory}`),
    );

    expect(actualReferences).toEqual(expectedReferences);
  });

  test.each(workspacePackages)(
    '$directory includes the required package files',
    ({ directory }) => {
      expect(fileExists(`${directory}/package.json`)).toBe(true);
      expect(fileExists(`${directory}/tsconfig.json`)).toBe(true);
      expect(fileExists(`${directory}/tsdown.config.ts`)).toBe(true);
      expect(fileExists(`${directory}/src/index.ts`)).toBe(true);
    },
  );

  test.each(workspacePackages)(
    '$directory uses the shared manifest baseline',
    ({ basename, manifest }) => {
      const expectedName = `@transcend-io/${basename}`;
      const exportDot = manifest.exports?.['.'];

      expect(manifest.name).toBe(expectedName);
      expect(manifest.license).toBe('Apache-2.0');
      expect(manifest.type).toBe('module');
      expect(manifest.sideEffects).toBe(false);
      expect(manifest.types).toBe('./dist/index.d.mts');
      expect(manifest.files).toEqual(['dist']);
      expect(manifest.engines?.node).toBe('>=22.12.0');
      expect(exportDot?.['@transcend-io/source']).toBe('./src/index.ts');
      expect(exportDot?.types).toBe('./dist/index.d.mts');
      expect(exportDot?.default).toBe('./dist/index.mjs');
      expect(manifest.scripts?.build).toBe(requiredPackageScripts.build);
      expect(manifest.scripts?.test).toBe(requiredPackageScripts.test);
      expect(manifest.scripts?.typecheck).toBe(requiredPackageScripts.typecheck);
      expect(manifest.scripts?.['check:exports']).toBe(requiredPackageScripts['check:exports']);
      expect(manifest.devDependencies?.['@arethetypeswrong/cli']).toBe(
        requiredDevDependencies['@arethetypeswrong/cli'],
      );
      expect(manifest.devDependencies?.['@types/node']).toBe(
        requiredDevDependencies['@types/node'],
      );
      expect(manifest.devDependencies?.tsdown).toBe(requiredDevDependencies.tsdown);
      expect(manifest.devDependencies?.typescript).toBe(requiredDevDependencies.typescript);
      expect(manifest.devDependencies?.vitest).toBe(requiredDevDependencies.vitest);
    },
  );

  test.each(publishablePackages)(
    '$directory includes publishable package metadata',
    ({ directory, manifest }) => {
      expect(manifest.publishConfig?.access).toBe('public');
      expect(manifest.homepage).toBe(
        `https://github.com/transcend-io/tools/tree/main/${directory}`,
      );
      expect(manifest.author).toBe('Transcend Inc.');
      expect(manifest.repository?.type).toBe('git');
      expect(manifest.repository?.url).toBe('https://github.com/transcend-io/tools.git');
      expect(manifest.repository?.directory).toBe(directory);
      expect(manifest.scripts?.['check:publint']).toBe(
        requiredPublishablePackageScripts['check:publint'],
      );
      expect(manifest.devDependencies?.publint).toBe(requiredPublishableDevDependencies.publint);
    },
  );

  test.each(releasedPackages)('$directory keeps a changelog', ({ directory }) => {
    expect(fileExists(`${directory}/CHANGELOG.md`)).toBe(true);
  });

  test.each(workspacePackages)(
    '$directory uses the shared tsconfig baseline',
    ({ depth, tsconfig }) => {
      const relativeRoot = '../'.repeat(depth);
      expect(tsconfig.extends).toBe(`${relativeRoot}tsconfig.base.json`);
      expect(tsconfig.compilerOptions?.outDir).toBe('dist');
      expect(tsconfig.compilerOptions?.rootDir).toBe('src');
      expect(tsconfig.compilerOptions?.types ?? []).toEqual(
        expect.arrayContaining(['node', 'vitest/globals']),
      );
      expect(tsconfig.include ?? []).toEqual(expect.arrayContaining(['src/**/*.ts']));
    },
  );

  // TODO: https://linear.app/transcend/issue/LAK-1837/transcend-iotools-burn-down-tsconfig-overrides-across-monorepo
  test.skip.each(workspaceSharedCompilerOptionCases)(
    '$directory relies on tsconfig.base.json for shared compilerOption $compilerOptionKey',
    ({ compilerOptionKey, tsconfig }) => {
      const packageCompilerOptions = tsconfig.compilerOptions ?? {};
      expect(packageCompilerOptions).not.toHaveProperty(compilerOptionKey);
    },
  );

  test.each(workspacePackages)(
    '$directory uses the shared tsdown baseline',
    ({ depth, tsdownConfig }) => {
      const relativeRoot = '../'.repeat(depth);
      expect(tsdownConfig).toContain(
        `import sharedConfig from '${relativeRoot}tsdown.config.base.ts';`,
      );
      expect(tsdownConfig).toContain('...sharedConfig');
      expect(tsdownConfig).toContain("'src/index.ts'");
    },
  );

  // Strict resolvers (yarn-berry PnP, pnpm with strict peers) walk the require
  // chain looking for a peer dependency on an ancestor package. If a published
  // package depends on `io-ts` but does not itself declare `fp-ts`, every
  // consumer crashes at first runtime use of `io-ts` even though `pnpm install`
  // succeeds. We catch the entire bug class at PR time by requiring each
  // publishable package to declare every non-optional peer of its direct deps.
  test.each(publishablePackages)(
    '$directory satisfies peer dependencies of its direct dependencies',
    (workspacePackage) => {
      const gaps = getUnsatisfiedPeerDependencies(workspacePackage);

      if (gaps.length === 0) {
        return;
      }

      const lines = gaps.map(
        ({ dep, peer }) =>
          `  - "${peer}" is required by "${dep}" (peerDependency). Add "${peer}" to ${workspacePackage.manifest.name}'s "dependencies" or "peerDependencies" so strict resolvers (yarn-berry PnP, pnpm strict peers) can satisfy it.`,
      );

      throw new Error(
        `${workspacePackage.manifest.name} is missing peer dependencies brought in by direct dependencies:\n${lines.join('\n')}`,
      );
    },
  );
});

function getWorkspacePackages(): WorkspacePackage[] {
  const packagesRoot = join(repoRoot, 'packages');

  const topLevel = readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `packages/${entry.name}`)
    .filter((directory) => fileExists(`${directory}/package.json`));

  const mcpRoot = join(packagesRoot, 'mcp');
  const nested = readdirSync(mcpRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `packages/mcp/${entry.name}`)
    .filter((directory) => fileExists(`${directory}/package.json`));

  return [...topLevel, ...nested]
    .sort((a, b) => a.localeCompare(b))
    .map((directory) => {
      const segments = directory.split('/');
      const basename = segments.at(-1)!;
      return {
        directory,
        basename,
        depth: segments.length,
        manifest: readJsonFile<PackageManifest>(`${directory}/package.json`),
        tsconfig: readJsonFile<PackageTsconfig>(`${directory}/tsconfig.json`),
        tsdownConfig: readRepoFile(`${directory}/tsdown.config.ts`),
      };
    });
}

function sortStrings(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function getUnsatisfiedPeerDependencies(
  workspacePackage: WorkspacePackage,
): Array<{ dep: string; peer: string }> {
  const { directory, manifest } = workspacePackage;
  const directDeps = manifest.dependencies ?? {};
  const declaredKeys = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ]);
  const requireFromPackage = createRequire(join(repoRoot, directory, 'package.json'));
  const gaps: Array<{ dep: string; peer: string }> = [];

  for (const [depName, depSpecifier] of Object.entries(directDeps)) {
    if (depSpecifier.startsWith('workspace:')) {
      continue;
    }

    let depManifest: DependencyManifestSubset;
    try {
      depManifest = requireFromPackage(`${depName}/package.json`) as DependencyManifestSubset;
    } catch {
      continue;
    }

    const peers = depManifest.peerDependencies ?? {};
    const peerMeta = depManifest.peerDependenciesMeta ?? {};

    for (const peerName of Object.keys(peers)) {
      if (peerMeta[peerName]?.optional === true) {
        continue;
      }
      if (peerName === manifest.name) {
        continue;
      }
      if (!declaredKeys.has(peerName)) {
        gaps.push({ dep: depName, peer: peerName });
      }
    }
  }

  return gaps.sort((a, b) => a.peer.localeCompare(b.peer) || a.dep.localeCompare(b.dep));
}
