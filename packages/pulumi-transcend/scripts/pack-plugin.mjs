#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
/**
 * Pack the Node provider plugin for `pulumi plugin install resource transcend`.
 *
 * Usage: node scripts/pack-plugin.mjs [--out DIR]
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pluginSource = path.join(packageRoot, 'pulumi-resource-transcend');
const pkg = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
const version = pkg.version;

const outArg = process.argv.indexOf('--out');
const outDir =
  outArg >= 0 ? path.resolve(process.argv[outArg + 1]) : path.join(packageRoot, 'artifacts');

const plat =
  process.platform === 'darwin' ? 'darwin' : process.platform === 'win32' ? 'windows' : 'linux';
const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';

const staging = path.join(outDir, `pulumi-resource-transcend-v${version}-${plat}-${arch}`);
rmSync(staging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });

const pluginYaml = readFileSync(path.join(pluginSource, 'PulumiPlugin.yaml'), 'utf8').replace(
  /^version:.*$/m,
  `version: ${version}`,
);
writeFileSync(path.join(staging, 'PulumiPlugin.yaml'), pluginYaml);
cpSync(path.join(pluginSource, 'package.json'), path.join(staging, 'package.json'));
mkdirSync(path.join(staging, 'dist'), { recursive: true });
cpSync(path.join(packageRoot, 'dist', 'plugin'), path.join(staging, 'dist', 'plugin'), {
  recursive: true,
});

mkdirSync(outDir, { recursive: true });
const tarball = path.join(outDir, `pulumi-resource-transcend-v${version}-${plat}-${arch}.tar.gz`);
rmSync(tarball, { force: true });
execFileSync('tar', ['-czf', tarball, '-C', staging, '.'], { stdio: 'inherit' });

process.stdout.write(`${tarball}\n`);
