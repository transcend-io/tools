import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import type { McpPackage } from './lib/mcp-app-dev.ts';
import { scaffoldApp } from './lib/mcp-new/app.ts';
import { scaffoldElicitation } from './lib/mcp-new/elicitation.ts';
import {
  ARTIFACT_KINDS,
  deriveNames,
  isArtifactKind,
  validateArtifactName,
} from './lib/mcp-new/shared.ts';
import { scaffoldTool } from './lib/mcp-new/tool.ts';

/** Temp directories to clean up, whichever way a test ends. */
const fixtures: string[] = [];

afterEach(() => {
  for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/**
 * A package on disk, minimal but real.
 *
 * The generators only read `dir`, `name`, `dirName`, and `views`, so a fixture is
 * a manifest and a directory. Building one rather than pointing at a workspace
 * package is what lets these tests assert on the manifest without editing a
 * package someone ships.
 */
function fakePackage(scripts: Record<string, string> = {}): McpPackage {
  const dir = mkdtempSync(join(tmpdir(), 'mcp-new-'));
  fixtures.push(dir);
  writeFileSync(
    join(dir, 'package.json'),
    `${JSON.stringify({ name: '@transcend-io/mcp-server-docs', scripts }, null, 2)}\n`,
  );
  mkdirSync(join(dir, 'src', 'tools'), { recursive: true });

  return {
    name: '@transcend-io/mcp-server-docs',
    dirName: 'mcp-server-docs',
    dir,
    cliPath: join(dir, 'dist', 'cli.mjs'),
    hasCli: true,
    devOnly: false,
    views: [],
  };
}

/** Manifest as it is on disk now. */
function readManifest(pkg: McpPackage): {
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
} {
  return JSON.parse(readFileSync(join(pkg.dir, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
}

describe('artifact names', () => {
  test('derives every spelling from one kebab-case name', () => {
    const pkg = fakePackage();

    // All six travel together because a mismatch between any two of them is what
    // turns a generated file into one that does not compile.
    expect(deriveNames(pkg, 'usage-chart')).toMatchObject({
      kebabCase: 'usage-chart',
      snakeCase: 'usage_chart',
      pascalCase: 'UsageChart',
      camelCase: 'usageChart',
      constantCase: 'USAGE_CHART',
      shortName: 'docs',
      toolName: 'docs_usage_chart',
    });
  });

  test.for(['UsageChart', 'usage_chart', 'usage chart', '1chart', 'Chart-A'])(
    'rejects "%s", which cannot be a directory and a component and a tool name at once',
    (name) => {
      expect(() => validateArtifactName(name)).toThrow(/kebab-case/);
    },
  );

  test('accepts a single-word name', () => {
    expect(() => validateArtifactName('summary')).not.toThrow();
  });

  test.for([...ARTIFACT_KINDS])('%s is a known kind', (kind) => {
    expect(isArtifactKind(kind)).toBe(true);
  });

  test('an unknown kind is rejected rather than guessed at', () => {
    expect(isArtifactKind('view')).toBe(false);
  });
});

describe('app kind', () => {
  test('writes the view, its resource, and the tool that opens it', () => {
    const pkg = fakePackage({ build: 'tsdown', typecheck: 'tsc' });
    const result = scaffoldApp(pkg, deriveNames(pkg, 'usage-chart'));

    const component = readFileSync(
      join(pkg.dir, 'src', 'ui', 'usage-chart', 'UsageChartView.tsx'),
      'utf8',
    );
    const resource = readFileSync(join(pkg.dir, 'src', 'apps', 'usage-chart.ts'), 'utf8');
    const tool = readFileSync(join(pkg.dir, 'src', 'tools', 'usage_chart_app.ts'), 'utf8');

    // The synthesized entry imports this exact name, which is also what
    // `mcp-app-views.test.ts` asserts of every view in the repo.
    expect(component).toContain('export function UsageChartView()');
    expect(resource).toContain(
      "export const USAGE_CHART_APP_URI = 'ui://transcend-docs/usage-chart'",
    );
    expect(tool).toContain("name: 'docs_usage_chart'");
    expect(tool).toContain('[McpClientCapability.McpApp]');
    expect(result).toMatchObject({
      factory: 'createUsageChartAppTool',
      toolModule: './usage_chart_app.js',
      manifestChanged: true,
    });
  });

  test('carries no elicitation variant, so the form is a separate decision', () => {
    const pkg = fakePackage();
    scaffoldApp(pkg, deriveNames(pkg, 'usage-chart'));

    const tool = readFileSync(join(pkg.dir, 'src', 'tools', 'usage_chart_app.ts'), 'utf8');
    expect(tool).not.toContain('McpClientCapability.Elicitation');
    expect(tool).toContain('pnpm mcp:new elicitation');
  });

  test('adds the view scripts beside their anchors rather than at the end', () => {
    const pkg = fakePackage({ build: 'tsdown', typecheck: 'tsc' });
    scaffoldApp(pkg, deriveNames(pkg, 'usage-chart'));

    // Order is the point: `prebuild` has to read as the step before `build`.
    expect(Object.keys(readManifest(pkg).scripts ?? {})).toEqual([
      'prebuild',
      'build',
      'build:ui',
      'typecheck',
      'typecheck:ui',
    ]);
  });

  test('adds the browser-side devDependencies and the wiring files', () => {
    const pkg = fakePackage();
    scaffoldApp(pkg, deriveNames(pkg, 'usage-chart'));

    expect(readManifest(pkg).devDependencies).toMatchObject({
      react: 'catalog:',
      tailwindcss: 'catalog:',
      vite: 'catalog:',
    });
    expect(readFileSync(join(pkg.dir, 'tsconfig.ui.json'), 'utf8')).toContain(
      'tsconfig.ui.base.json',
    );
    expect(readFileSync(join(pkg.dir, '.gitignore'), 'utf8')).toContain('src/ui/generated/');
  });

  test('reports no manifest change on a package that already has the wiring', () => {
    const pkg = fakePackage();
    scaffoldApp(pkg, deriveNames(pkg, 'first-view'));

    // Second view on the same package: nothing left to add, so nothing is owed an
    // install either.
    expect(scaffoldApp(pkg, deriveNames(pkg, 'second-view')).manifestChanged).toBe(false);
  });
});

describe('tool kind', () => {
  test('writes one file with no capability variants', () => {
    const pkg = fakePackage();
    const result = scaffoldTool(pkg, deriveNames(pkg, 'fetch-usage'));

    const tool = readFileSync(join(pkg.dir, 'src', 'tools', 'fetch_usage.ts'), 'utf8');
    expect(tool).toContain('defineTool({');
    expect(tool).toContain("name: 'docs_fetch_usage'");
    expect(tool).not.toContain('defineToolWithCapabilities');
    expect(tool).not.toContain('variants');
    expect(result).toMatchObject({
      factory: 'createFetchUsageTool',
      toolModule: './fetch_usage.js',
      manifestChanged: false,
    });
  });

  test('leaves the manifest alone, so a text tool pulls in no browser dependencies', () => {
    const pkg = fakePackage({ build: 'tsdown' });
    const before = readFileSync(join(pkg.dir, 'package.json'), 'utf8');

    scaffoldTool(pkg, deriveNames(pkg, 'fetch-usage'));

    expect(readFileSync(join(pkg.dir, 'package.json'), 'utf8')).toBe(before);
  });
});

describe('elicitation kind', () => {
  test('writes a form with a required field and a non-empty prompt', () => {
    const pkg = fakePackage();
    const result = scaffoldElicitation(pkg, deriveNames(pkg, 'confirm-optout'));
    const tool = readFileSync(join(pkg.dir, 'src', 'tools', 'confirm_optout.ts'), 'utf8');

    // Both are checked at construction by `assertElicitFormSchema`, so a
    // placeholder here would be a package that cannot boot.
    expect(tool).toMatch(/const FORM_MESSAGE = '[^']+'/);
    expect(tool).toContain("REQUIRED_FIELDS = ['value']");
    expect(tool).toContain('[McpClientCapability.Elicitation]');
    expect(result).toMatchObject({
      factory: 'createConfirmOptoutTool',
      manifestChanged: false,
    });
  });

  test('handles every way a form request can end', () => {
    const pkg = fakePackage();
    scaffoldElicitation(pkg, deriveNames(pkg, 'confirm-optout'));
    const tool = readFileSync(join(pkg.dir, 'src', 'tools', 'confirm_optout.ts'), 'utf8');

    // A form tool that ignores a decline or a cancel is broken in a way that only
    // shows up in front of a user.
    for (const outcome of [
      'answered',
      'not-asked',
      'declined',
      'cancelled',
      'unavailable',
      'malformed',
    ]) {
      expect(tool).toContain(`'${outcome}'`);
    }
  });

  test('carries no MCP App variant, which would take precedence over the form', () => {
    const pkg = fakePackage();
    scaffoldElicitation(pkg, deriveNames(pkg, 'confirm-optout'));

    const tool = readFileSync(join(pkg.dir, 'src', 'tools', 'confirm_optout.ts'), 'utf8');
    expect(tool).not.toContain('McpClientCapability.McpApp');
  });
});

describe('every kind', () => {
  test.for([
    ['app', scaffoldApp],
    ['tool', scaffoldTool],
    ['elicitation', scaffoldElicitation],
  ] as const)('%s refuses to overwrite a file it did not create', ([, scaffold]) => {
    const pkg = fakePackage();
    scaffold(pkg, deriveNames(pkg, 'usage-chart'));

    expect(() => scaffold(pkg, deriveNames(pkg, 'usage-chart'))).toThrow(/already exists/);
  });

  test.for([
    ['app', scaffoldApp],
    ['tool', scaffoldTool],
    ['elicitation', scaffoldElicitation],
  ] as const)('%s leaves the tool unregistered but says how to register it', ([, scaffold]) => {
    const pkg = fakePackage();
    const result = scaffold(pkg, deriveNames(pkg, 'usage-chart'));

    // Registration is where a name and description become public API, so it stays
    // a person's decision — but the epilogue has to make it a paste.
    expect(result.factory).toMatch(/^create[A-Z]/);
    expect(result.toolModule).toMatch(/^\.\/[a-z_]+\.js$/);
    expect(result.steps.length).toBeGreaterThan(0);
  });
});
