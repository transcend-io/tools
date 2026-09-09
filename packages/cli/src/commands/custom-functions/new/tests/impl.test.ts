import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { CustomFunctionType } from '@transcend-io/privacy-types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseCustomFunctionsManifest } from '../../../../lib/custom-functions/manifest.js';
import {
  CUSTOM_FUNCTION_TEMPLATE_NAMES,
  generateCustomFunctionTemplate,
} from '../../../../lib/custom-functions/scaffold-templates.js';
import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { stripAnsi } from '../../../../lib/tests/helpers/stripAnsi.js';
import {
  newCustomFunction,
  selectInteractiveTemplate,
  type CustomFunctionNewFlags,
} from '../impl.js';

const temporaryRoots: string[] = [];

/**
 * Create and register an isolated temporary directory.
 *
 * @returns Temporary directory
 */
function makeTemporaryRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'custom-function-new-'));
  temporaryRoots.push(root);
  return root;
}

/**
 * Build non-interactive new-command flags.
 *
 * @param overrides - Flag values to replace
 * @returns Complete new-command flags
 */
function buildFlags(overrides: Partial<CustomFunctionNewFlags> = {}): CustomFunctionNewFlags {
  return {
    name: 'Example Function',
    template: 'general',
    noInteractive: true,
    dryRun: false,
    yes: true,
    json: true,
    ...overrides,
  };
}

/**
 * Create the manifest required by `new`.
 *
 * @param target - Custom Function project directory
 */
function initializeProject(target: string): void {
  mkdirSync(target, { recursive: true });
  writeFileSync(
    join(target, 'transcend-functions.yml'),
    '# Custom Functions managed as code.\nfunctions: []\n',
  );
}

/**
 * Build a context rooted at a temporary project.
 *
 * @param root - Temporary working directory
 * @returns Test command context
 */
function buildTestContext(root: string): ReturnType<typeof buildContextForTest> {
  return buildContextForTest({
    cwd: root,
    env: { HOME: root },
    stdinIsTTY: false,
  });
}

afterEach(() => {
  temporaryRoots.splice(0).forEach((root) => {
    rmSync(root, { recursive: true, force: true });
  });
});

describe('custom-functions new', () => {
  it('selects the only General template without a second prompt', async () => {
    const select = vi.fn().mockResolvedValue(CustomFunctionType.General);
    const prompts = { select } as unknown as Parameters<typeof selectInteractiveTemplate>[0];

    await expect(selectInteractiveTemplate(prompts)).resolves.toBe('general');
    expect(select).toHaveBeenCalledOnce();
    expect(select).toHaveBeenCalledWith(
      'Custom Function type:',
      [
        {
          name: 'General — triggered by Rules Automation',
          value: CustomFunctionType.General,
        },
        {
          name: 'DSR — triggered by a step in a Workflow',
          value: CustomFunctionType.Dsr,
        },
      ],
      CustomFunctionType.General,
    );
  });

  it('asks for a DSR template after selecting the DSR type', async () => {
    const select = vi
      .fn()
      .mockResolvedValueOnce(CustomFunctionType.Dsr)
      .mockResolvedValueOnce('dsr-enricher');
    const prompts = { select } as unknown as Parameters<typeof selectInteractiveTemplate>[0];

    await expect(selectInteractiveTemplate(prompts)).resolves.toBe('dsr-enricher');
    expect(select).toHaveBeenCalledTimes(2);
    expect(select).toHaveBeenLastCalledWith(
      'Template:',
      [
        {
          name: 'Data point resolver and preflight check',
          value: 'dsr-both',
        },
        {
          name: 'Data point resolver only',
          value: 'dsr-datapoint',
        },
        {
          name: 'Preflight check only',
          value: 'dsr-enricher',
        },
      ],
      'dsr-both',
    );
  });

  it('prints a compact implementation handoff', async () => {
    const root = makeTemporaryRoot();
    const target = join(root, 'project');
    initializeProject(target);
    const context = buildTestContext(root);

    await newCustomFunction.call(context, buildFlags({ json: false }), target);

    const lines = stripAnsi(context.stdout).split('\n');
    const handoffHeading = lines.indexOf('AI handoff — paste into your coding agent');
    expect(handoffHeading).toBeGreaterThan(-1);
    expect(lines[handoffHeading + 1]).toMatch(/^(?:Ask|Use) /u);
    const nextStepsHeading = lines.indexOf('Next steps');
    const nextSteps = lines.slice(nextStepsHeading + 1, handoffHeading).filter(Boolean);
    expect(nextSteps).toHaveLength(4);
    expect(nextSteps[0]).toMatch(/^Edit /u);
    expect(nextSteps[1]).toMatch(/^transcend custom-functions run /u);
    expect(nextSteps[2]).toMatch(/^transcend custom-functions check /u);
    expect(nextSteps[3]).toMatch(/^transcend custom-functions push /u);
    expect(context.stdout).toContain('implement `Example Function`');
    expect(context.stdout).toContain('replace the example fixtures with realistic cases');
  });

  it.each(CUSTOM_FUNCTION_TEMPLATE_NAMES)(
    'writes deterministic %s output to an initialized project',
    async (template) => {
      const root = makeTemporaryRoot();
      const target = join(root, 'project');
      initializeProject(target);
      const generated = generateCustomFunctionTemplate('Example Function', template);
      const context = buildTestContext(root);

      await newCustomFunction.call(context, buildFlags({ template }), target);

      const manifestPath = join(target, 'transcend-functions.yml');
      expect(parseCustomFunctionsManifest(readFileSync(manifestPath, 'utf8')).functions).toEqual([
        generated.manifestEntry,
      ]);
      expect(readFileSync(join(target, generated.sourceFile.path), 'utf8')).toBe(
        generated.sourceFile.contents,
      );
      generated.payloadFiles.forEach((file) => {
        expect(readFileSync(join(target, file.path), 'utf8')).toBe(file.contents);
      });
      expect(JSON.parse(context.stdout)).toMatchObject({
        version: 1,
        command: 'new',
        applied: true,
        dryRun: false,
        targetDirectory: target,
        manifestPath,
        aiHandoff: expect.stringContaining('coding agent'),
      });
      expect(context.stderr).toBe('');
    },
  );

  it.each(['source', 'payload'] as const)(
    'refuses an existing generated %s without partial initialization',
    async (kind) => {
      const root = makeTemporaryRoot();
      const target = join(root, 'project');
      initializeProject(target);
      const generated = generateCustomFunctionTemplate('Example Function', 'general');
      const collision =
        kind === 'source' ? generated.sourceFile.path : generated.payloadFiles[0]!.path;
      const collisionPath = join(target, collision);
      mkdirSync(dirname(collisionPath), { recursive: true });
      writeFileSync(collisionPath, 'existing contents\n');
      const context = buildTestContext(root);

      await expect(newCustomFunction.call(context, buildFlags(), target)).rejects.toThrow(
        kind === 'source'
          ? 'Custom Function name "Example Function" maps to functions/example-function.ts, ' +
              'which conflicts with existing path functions/example-function.ts. Choose another name.'
          : `Refusing to overwrite existing file: ${collisionPath}`,
      );

      expect(readFileSync(collisionPath, 'utf8')).toBe('existing contents\n');
      expect(readFileSync(join(target, 'transcend-functions.yml'), 'utf8')).toBe(
        '# Custom Functions managed as code.\nfunctions: []\n',
      );
      if (kind === 'payload') {
        expect(existsSync(join(target, generated.sourceFile.path))).toBe(false);
      }
    },
  );

  it('requires a name in non-interactive mode', async () => {
    const root = makeTemporaryRoot();
    const target = join(root, 'project');
    initializeProject(target);
    const context = buildTestContext(root);

    await expect(
      newCustomFunction.call(context, buildFlags({ name: undefined }), target),
    ).rejects.toThrow('Missing Custom Function name. Pass --name in a non-interactive invocation.');
  });

  it('requires a template in non-interactive mode', async () => {
    const root = makeTemporaryRoot();
    const target = join(root, 'project');
    initializeProject(target);
    const context = buildTestContext(root);

    await expect(
      newCustomFunction.call(context, buildFlags({ template: undefined }), target),
    ).rejects.toThrow('Missing Custom Function template.');
  });

  it('requires initialization before adding a function', async () => {
    const root = makeTemporaryRoot();
    const context = buildTestContext(root);

    await expect(
      newCustomFunction.call(context, buildFlags(), join(root, 'project')),
    ).rejects.toThrow('Run `transcend custom-functions init` to create the default project.');
  });

  it('suggests the only initialized Custom Function project it discovers', async () => {
    const root = makeTemporaryRoot();
    initializeProject(join(root, 'other-functions'));
    const context = buildTestContext(root);

    await expect(
      newCustomFunction.call(context, buildFlags(), join(root, 'missing-project')),
    ).rejects.toThrow("Did you mean `transcend custom-functions new 'other-functions'`?");
  });

  it('does not treat JSON output as approval to mutate', async () => {
    const root = makeTemporaryRoot();
    const target = join(root, 'project');
    initializeProject(target);
    const context = buildTestContext(root);

    await expect(
      newCustomFunction.call(context, buildFlags({ yes: false }), target),
    ).rejects.toThrow(
      'The plan requires approval in a non-interactive invocation. Review with --dryRun, then pass --yes.',
    );

    expect(readFileSync(join(target, 'transcend-functions.yml'), 'utf8')).toBe(
      '# Custom Functions managed as code.\nfunctions: []\n',
    );
    expect(context.stdout).toBe('');
    expect(context.stderr).toBe('');
  });

  it('emits one stable JSON result on stdout', async () => {
    const root = makeTemporaryRoot();
    const target = join(root, 'project');
    initializeProject(target);
    const context = buildTestContext(root);
    const flags = buildFlags({ dryRun: true, yes: false });

    await newCustomFunction.call(context, flags, target);
    const first = context.stdout;
    context.reset();
    await newCustomFunction.call(context, flags, target);

    expect(context.stdout).toBe(first);
    expect(first.endsWith('\n')).toBe(true);
    expect(first.trim().split('\n')).toHaveLength(1);
    expect(JSON.parse(first)).toMatchObject({
      version: 1,
      command: 'new',
      applied: false,
      dryRun: true,
    });
    expect(readFileSync(join(target, 'transcend-functions.yml'), 'utf8')).toBe(
      '# Custom Functions managed as code.\nfunctions: []\n',
    );
    expect(existsSync(join(target, 'functions'))).toBe(false);
    expect(context.stderr).toBe('');
  });
});
