import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import { describe, expect, test } from 'vitest';

import { discoverMcpAppViews } from '../vite.config.base.ts';
import { discoverMcpPackages } from './lib/mcp-app-dev.ts';
import { readRepoFile, repoRoot } from './lib/repo-files.ts';

/**
 * Every view across every MCP package.
 *
 * Discovery itself is the first assertion: it throws on a directory that does not
 * hold exactly one `*View.tsx`, so a malformed view fails here at module load
 * rather than mid-build with a message about a module that does not exist.
 */
const views = discoverMcpPackages().flatMap((pkg) =>
  pkg.views.map((view) => ({ ...view, packageName: pkg.name })),
);

/** Builds a package directory holding one view directory with the given files. */
function fakePackageWithViewFiles(files: string[]): string {
  const root = mkdtempSync(join(tmpdir(), 'mcp-view-convention-'));
  const viewDir = join(root, 'src', 'ui', 'broken');
  mkdirSync(viewDir, { recursive: true });
  for (const file of files) writeFileSync(join(viewDir, file), '');
  return root;
}

describe('MCP app view convention', () => {
  test('there are views to check', () => {
    // Without this, every case below passes vacuously the moment discovery
    // changes shape and finds nothing.
    expect(views.map((view) => `${view.packageName}/${view.name}`)).toContain(
      '@transcend-io/mcp-server-examples/hello',
    );
  });

  test.for(views)('$packageName/$name exports the component its filename promises', (view) => {
    const source = readRepoFile(relative(repoRoot, view.componentPath));

    // The synthesized entry imports this exact name, so a mismatch is what turns
    // a rename into a build failure about a file nobody wrote.
    expect(
      new RegExp(String.raw`^export (?:function|const|class) ${view.componentName}\b`, 'm').test(
        source,
      ),
      `${relative(repoRoot, view.componentPath)} must export "${view.componentName}" to match its filename`,
    ).toBe(true);
  });

  test.for(views)('$packageName/$name has no hand-written entry or stylesheet', (view) => {
    // Both are synthesized during the build. A leftover copy on disk is dead
    // code that looks authoritative.
    const stale = ['main.tsx', 'mcp-app-entry.tsx', 'mcp-app-theme.css'].filter((file) =>
      existsSync(join(view.directory, file)),
    );
    expect(stale).toEqual([]);
  });

  test('a view directory holding files but not exactly one *View.tsx is rejected', () => {
    for (const [files, expected] of [
      [['helpers.ts'], '0 files matching *View.tsx'],
      [['HelloView.tsx', 'DetailView.tsx'], '2 files matching *View.tsx'],
    ] as const) {
      const root = fakePackageWithViewFiles([...files]);
      try {
        expect(() => discoverMcpAppViews(root)).toThrow(expected);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  test('an empty view directory is what a deleted view leaves behind, so it is skipped', () => {
    // Not merely tolerated for its own sake: the generator discovers views before
    // writing anything, so erroring here is what made re-scaffolding a deleted
    // view fail on a directory git could not have removed.
    const root = fakePackageWithViewFiles([]);
    try {
      expect(discoverMcpAppViews(root)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('an underscore-prefixed directory is shared code rather than a broken view', () => {
    const root = mkdtempSync(join(tmpdir(), 'mcp-view-convention-'));
    try {
      mkdirSync(join(root, 'src', 'ui', '_shared'), { recursive: true });
      mkdirSync(join(root, 'src', 'ui', 'ok'), { recursive: true });
      writeFileSync(join(root, 'src', 'ui', '_shared', 'Button.tsx'), '');
      writeFileSync(join(root, 'src', 'ui', 'ok', 'OkView.tsx'), '');

      const [view] = discoverMcpAppViews(root);
      expect(view?.name).toBe('ok');

      // Every view has to carry the shared directories, because Tailwind
      // generates utilities per document by scanning files. A shared component
      // left unscanned still bundles and still renders — just unstyled, which is
      // the kind of break that looks like a CSS bug rather than a missing source.
      expect(view?.sharedDirectories).toEqual([join(root, 'src', 'ui', '_shared')]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
