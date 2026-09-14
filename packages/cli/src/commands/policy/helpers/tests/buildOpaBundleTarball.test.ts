import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { POLICY_ENGINE_ROOT } from '../../../../lib/policy/policy-scaffold-templates.js';
import { buildOpaBundleTarball } from '../buildOpaBundleTarball.js';

const runOPACaptureMock = vi.hoisted(() => vi.fn());

const constantsMock = vi.hoisted(() => ({
  MAX_BUNDLE_COMPRESSED_BYTES: 5120,
  MAX_BUNDLE_DECOMPRESSED_BYTES: 51200,
}));

vi.mock('../../constants.js', () => constantsMock);

vi.mock('../assertOpaInstalled.js', () => ({
  assertOpaInstalled: vi.fn(),
}));

vi.mock('../runOpa.js', () => ({
  runOPACapture: runOPACaptureMock,
}));

/**
 * Write a publishable Rego module under {@link POLICY_ENGINE_ROOT}.
 *
 * @param dir - Bundle directory
 * @param fileName - File name within the root package directory
 * @param contents - Rego source
 */
function writeRootPackageRego(dir: string, fileName: string, contents: string): void {
  fs.mkdirSync(path.join(dir, POLICY_ENGINE_ROOT), { recursive: true });
  fs.writeFileSync(path.join(dir, POLICY_ENGINE_ROOT, fileName), contents);
}

describe('buildOpaBundleTarball', () => {
  let tempDir: string;
  let outputPaths: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: both `opa check` and `opa build` succeed.
    runOPACaptureMock.mockResolvedValue({ code: 0, stdout: '', stderr: '' });
    constantsMock.MAX_BUNDLE_COMPRESSED_BYTES = 5120;
    constantsMock.MAX_BUNDLE_DECOMPRESSED_BYTES = 51200;
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
      path.join(tempDir, '.manifest'),
      JSON.stringify({ roots: [POLICY_ENGINE_ROOT] }),
    );
    writeRootPackageRego(
      tempDir,
      'decision.rego',
      `package ${POLICY_ENGINE_ROOT}\n\ndefault decision := "deny"\n`,
    );
    writeRootPackageRego(
      tempDir,
      'decision_test.rego',
      `package ${POLICY_ENGINE_ROOT}_test\n\ntest_decision if { true }\n`,
    );
    fs.writeFileSync(path.join(tempDir, 'data.json'), '{}');

    const outputPath = await buildOpaBundleTarball(tempDir);
    outputPaths.push(outputPath);

    const listResult = spawnSync('tar', ['-tzf', outputPath], { encoding: 'utf8' });
    expect(listResult.status).toBe(0);

    const entries = listResult.stdout.trim().split('\n').sort();
    expect(entries).toEqual(['manifest.json', `${POLICY_ENGINE_ROOT}/decision.rego`]);
    expect(entries).not.toContain(`${POLICY_ENGINE_ROOT}/decision_test.rego`);
    expect(entries).not.toContain('data.json');
    expect(entries).not.toContain('.manifest');
  });

  it('validates the bundle compiles with `opa build` before packaging', async () => {
    fs.writeFileSync(
      path.join(tempDir, '.manifest'),
      JSON.stringify({ roots: [POLICY_ENGINE_ROOT] }),
    );
    writeRootPackageRego(
      tempDir,
      'decision.rego',
      `package ${POLICY_ENGINE_ROOT}\n\ndefault decision := "deny"\n`,
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
      path.join(tempDir, '.manifest'),
      JSON.stringify({ roots: [POLICY_ENGINE_ROOT] }),
    );
    writeRootPackageRego(tempDir, 'policy.rego', `package ${POLICY_ENGINE_ROOT}\n`);
    runOPACaptureMock.mockResolvedValueOnce({
      code: 2,
      stdout: '',
      stderr: `${POLICY_ENGINE_ROOT}/policy.rego:3: rego parse error: unexpected assign token`,
    });

    await expect(buildOpaBundleTarball(tempDir)).rejects.toThrow(
      /rego parse error: unexpected assign token/,
    );
    // `opa build` must not run once `opa check` has failed.
    expect(runOPACaptureMock).toHaveBeenCalledTimes(1);
  });

  it('throws a clear error when `opa build` fails to compile the bundle', async () => {
    fs.writeFileSync(
      path.join(tempDir, '.manifest'),
      JSON.stringify({ roots: [POLICY_ENGINE_ROOT] }),
    );
    writeRootPackageRego(tempDir, 'policy.rego', `package ${POLICY_ENGINE_ROOT}\n`);
    runOPACaptureMock
      .mockResolvedValueOnce({ code: 0, stdout: '', stderr: '' }) // opa check
      .mockResolvedValueOnce({
        code: 1,
        stdout: '',
        stderr: `${POLICY_ENGINE_ROOT}/policy.rego:5: undefined function data.foo.bar`,
      }); // opa build

    await expect(buildOpaBundleTarball(tempDir)).rejects.toThrow(
      /undefined function data\.foo\.bar/,
    );
    expect(runOPACaptureMock).toHaveBeenCalledTimes(2);
  });

  it('throws when .manifest is missing', async () => {
    writeRootPackageRego(tempDir, 'policy.rego', `package ${POLICY_ENGINE_ROOT}\n`);

    await expect(buildOpaBundleTarball(tempDir)).rejects.toThrow(/\.manifest/i);
  });

  it('throws when no publishable rego files exist', async () => {
    fs.writeFileSync(
      path.join(tempDir, '.manifest'),
      JSON.stringify({ roots: [POLICY_ENGINE_ROOT] }),
    );
    writeRootPackageRego(tempDir, 'policy_test.rego', `package ${POLICY_ENGINE_ROOT}_test\n`);

    await expect(buildOpaBundleTarball(tempDir)).rejects.toThrow(/at least one \.rego/i);
  });

  it('throws a clear error when .manifest is not valid JSON', async () => {
    fs.writeFileSync(path.join(tempDir, '.manifest'), '{ not valid json');
    writeRootPackageRego(tempDir, 'policy.rego', `package ${POLICY_ENGINE_ROOT}\n`);

    await expect(buildOpaBundleTarball(tempDir)).rejects.toThrow(/\.manifest is not valid JSON/i);
  });

  it('throws when .manifest roots is missing or empty', async () => {
    fs.writeFileSync(path.join(tempDir, '.manifest'), JSON.stringify({}));
    writeRootPackageRego(tempDir, 'policy.rego', `package ${POLICY_ENGINE_ROOT}\n`);

    await expect(buildOpaBundleTarball(tempDir)).rejects.toThrow(
      /must declare "roots" as a non-empty array/i,
    );
  });

  it('throws when .manifest roots contains non-string entries', async () => {
    fs.writeFileSync(
      path.join(tempDir, '.manifest'),
      JSON.stringify({ roots: [POLICY_ENGINE_ROOT, 42] }),
    );
    writeRootPackageRego(tempDir, 'policy.rego', `package ${POLICY_ENGINE_ROOT}\n`);

    await expect(buildOpaBundleTarball(tempDir)).rejects.toThrow(
      /"roots" must be an array of non-empty strings/i,
    );
  });

  it('throws when a Rego package is not covered by manifest roots', async () => {
    fs.writeFileSync(
      path.join(tempDir, '.manifest'),
      JSON.stringify({ roots: [POLICY_ENGINE_ROOT] }),
    );
    fs.writeFileSync(path.join(tempDir, 'other.rego'), 'package other.package\n');

    await expect(buildOpaBundleTarball(tempDir)).rejects.toThrow(
      /do not cover all Rego packages[\s\S]*other\.rego \(package other\.package\)/,
    );
  });

  it('accepts nested Rego packages under a manifest root', async () => {
    fs.writeFileSync(
      path.join(tempDir, '.manifest'),
      JSON.stringify({ roots: [POLICY_ENGINE_ROOT] }),
    );
    fs.mkdirSync(path.join(tempDir, POLICY_ENGINE_ROOT, 'transcend'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, POLICY_ENGINE_ROOT, 'transcend', 'decision.rego'),
      `package ${POLICY_ENGINE_ROOT}.transcend\n\ndefault decision := "deny"\n`,
    );

    const outputPath = await buildOpaBundleTarball(tempDir);
    outputPaths.push(outputPath);

    expect(runOPACaptureMock).toHaveBeenCalledTimes(2);
  });

  it('reports the compressed size limit with human-readable units', async () => {
    fs.writeFileSync(
      path.join(tempDir, '.manifest'),
      JSON.stringify({ roots: [POLICY_ENGINE_ROOT] }),
    );
    writeRootPackageRego(tempDir, 'policy.rego', `package ${POLICY_ENGINE_ROOT}\n`);

    // Force the compressed-size check to trip with a 1-byte limit.
    constantsMock.MAX_BUNDLE_COMPRESSED_BYTES = 1;

    await expect(buildOpaBundleTarball(tempDir)).rejects.toThrow(
      /exceeds the .* compressed upload limit[\s\S]*bundle is .*(KiB|B\))/,
    );
  });
});
