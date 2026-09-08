import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const packageDirectory = join(import.meta.dirname, '..');
const repositoryDirectory = join(packageDirectory, '..', '..');
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'custom-function-skill-bundle-'));
const targetDirectory = join(temporaryDirectory, 'project');
const skillDirectory = join(targetDirectory, '.agents', 'skills', 'transcend-custom-functions');
const skillFiles = ['SKILL.md', 'references/setup.md', 'references/writing-custom-functions.md'];

try {
  const result = spawnSync(
    process.execPath,
    [
      join(packageDirectory, 'dist', 'bin', 'cli.mjs'),
      'custom-functions',
      'init',
      targetDirectory,
      '--skill',
      '--yes',
      '--noInteractive',
    ],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(
      `The built CLI could not install its Custom Function skill:\n${result.stderr || result.stdout}`,
    );
  }
  skillFiles.forEach((relativePath) => {
    const source = readFileSync(
      join(repositoryDirectory, 'skills', 'transcend-custom-functions', relativePath),
      'utf8',
    ).trimEnd();
    const generated = readFileSync(join(skillDirectory, relativePath), 'utf8')
      .replace(/\n*<!-- managed-by: @transcend-io\/cli; content-sha256: [a-f0-9]{64} -->\s*$/u, '')
      .trimEnd();
    if (generated !== source) {
      throw new Error(`The built CLI contains stale skill content: ${relativePath}`);
    }
  });
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
