#!/usr/bin/env node
/**
 * Regenerate `pulumi-resource-transcend/npm-shrinkwrap.json` after changing the
 * plugin's runtime dependencies. `pack-plugin.mjs` refuses to pack without a
 * shrinkwrap that matches `package.json`.
 *
 * Usage: node scripts/update-plugin-shrinkwrap.mjs
 */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pluginSource = path.join(packageRoot, 'pulumi-resource-transcend');
// Mirrors `minimumReleaseAge` in pnpm-workspace.yaml, which npm does not read.
const resolveBefore = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

const staging = mkdtempSync(path.join(tmpdir(), 'pulumi-resource-transcend-'));
try {
  cpSync(path.join(pluginSource, 'package.json'), path.join(staging, 'package.json'));
  execFileSync(
    'npm',
    ['install', '--package-lock-only', '--ignore-scripts', `--before=${resolveBefore}`],
    { cwd: staging, stdio: 'inherit' },
  );
  execFileSync('npm', ['shrinkwrap'], { cwd: staging, stdio: 'inherit' });
  cpSync(path.join(staging, 'npm-shrinkwrap.json'), path.join(pluginSource, 'npm-shrinkwrap.json'));
} finally {
  rmSync(staging, { recursive: true, force: true });
}
