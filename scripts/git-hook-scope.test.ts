import { describe, expect, test } from 'vitest';

import {
  analyzeFiles,
  buildDependentsIndex,
  expandWithDependents,
  isGlobalInfraPath,
  isPackageQualityFile,
  packageForFile,
} from './lib/git-hook-scope.ts';

const packages = [
  { name: '@transcend-io/cli', directory: 'packages/cli' },
  { name: '@transcend-io/sdk', directory: 'packages/sdk' },
  {
    name: '@transcend-io/mcp-server-docs',
    directory: 'packages/mcp/mcp-server-docs',
  },
  { name: '@transcend-io/privacy-types', directory: 'packages/privacy-types' },
];

describe('git-hook-scope', () => {
  test('maps files to the longest matching package directory', () => {
    expect(packageForFile('packages/mcp/mcp-server-docs/src/index.ts', packages)?.name).toBe(
      '@transcend-io/mcp-server-docs',
    );
    expect(packageForFile('packages/cli/package.json', packages)?.name).toBe('@transcend-io/cli');
    expect(packageForFile('README.md', packages)).toBeNull();
  });

  test('detects global infra paths that should force full checks', () => {
    expect(isGlobalInfraPath('turbo.json')).toBe(false);
    expect(isGlobalInfraPath('pnpm-lock.yaml')).toBe(true);
    expect(isGlobalInfraPath('types/ambient.d.ts')).toBe(true);
    expect(isGlobalInfraPath('packages/cli/src/index.ts')).toBe(false);
  });

  test('analyzeFiles classifies package, root script, and infra edits', () => {
    expect(
      analyzeFiles(
        ['packages/cli/src/index.ts', 'scripts/logger.ts', '.changeset/foo.md'],
        packages,
      ),
    ).toEqual({
      packageNames: ['@transcend-io/cli'],
      globalInfra: false,
      rootScripts: true,
      manifestChanges: false,
    });

    expect(analyzeFiles(['turbo.json'], packages)).toEqual({
      packageNames: [],
      globalInfra: false,
      rootScripts: false,
      manifestChanges: false,
    });

    expect(analyzeFiles(['pnpm-lock.yaml'], packages)).toEqual({
      packageNames: [],
      globalInfra: true,
      rootScripts: false,
      manifestChanges: false,
    });

    expect(analyzeFiles(['packages/cli/README.md'], packages)).toEqual({
      packageNames: [],
      globalInfra: false,
      rootScripts: false,
      manifestChanges: false,
    });

    expect(analyzeFiles(['package.json'], packages)).toEqual({
      packageNames: [],
      globalInfra: false,
      rootScripts: false,
      manifestChanges: true,
    });

    expect(analyzeFiles(['packages/cli/package.json'], packages)).toEqual({
      packageNames: ['@transcend-io/cli'],
      globalInfra: false,
      rootScripts: false,
      manifestChanges: true,
    });
  });

  test('doc-only package files do not require typecheck/exports', () => {
    expect(isPackageQualityFile('packages/cli/README.md')).toBe(false);
    expect(isPackageQualityFile('packages/cli/CHANGELOG.md')).toBe(false);
    expect(isPackageQualityFile('packages/cli/src/index.ts')).toBe(true);
    expect(isPackageQualityFile('packages/cli/package.json')).toBe(true);
  });

  test('expandWithDependents uses package.json edges, not the Turbo root graph', () => {
    const dependentsOf = buildDependentsIndex([
      {
        name: '@transcend-io/privacy-types',
        directory: 'packages/privacy-types',
        workspaceDepNames: [],
      },
      {
        name: '@transcend-io/sdk',
        directory: 'packages/sdk',
        workspaceDepNames: ['@transcend-io/privacy-types'],
      },
      {
        name: '@transcend-io/cli',
        directory: 'packages/cli',
        workspaceDepNames: ['@transcend-io/sdk', '@transcend-io/privacy-types'],
      },
      {
        name: '@transcend-io/design-tokens',
        directory: 'packages/design-tokens',
        workspaceDepNames: [],
      },
    ]);

    expect(expandWithDependents(['@transcend-io/privacy-types'], dependentsOf)).toEqual([
      '@transcend-io/cli',
      '@transcend-io/privacy-types',
      '@transcend-io/sdk',
    ]);
  });
});
