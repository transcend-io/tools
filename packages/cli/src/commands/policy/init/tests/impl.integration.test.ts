import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { runCapturedProcess } from '../../../../lib/cli/run-captured-process.js';
import { PolicySetupFeature } from '../../../../lib/policy/policy-scaffold-model.js';
import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { buildOpaBundleTarball } from '../../helpers/buildOpaBundleTarball.js';
import { lint } from '../../lint/impl.js';
import { _new } from '../../new/impl.js';
import { init, type PolicyInitFlags } from '../impl.js';

const root = mkdtempSync(join(tmpdir(), 'policy-init-integration-'));
const generatedArchives: string[] = [];

afterAll(() => {
  generatedArchives.forEach((archive) => {
    if (existsSync(archive)) {
      unlinkSync(archive);
    }
  });
  rmSync(root, { recursive: true, force: true });
});

describe('policy init + new with pinned OPA and Regal', () => {
  it('initializes workspace, adds a generic bundle, then validates and packages it', async () => {
    mkdirSync(join(root, '.git'), { recursive: true });
    writeFileSync(
      join(root, '.git', 'config'),
      '[remote "origin"]\n  url = https://github.com/transcend-io/example.git\n',
    );
    const initContext = buildContextForTest({
      cwd: root,
      stdinIsTTY: false,
    });
    const flags: PolicyInitFlags = {
      editor: true,
      skill: true,
      ci: true,
      noInteractive: true,
      dryRun: false,
      yes: true,
      json: true,
    };

    await init.call(initContext, flags, undefined, runCapturedProcess);

    const initResult = JSON.parse(initContext.stdout);
    const policyDirectory = join(root, 'transcend', 'policy');
    expect(initResult).toMatchObject({
      applied: true,
      features: Object.values(PolicySetupFeature),
      tools: {
        opa: expect.stringMatching(/^\d+\.\d+\.\d+/u),
      },
    });
    expect(existsSync(join(root, '.vscode', 'settings.json'))).toBe(true);
    expect(existsSync(join(root, '.agents', 'skills', 'transcend-policy-engine', 'SKILL.md'))).toBe(
      true,
    );
    expect(existsSync(join(root, '.github', 'workflows', 'transcend-policy.yml'))).toBe(true);

    const newContext = buildContextForTest({
      cwd: root,
      stdinIsTTY: false,
    });
    await _new.call(newContext, {
      name: 'example',
      template: 'generic',
      noInteractive: true,
      dryRun: false,
      yes: true,
      json: true,
    });

    const newResult = JSON.parse(newContext.stdout);
    expect(newResult.applied).toBe(true);
    expect(newResult.root).toBe('example');

    const lintContext = buildContextForTest({
      cwd: root,
      stdinIsTTY: false,
    });
    const bundleDirectory = join(policyDirectory, 'example-bundle');
    await lint.call(
      lintContext,
      {
        fix: false,
        noInteractive: true,
        json: true,
      },
      bundleDirectory,
      runCapturedProcess,
    );

    const lintResult = JSON.parse(lintContext.stdout);
    expect(lintResult.status, JSON.stringify(lintResult, null, 2)).toBe('passed');
    expect(lintResult.tools).toEqual({
      opa: expect.stringMatching(/^\d+\.\d+\.\d+/u),
      regal: expect.stringMatching(/^\d+\.\d+\.\d+/u),
    });
    expect(lintResult.unformattedFiles).toEqual([]);
    expect(lintResult.checks).toEqual([
      { name: 'manifest', status: 'passed' },
      { name: 'opa-version', status: 'passed' },
      { name: 'regal-version', status: 'passed' },
      { name: 'format', status: 'passed' },
      { name: 'opa-check', status: 'passed' },
      { name: 'regal-lint', status: 'passed' },
      { name: 'opa-test', status: 'passed' },
    ]);

    const archive = await buildOpaBundleTarball(bundleDirectory);
    generatedArchives.push(archive);
    const list = spawnSync('tar', ['-tzf', archive], { encoding: 'utf8' });
    expect(list.status, list.stderr).toBe(0);
    expect(list.stdout.trim().split('\n').sort()).toEqual([
      '.manifest',
      'example/result/result.rego',
    ]);
    expect(readFileSync(join(bundleDirectory, '.manifest'), 'utf8')).toContain('"example"');
  }, 60_000);
});
