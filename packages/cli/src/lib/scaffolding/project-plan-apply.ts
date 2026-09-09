import { basename, dirname, join } from 'node:path';

import type { LocalContext } from '../../context.js';
import { assertPathPhysicallyContained } from './path-safety.js';
import type { PlannedFileChange, PlannedLinkChange, ProjectPlan } from './project-plan.js';

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
 * Check a path without following its final symbolic link.
 *
 * @param context - CLI context
 * @param path - Candidate path
 * @returns Whether any filesystem entry exists
 */
function pathExists(context: LocalContext, path: string): boolean {
  try {
    context.fs.lstatSync(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

/**
 * Read one path for rollback.
 *
 * @param context - CLI context
 * @param path - Absolute path
 * @returns Original state
 */
function snapshotPath(context: LocalContext, path: string): RollbackSnapshot {
  if (!pathExists(context, path)) {
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
    if (pathExists(context, temporaryPath)) {
      context.fs.rmSync(temporaryPath, { force: true });
    }
  }
}

/**
 * Create a file atomically without replacing a destination that appeared.
 *
 * @param context - CLI context
 * @param path - Destination path
 * @param contents - UTF-8 contents
 * @param mode - Optional file mode
 */
function writeAtomicCreateOnly(
  context: LocalContext,
  path: string,
  contents: string,
  mode?: number,
): void {
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
    context.fs.linkSync(temporaryPath, path);
  } finally {
    if (pathExists(context, temporaryPath)) {
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
  if (snapshot.kind === 'absent') {
    if (pathExists(context, snapshot.path)) {
      context.fs.rmSync(snapshot.path, { recursive: true, force: true });
    }
    return;
  }
  context.fs.mkdirSync(dirname(snapshot.path), { recursive: true });
  if (snapshot.kind === 'link') {
    if (pathExists(context, snapshot.path)) {
      context.fs.rmSync(snapshot.path, { recursive: true, force: true });
    }
    context.fs.symlinkSync(snapshot.target, snapshot.path, 'dir');
    return;
  }
  if (pathExists(context, snapshot.path) && !context.fs.lstatSync(snapshot.path).isFile()) {
    context.fs.rmSync(snapshot.path, { recursive: true, force: true });
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
  const exists = pathExists(context, change.path);
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
 * @param rootDirectory - Approved mutation root
 */
function applyLink(context: LocalContext, change: PlannedLinkChange, rootDirectory: string): void {
  try {
    context.fs.symlinkSync(change.target, change.path, 'dir');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (!['EPERM', 'EACCES', 'ENOTSUP', 'UNKNOWN'].includes(code ?? '')) {
      throw error;
    }
    change.fallbackFiles.forEach((file) => {
      const path = join(change.path, file.path);
      assertPathPhysicallyContained(context, rootDirectory, path);
      context.fs.mkdirSync(dirname(path), { recursive: true });
      context.fs.writeFileSync(path, file.contents);
    });
  }
}

/**
 * Apply an approved project plan and restore source-controlled files on error.
 *
 * @param context - CLI context
 * @param plan - Approved plan
 */
export async function applyProjectPlan(context: LocalContext, plan: ProjectPlan): Promise<void> {
  for (const change of plan.changes) {
    assertPathPhysicallyContained(context, plan.rootDirectory, change.path);
    if (change.kind === 'file') {
      preflightFile(context, change);
    } else {
      if (pathExists(context, change.path)) {
        throw new Error(`Skill target appeared after preview: ${change.path}`);
      }
    }
  }

  const applied: RollbackSnapshot[] = [];
  try {
    for (const change of plan.changes) {
      assertPathPhysicallyContained(context, plan.rootDirectory, change.path);
      if (change.kind === 'file') {
        preflightFile(context, change);
        const snapshot = snapshotPath(context, change.path);
        if (change.before === null) {
          writeAtomicCreateOnly(context, change.path, change.after, change.mode);
        } else {
          writeAtomic(context, change.path, change.after, change.mode);
        }
        applied.push(snapshot);
      } else {
        if (pathExists(context, change.path)) {
          throw new Error(`Skill target appeared after preview: ${change.path}`);
        }
        applied.push({ kind: 'absent', path: change.path });
        applyLink(context, change, plan.rootDirectory);
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
