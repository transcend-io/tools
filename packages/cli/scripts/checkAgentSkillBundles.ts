import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** One literal Agent Skill expected in the built CLI. */
interface BundledSkillExpectation {
  /** Human-readable skill name. */
  name: string;
  /** CLI route that installs the skill. */
  command: readonly string[];
  /** Repository skill directory name. */
  directory: string;
  /** Skill assets expected after installation. */
  files: readonly string[];
}

const expectations: readonly BundledSkillExpectation[] = [
  {
    name: 'Custom Function',
    command: ['custom-functions', 'init'],
    directory: 'transcend-custom-functions',
    files: ['SKILL.md', 'references/setup.md', 'references/writing-custom-functions.md'],
  },
  {
    name: 'Policy Engine',
    command: ['policy', 'init'],
    directory: 'transcend-policy-engine',
    files: [
      'SKILL.md',
      'references/setup-tooling.md',
      'references/authoring.md',
      'references/testing-debugging.md',
      'references/publishing.md',
    ],
  },
];

const packageDirectory = join(import.meta.dirname, '..');
const repositoryDirectory = join(packageDirectory, '..', '..');
const cliPath = join(packageDirectory, 'dist', 'bin', 'cli.mjs');
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'agent-skill-bundles-'));

try {
  expectations.forEach(({ name, command, directory, files }) => {
    const projectDirectory = join(temporaryDirectory, directory);
    mkdirSync(projectDirectory, { recursive: true });
    const result = spawnSync(
      process.execPath,
      [cliPath, ...command, '--skill', '--yes', '--noInteractive'],
      {
        cwd: projectDirectory,
        encoding: 'utf8',
      },
    );
    if (result.error || result.status !== 0) {
      throw new Error(
        `The built CLI could not install its ${name} skill:\n${
          result.error?.message || result.stderr || result.stdout
        }`,
      );
    }
    files.forEach((relativePath) => {
      const source = readFileSync(
        join(repositoryDirectory, 'skills', directory, relativePath),
        'utf8',
      ).trimEnd();
      const generated = readFileSync(
        join(projectDirectory, '.agents', 'skills', directory, relativePath),
        'utf8',
      )
        .replace(
          /\n*<!-- managed-by: @transcend-io\/cli; content-sha256: [a-f0-9]{64} -->\s*$/u,
          '',
        )
        .trimEnd();
      if (generated !== source) {
        throw new Error(`The built CLI contains stale ${name} skill content: ${relativePath}`);
      }
    });
  });
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
