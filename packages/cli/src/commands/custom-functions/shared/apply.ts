import { spawn } from 'node:child_process';
import { basename, dirname, join } from 'node:path';

import type { LocalContext } from '../../../context.js';
import type {
  CommandRollbackFile,
  CustomFunctionProjectPlan,
  PlannedCommandChange,
  PlannedFileChange,
  PlannedLinkChange,
} from './model.js';

/** Result of one planned subprocess. */
export interface PlannedCommandResult {
  /** Process exit code. */
  code: number;
}

/** Executes a planned subprocess. */
export type PlannedCommandRunner = (
  change: PlannedCommandChange,
  context: LocalContext,
) => Promise<PlannedCommandResult>;

/** Original state retained for rollback. */
type RollbackSnapshot =
  | {
      /** Snapshot kind. */
      kind: 'absent';
      /** Absolute path. */
      path: string;
    }
  | {
      /** Snapshot kind. */
      kind: 'file';
      /** Absolute path. */
      path: string;
      /** Original UTF-8 contents. */
      contents: string;
      /** Original mode. */
      mode: number;
    }
  | {
      /** Snapshot kind. */
      kind: 'link';
      /** Absolute path. */
      path: string;
      /** Original link target. */
      target: string;
    };

/**
 * Execute a subprocess with context-owned streams.
 *
 * @param change - Planned command
 * @param context - CLI context
 * @returns Exit code
 */
export const runPlannedCommand: PlannedCommandRunner = (change, context) =>
  new Promise((resolve, reject) => {
    const child = spawn(change.command, change.args, {
      cwd: change.cwd,
      env: context.process.env,
      stdio: [context.process.stdin, context.process.stdout, context.process.stderr],
    });
    child.once('error', reject);
    child.once('close', (code) => resolve({ code: code ?? 1 }));
  });

/**
 * Read one path for rollback.
 *
 * @param context - CLI context
 * @param path - Absolute path
 * @returns Original state
 */
function snapshotPath(context: LocalContext, path: string): RollbackSnapshot {
  if (!context.fs.existsSync(path)) {
    return { kind: 'absent', path };
  }
  const stat = context.fs.lstatSync(path);
  if (stat.isSymbolicLink()) {
    return { kind: 'link', path, target: context.fs.readlinkSync(path) };
  }
  if (!stat.isFile()) {
    throw new Error(`Cannot transactionally replace non-file path: ${path}`);
  }
  return {
    kind: 'file',
    path,
    contents: context.fs.readFileSync(path, 'utf8'),
    mode: stat.mode,
  };
}

/**
 * Write a regular file through a temporary sibling and rename.
 *
 * @param context - CLI context
 * @param path - Destination
 * @param contents - Desired contents
 * @param mode - Optional mode to preserve
 */
function writeAtomic(context: LocalContext, path: string, contents: string, mode?: number): void {
  context.fs.mkdirSync(dirname(path), { recursive: true });
  const temporaryPath = join(
    dirname(path),
    `.${basename(path)}.${context.process.pid}.${Date.now()}.tmp`,
  );
  try {
    context.fs.writeFileSync(
      temporaryPath,
      contents,
      mode === undefined ? undefined : { mode: mode & 0o777 },
    );
    context.fs.renameSync(temporaryPath, path);
  } finally {
    if (context.fs.existsSync(temporaryPath)) {
      context.fs.rmSync(temporaryPath, { force: true });
    }
  }
}

/**
 * Restore one path.
 *
 * @param context - CLI context
 * @param snapshot - Original state
 */
function restoreSnapshot(context: LocalContext, snapshot: RollbackSnapshot): void {
  if (context.fs.existsSync(snapshot.path)) {
    context.fs.rmSync(snapshot.path, { recursive: true, force: true });
  }
  if (snapshot.kind === 'absent') {
    return;
  }
  context.fs.mkdirSync(dirname(snapshot.path), { recursive: true });
  if (snapshot.kind === 'link') {
    context.fs.symlinkSync(snapshot.target, snapshot.path, 'dir');
    return;
  }
  writeAtomic(context, snapshot.path, snapshot.contents, snapshot.mode);
}

/**
 * Verify a planned regular-file precondition.
 *
 * @param context - CLI context
 * @param change - Planned file
 */
function preflightFile(context: LocalContext, change: PlannedFileChange): void {
  const exists = context.fs.existsSync(change.path);
  if (change.before === null) {
    if (exists) {
      throw new Error(`File appeared after preview: ${change.path}`);
    }
    return;
  }
  if (!exists || context.fs.readFileSync(change.path, 'utf8') !== change.before) {
    throw new Error(`File changed after preview: ${change.path}`);
  }
  if (change.createOnly) {
    throw new Error(`Refusing to overwrite existing file: ${change.path}`);
  }
}

/**
 * Install a project-local skill link, copying on platforms where links fail.
 *
 * @param context - CLI context
 * @param change - Planned link
 */
function applyLink(context: LocalContext, change: PlannedLinkChange): void {
  try {
    context.fs.symlinkSync(change.target, change.path, 'dir');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (!['EPERM', 'EACCES', 'ENOTSUP', 'UNKNOWN'].includes(code ?? '')) {
      throw error;
    }
    context.fs.mkdirSync(change.path, { recursive: true });
    context.fs.writeFileSync(join(change.path, 'SKILL.md'), change.fallbackContents);
  }
}

/**
 * Convert a command rollback declaration into a verified snapshot.
 *
 * @param context - CLI context
 * @param file - Declared rollback file
 * @returns Original state
 */
function snapshotCommandFile(context: LocalContext, file: CommandRollbackFile): RollbackSnapshot {
  const snapshot = snapshotPath(context, file.path);
  const actual = snapshot.kind === 'file' ? snapshot.contents : null;
  if (actual !== file.before) {
    throw new Error(`File changed after preview: ${file.path}`);
  }
  return snapshot;
}

/**
 * Apply an approved project plan and restore source-controlled files on error.
 *
 * @param context - CLI context
 * @param plan - Approved plan
 * @param runCommand - Subprocess runner
 */
export async function applyCustomFunctionProjectPlan(
  context: LocalContext,
  plan: CustomFunctionProjectPlan,
  runCommand: PlannedCommandRunner = runPlannedCommand,
): Promise<void> {
  for (const change of plan.changes) {
    if (change.kind === 'file') {
      preflightFile(context, change);
    } else if (change.kind === 'link') {
      if (context.fs.existsSync(change.path)) {
        throw new Error(`Skill target appeared after preview: ${change.path}`);
      }
    } else {
      change.rollbackFiles.forEach((file) => snapshotCommandFile(context, file));
    }
  }

  const applied: RollbackSnapshot[] = [];
  try {
    for (const change of plan.changes) {
      if (change.kind === 'file') {
        applied.push(snapshotPath(context, change.path));
        writeAtomic(context, change.path, change.after, change.mode);
      } else if (change.kind === 'link') {
        applied.push({ kind: 'absent', path: change.path });
        applyLink(context, change);
      } else {
        const snapshots = change.rollbackFiles.map((file) => snapshotCommandFile(context, file));
        applied.push(...snapshots);
        const result = await runCommand(change, context);
        if (result.code !== 0) {
          throw new Error(
            `${change.command} exited with code ${result.code} while ${change.description}`,
          );
        }
      }
    }
  } catch (error) {
    const rollbackErrors: string[] = [];
    for (const snapshot of applied.reverse()) {
      try {
        restoreSnapshot(context, snapshot);
      } catch (rollbackError) {
        rollbackErrors.push(`${snapshot.path}: ${(rollbackError as Error).message}`);
      }
    }
    if (rollbackErrors.length > 0) {
      throw new Error(
        `${(error as Error).message}\nRollback also failed:\n${rollbackErrors.join('\n')}`,
      );
    }
    throw error;
  }
}
