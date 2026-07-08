import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildOpaBundleTarball } from '../buildOpaBundleTarball.js';

const runOPACaptureMock = vi.hoisted(() => vi.fn());

vi.mock('../assertOpaInstalled.js', () => ({
  assertOpaInstalled: vi.fn(),
}));

vi.mock('../runOpa.js', () => ({
  runOPACapture: runOPACaptureMock,
}));

describe('buildOpaBundleTarball', () => {
  let tempDir: string;
  let outputPaths: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: both `opa check` and `opa build` succeed.
    runOPACaptureMock.mockResolvedValue({ code: 0, stdout: '', stderr: '' });
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-bundle-test-'));
    outputPaths = [];
  });

  afterEach(() => {
    for (const outputPath of outputPaths) {
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates a tarball with manifest.json and policy files only', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'manifest.json'),
      JSON.stringify({ roots: ['policy_engine'] }),
    );
    fs.mkdirSync(path.join(tempDir, 'policy_engine'));
    fs.writeFileSync(
      path.join(tempDir, 'policy_engine', 'decision.rego'),
      'package policy_engine\n\ndefault decision := "deny"\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'policy_engine', 'decision_test.rego'),
      'package policy_engine\n\ntest_decision if { true }\n',
    );
    fs.writeFileSync(path.join(tempDir, 'data.json'), '{}');

    const outputPath = await buildOpaBundleTarball(tempDir);
    outputPaths.push(outputPath);

    const listResult = spawnSync('tar', ['-tzf', outputPath], { encoding: 'utf8' });
    expect(listResult.status).toBe(0);

    const entries = listResult.stdout.trim().split('\n').sort();
    expect(entries).toEqual(['manifest.json', 'policy_engine/decision.rego']);
    expect(entries).not.toContain('policy_engine/decision_test.rego');
    expect(entries).not.toContain('data.json');
    expect(entries).not.toContain('.manifest');
  });

  it('validates the bundle compiles with `opa build` before packaging', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'manifest.json'),
      JSON.stringify({ roots: ['policy_engine'] }),
    );
    fs.mkdirSync(path.join(tempDir, 'policy_engine'));
    fs.writeFileSync(
      path.join(tempDir, 'policy_engine', 'decision.rego'),
      'package policy_engine\n\ndefault decision := "deny"\n',
    );

    const outputPath = await buildOpaBundleTarball(tempDir);
    outputPaths.push(outputPath);

    // Two OPA invocations: `opa check` then `opa build`.
    expect(runOPACaptureMock).toHaveBeenCalledTimes(2);
    const checkArgs = runOPACaptureMock.mock.calls[0][0] as string[];
    const buildArgs = runOPACaptureMock.mock.calls[1][0] as string[];
    const buildOptions = runOPACaptureMock.mock.calls[1][1] as { cwd?: string };
    expect(checkArgs[0]).toBe('check');
    expect(buildArgs[0]).toBe('build');
    expect(buildArgs).toContain('--v0-compatible');
    expect(buildArgs).toContain('--ignore');
    expect(buildArgs[buildArgs.indexOf('--ignore') + 1]).toBe('*_test.rego');
    expect(buildArgs.at(-1)).toBe('.');
    expect(buildOptions).toEqual({ cwd: tempDir });
  });

  it('throws a clear error when `opa check` fails', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'manifest.json'),
      JSON.stringify({ roots: ['policy_engine'] }),
    );
    fs.writeFileSync(path.join(tempDir, 'policy.rego'), 'package policy_engine\n');
    runOPACaptureMock.mockResolvedValueOnce({
      code: 2,
      stdout: '',
      stderr: 'policy.rego:3: rego parse error: unexpected assign token',
    });

    await expect(buildOpaBundleTarball(tempDir)).rejects.toThrow(
      /rego parse error: unexpected assign token/,
    );
    // `opa build` must not run once `opa check` has failed.
    expect(runOPACaptureMock).toHaveBeenCalledTimes(1);
  });

  it('throws a clear error when `opa build` fails to compile the bundle', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'manifest.json'),
      JSON.stringify({ roots: ['policy_engine'] }),
    );
    fs.writeFileSync(path.join(tempDir, 'policy.rego'), 'package policy_engine\n');
    runOPACaptureMock
      .mockResolvedValueOnce({ code: 0, stdout: '', stderr: '' }) // opa check
      .mockResolvedValueOnce({
        code: 1,
        stdout: '',
        stderr: 'policy.rego:5: undefined function data.foo.bar',
      }); // opa build

    await expect(buildOpaBundleTarball(tempDir)).rejects.toThrow(
      /undefined function data\.foo\.bar/,
    );
    expect(runOPACaptureMock).toHaveBeenCalledTimes(2);
  });

  it('throws when manifest.json is missing', async () => {
    fs.writeFileSync(path.join(tempDir, 'policy.rego'), 'package policy_engine\n');

    await expect(buildOpaBundleTarball(tempDir)).rejects.toThrow(/manifest\.json/i);
  });

  it('throws when no publishable rego files exist', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'manifest.json'),
      JSON.stringify({ roots: ['policy_engine'] }),
    );
    fs.writeFileSync(path.join(tempDir, 'policy_test.rego'), 'package policy_engine\n');

    await expect(buildOpaBundleTarball(tempDir)).rejects.toThrow(/at least one \.rego/i);
  });
});
