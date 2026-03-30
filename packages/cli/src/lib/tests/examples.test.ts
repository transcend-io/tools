import { mkdtemp, rm, writeFile } from 'fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'os';

import { run } from '@stricli/core';
import { fdir } from 'fdir';
import { describe, expect, test, vi } from 'vitest';

import { app } from '../../app.js';
import { buildContext } from '../../context.js';
import { getFlagList, type Example } from '../docgen/buildExamples.js';
import { captureLogs } from './helpers/captureLogs.js';

/**
 * Gets the example commands. Uses a mock to intercept `buildExampleCommand` from readme.ts files to populate the command lists.
 *
 * @returns The commands to perform test runs with, and the original commands.
 */
async function getExampleCommands(): Promise<{
  /** Commands to run via stricli `run` */
  commandsToTest: string[];
  /** The original commands as they appear in README.md for shellcheck */
  unalteredCommands: string[];
}> {
  const { commandsToTest, unalteredCommands } = vi.hoisted(() => {
    const commandsToTest: string[] = [];
    const unalteredCommands: string[] = [];

    return {
      commandsToTest,
      unalteredCommands,
    };
  });

  // Mock the `buildExampleCommand` function so that it populates the command lists.
  vi.mock(import('../docgen/buildExamples.js'), async (importOriginal) => {
    const actual = await importOriginal();
    const mockBuildExampleCommand = vi
      .fn()
      .mockImplementation((commandPath: string[], flags: Record<string, string>) => {
        const command = commandPath.join(' ');
        const flagList = actual.getFlagList(flags);

        // Replace bash variables
        const flagListWithReplacedVariables = flagList.map((flag) =>
          flag.replace(
            // Replace bash variables with "TEST_VALUE"
            /\$\{?\w+}?/g,
            'TEST_VALUE',
          ),
        );

        // Add the command to `commandsToTest` list
        const commandWithoutName = `${command} ${flagListWithReplacedVariables.join(' ')}`;
        commandsToTest.push(commandWithoutName);

        const unalteredCommand = actual.buildExampleCommand<Record<string, string>>(
          commandPath,
          flags,
        );
        unalteredCommands.push(unalteredCommand);
        return unalteredCommand;
      });

    return {
      ...actual,
      buildExamples: vi
        .fn()
        .mockImplementation((commandPath: string[], examples: Example<unknown>[]) =>
          examples
            .map((example) => {
              const exampleCommand = mockBuildExampleCommand(commandPath, example.flags);
              return `**${example.description}**\n\n\`\`\`sh\n${exampleCommand}\n\`\`\``;
            })
            .join('\n\n'),
        ),
      buildExampleCommand: mockBuildExampleCommand,
    };
  });

  // Get the readme.ts files.
  const docFiles = new fdir() // eslint-disable-line new-cap
    .withRelativePaths()
    .glob('**/readme.ts')
    .crawl('./src/commands')
    .sync();

  // Import each readme.ts. The mock will spy on the `buildExampleCommand` function and populate commandsToTest and unalteredCommands.
  await Promise.all(
    docFiles.map(
      async (file) =>
        (await import(/* @vite-ignore */ `../../commands/${file.replace(/\.ts$/u, '.js')}`))
          .default,
    ),
  );

  return {
    commandsToTest,
    unalteredCommands,
  };
}

type ShellcheckFinding = {
  file: string;
  line: number;
  endLine: number;
  column: number;
  endColumn: number;
  level: 'error' | 'warning' | 'info' | 'style';
  code: number;
  message: string;
};

/**
 * Formats shellcheck findings for a single command.
 *
 * @param command - The command that failed shellcheck.
 * @param findings - The shellcheck findings for the command.
 * @returns A readable failure message for the command.
 */
function formatShellcheckFailures(command: string, findings: ShellcheckFinding[]): string {
  return [
    `Command ${JSON.stringify(command)} is failing shellcheck:`,
    ...[...findings]
      .sort(
        (left, right) =>
          left.line - right.line || left.column - right.column || left.code - right.code,
      )
      .map(
        (finding) =>
          `  L${finding.line}:${finding.column} SC${finding.code} ${finding.level}: ${finding.message}`,
      ),
  ].join('\n');
}

/**
 * Parses shellcheck JSON output into individual findings.
 *
 * @param stdout - The stdout returned by shellcheck.
 * @returns The parsed shellcheck findings.
 */
function parseShellcheckOutput(stdout: string): ShellcheckFinding[] {
  const parsedOutput = JSON.parse(stdout) as
    | ShellcheckFinding[]
    | {
        comments?: ShellcheckFinding[];
      };

  if (Array.isArray(parsedOutput)) {
    return parsedOutput;
  }

  if (Array.isArray(parsedOutput.comments)) {
    return parsedOutput.comments;
  }

  throw new Error('shellcheck returned an unexpected JSON payload');
}

/**
 * Runs shellcheck against a batch of temp script files.
 *
 * @param filePaths - Paths to the script files to lint.
 * @returns The shellcheck findings for the batch.
 */
async function runShellcheck(filePaths: string[]): Promise<ShellcheckFinding[]> {
  return new Promise<ShellcheckFinding[]>((resolve, reject) => {
    const child = spawn('shellcheck', ['--shell=sh', '--format=json1', ...filePaths], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', (error) => {
      const errnoError = error as NodeJS.ErrnoException;
      if (errnoError.code === 'ENOENT') {
        reject(
          new Error(
            'shellcheck is required to run this test. Run `mise install` from the repo root to install it.',
          ),
        );
        return;
      }

      reject(error);
    });

    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve([]);
        return;
      }

      if (code === 1) {
        try {
          resolve(parseShellcheckOutput(stdout));
        } catch (error) {
          const output = [stdout, stderr].filter(Boolean).join('\n').trim();
          reject(
            new Error(`shellcheck returned invalid JSON output${output ? `:\n${output}` : ''}`, {
              cause: error,
            }),
          );
        }

        return;
      }

      const exitStatus = signal ? `was terminated by signal ${signal}` : `exited with code ${code}`;
      const output = [stdout, stderr].filter(Boolean).join('\n').trim();

      reject(new Error(`shellcheck ${exitStatus}${output ? `:\n${output}` : ''}`));
    });
  });
}

/**
 * Runs shellcheck once for all example commands while preserving per-command failures.
 *
 * @param commands - The commands to lint with shellcheck.
 * @returns Formatted shellcheck failures grouped by command.
 */
async function getShellcheckFailures(commands: string[]): Promise<string[]> {
  const uniqueCommands = [...new Set(commands)];
  const tempDir = await mkdtemp(join(tmpdir(), 'cli-example-script-'));

  try {
    const commandEntries = await Promise.all(
      uniqueCommands.map(async (command, index) => {
        const filePath = join(tempDir, `example-${index}.sh`);
        await writeFile(filePath, `#!/bin/sh\n${command}`);

        return {
          command,
          filePath,
        };
      }),
    );

    const findings = await runShellcheck(commandEntries.map(({ filePath }) => filePath));
    const commandByFilePath = new Map(
      commandEntries.map(({ command, filePath }) => [filePath, command]),
    );
    const findingsByCommand = new Map<string, ShellcheckFinding[]>();

    for (const finding of findings) {
      const command = commandByFilePath.get(finding.file);

      if (!command) {
        continue;
      }

      const existingFindings = findingsByCommand.get(command) ?? [];
      existingFindings.push(finding);
      findingsByCommand.set(command, existingFindings);
    }

    return uniqueCommands.flatMap((command) => {
      const commandFindings = findingsByCommand.get(command);

      if (!commandFindings || commandFindings.length === 0) {
        return [];
      }

      return [formatShellcheckFailures(command, commandFindings)];
    });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

describe('Example commands', async () => {
  const { commandsToTest, unalteredCommands } = await getExampleCommands();

  // Enable validation only mode, so that commands exit early after input validation.
  vi.stubEnv('DEVELOPMENT_MODE_VALIDATE_ONLY', 'true');

  test.each(commandsToTest)('Command %j passes input validation', async (commandToTest) => {
    let exitCode: number | undefined;

    const logCapturer = captureLogs();

    try {
      await run(
        app,
        commandToTest.split(' '),
        buildContext({
          ...globalThis.process,
          exit: (code?: number) => {
            exitCode = code;
            throw new Error(`Process exited with code ${code}`);
          },
        }),
      );
    } catch {
      // empty
    }

    const { stderr } = logCapturer.getLogs();
    logCapturer.restore();

    if (exitCode === 1) {
      throw new Error(`Failed to run command: ${commandToTest}\n${stderr}`);
    }
  });

  test('Example commands pass shellcheck', async () => {
    const shellcheckFailures = await getShellcheckFailures(unalteredCommands);

    if (shellcheckFailures.length > 0) {
      throw new Error(shellcheckFailures.join('\n\n'));
    }
  });
});

describe('getFlagList', () => {
  test('should format flag values', () => {
    expect(getFlagList({ enabled: true })[0]).toBe('--enabled');
    expect(getFlagList({ enabled: false })[0]).toBe('--enabled=false');
    expect(getFlagList({ input: 'true' })[0]).toBe('--input=true');
    expect(getFlagList({ input: 'false' })[0]).toBe('--input=false');
    expect(getFlagList({ scope: 'One Two' })[0]).toBe('--scope="One Two"');
    expect(getFlagList({ num: 1_000 })[0]).toBe('--num=1000');
    expect(getFlagList({ num: 0 })[0]).toBe('--num=0');
    expect(getFlagList({ auth: '$TRANSCEND_API_KEY' })[0]).toBe('--auth="$TRANSCEND_API_KEY"');
    expect(getFlagList({ date: new Date('2025-01-01T00:00:00.000Z') })[0]).toBe(
      '--date=2025-01-01T00:00:00.000Z',
    );
    expect(getFlagList({ date: ['true', 'false'] })[0]).toBe('--date=true,false');
    expect(getFlagList({ list: ['One A', 'Two B'] })[0]).toBe('--list="One A,Two B"');
    expect(getFlagList({ list: ['One A'] })[0]).toBe('--list="One A"');
    expect(getFlagList({ list: ['One'] })[0]).toBe('--list=One');
    expect(getFlagList({ list: ['One', 'Two'] })[0]).toBe('--list=One,Two');
    expect(
      getFlagList({
        auths: ['$TRANSCEND_API_KEY', '$TRANSCEND_API_KEY_TWO'],
      })[0],
      // eslint-disable-next-line no-template-curly-in-string
    ).toBe('--auths="${TRANSCEND_API_KEY},${TRANSCEND_API_KEY_TWO}"');
  });
});
