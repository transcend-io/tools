import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MAX_BUNDLE_COMPRESSED_BYTES } from '../../constants.js';
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

  it('shells out to `opa build` and returns the compiled bundle path', async () => {
    // Write a minimal valid bundle at the -o path.
    runOPACaptureMock.mockImplementation(async (args: string[]) => {
      const outputIndex = args.indexOf('-o');
      const outputPath = args[outputIndex + 1];
      fs.writeFileSync(outputPath, Buffer.from([0x1f, 0x8b, 0x08, 0x00]));
      return { code: 0, stdout: '', stderr: '' };
    });

    const outputPath = await buildOpaBundleTarball(tempDir);
    outputPaths.push(outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
    expect(runOPACaptureMock).toHaveBeenCalledTimes(1);
    const [args, options] = runOPACaptureMock.mock.calls[0];
    expect(args[0]).toBe('build');
    expect(args).toContain('--v0-compatible');
    expect(args).toContain('--ignore');
    expect(args[args.indexOf('--ignore') + 1]).toBe('*_test.rego');
    expect(args[args.indexOf('-o') + 1]).toBe(outputPath);
    expect(args.at(-1)).toBe('.');
    expect(options).toEqual({ cwd: tempDir });
  });

  it('throws a clear error when `opa build` exits non-zero and cleans up the output', async () => {
    runOPACaptureMock.mockResolvedValue({
      code: 2,
      stdout: '',
      stderr: 'policy.rego:3: rego parse error: unexpected assign token',
    });

    await expect(buildOpaBundleTarball(tempDir)).rejects.toThrow(
      /rego parse error: unexpected assign token/,
    );
  });

  it('throws when the policy directory does not exist', async () => {
    runOPACaptureMock.mockResolvedValue({ code: 0, stdout: '', stderr: '' });

    await expect(buildOpaBundleTarball(path.join(tempDir, 'does-not-exist'))).rejects.toThrow(
      /does not exist or is not a directory/i,
    );
    expect(runOPACaptureMock).not.toHaveBeenCalled();
  });

  it('throws when `opa build` produces no bundle file', async () => {
    runOPACaptureMock.mockResolvedValue({ code: 0, stdout: '', stderr: '' });

    await expect(buildOpaBundleTarball(tempDir)).rejects.toThrow(
      /did not produce a bundle tarball/i,
    );
  });

  it('rejects bundles exceeding the compressed upload limit', async () => {
    runOPACaptureMock.mockImplementation(async (args: string[]) => {
      const outputIndex = args.indexOf('-o');
      const outputPath = args[outputIndex + 1];
      // Write a file larger than the limit.
      const fd = fs.openSync(outputPath, 'w');
      fs.writeSync(fd, Buffer.alloc(MAX_BUNDLE_COMPRESSED_BYTES + 1, 0));
      fs.closeSync(fd);
      return { code: 0, stdout: '', stderr: '' };
    });

    await expect(buildOpaBundleTarball(tempDir)).rejects.toThrow(/exceeds the .* byte compressed/i);
  });
});
