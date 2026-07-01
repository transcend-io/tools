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
