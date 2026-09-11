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
import { POLICY_STARTER_REGAL_VERSION } from '../../../../lib/policy/policy-scaffold-artifacts.js';
import { PolicySetupFeature } from '../../../../lib/policy/policy-scaffold-model.js';
import { POLICY_STARTER_OPA_VERSION } from '../../../../lib/policy/policy-scaffold-templates.js';
import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { buildOpaBundleTarball } from '../../helpers/buildOpaBundleTarball.js';
import { lint } from '../../lint/impl.js';
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

describe('policy init with pinned OPA and Regal', () => {
  it('validates and packages the fully generated project', async () => {
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
        opa: POLICY_STARTER_OPA_VERSION,
        regal: POLICY_STARTER_REGAL_VERSION,
      },
    });
    expect(existsSync(join(root, '.vscode', 'settings.json'))).toBe(true);
    expect(existsSync(join(root, '.agents', 'skills', 'transcend-policy-engine', 'SKILL.md'))).toBe(
      true,
    );
    expect(existsSync(join(root, '.github', 'workflows', 'transcend-policy.yml'))).toBe(true);

    const lintContext = buildContextForTest({
      cwd: root,
      stdinIsTTY: false,
    });
    await lint.call(
      lintContext,
      {
        dir: policyDirectory,
        fix: false,
        noInteractive: true,
        json: true,
      },
      runCapturedProcess,
    );

    const lintResult = JSON.parse(lintContext.stdout);
    expect(lintResult.status, JSON.stringify(lintResult, null, 2)).toBe('passed');
    expect(lintResult.tools).toEqual({
      opa: POLICY_STARTER_OPA_VERSION,
      regal: POLICY_STARTER_REGAL_VERSION,
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

    const archive = await buildOpaBundleTarball(policyDirectory);
    generatedArchives.push(archive);
    const list = spawnSync('tar', ['-tzf', archive], { encoding: 'utf8' });
    expect(list.status, list.stderr).toBe(0);
    expect(list.stdout.trim().split('\n').sort()).toEqual([
      'manifest.json',
      'policy_engine/example/result.rego',
    ]);
    expect(readFileSync(join(policyDirectory, 'manifest.json'), 'utf8')).toContain(
      '"policy_engine"',
    );
  }, 60_000);
});
