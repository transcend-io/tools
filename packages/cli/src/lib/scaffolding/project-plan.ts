/** A file observed while collecting project state. */
export interface ProjectFileSnapshot {
  /** Absolute path. */
  path: string;
  /** Existing UTF-8 contents, or null when absent. */
  contents: string | null;
  /** Existing file mode, when present. */
  mode?: number;
}

/** State of one potentially mutated path. */
export type PlanningPathSnapshot =
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
      /** UTF-8 contents. */
      contents: string;
      /** File mode. */
      mode: number;
    }
  | {
      /** Snapshot kind. */
      kind: 'link';
      /** Absolute path. */
      path: string;
      /** Link target. */
      target: string;
    }
  | {
      /** Snapshot kind. */
      kind: 'directory';
      /** Absolute path. */
      path: string;
    };

/** A planned regular-file create or update. */
export interface PlannedFileChange {
  /** Discriminator. */
  kind: 'file';
  /** Absolute destination path. */
  path: string;
  /** Existing contents expected immediately before apply. */
  before: string | null;
  /** Complete desired contents. */
  after: string;
  /** Human-readable reason. */
  description: string;
  /** Existing file mode to preserve. */
  mode?: number;
  /** Whether an existing destination must always be rejected. */
  createOnly?: boolean;
}

/** A planned project-local symbolic link with a copy fallback. */
export interface PlannedLinkChange {
  /** Discriminator. */
  kind: 'link';
  /** Absolute link path. */
  path: string;
  /** Relative link target. */
  target: string;
  /** Managed files to copy when links are unavailable. */
  fallbackFiles: {
    /** Destination relative to the link path. */
    path: string;
    /** Complete desired contents. */
    contents: string;
  }[];
  /** Human-readable reason. */
  description: string;
}

/** One staged project mutation. */
export type PlannedChange = PlannedFileChange | PlannedLinkChange;

/** Minimal plan consumed by the transactional filesystem applicator. */
export interface ProjectPlan {
  /** Approved physical root for every planned mutation. */
  rootDirectory: string;
  /** Ordered staged mutations. */
  changes: PlannedChange[];
}

/**
 * Read a required candidate snapshot.
 *
 * @param snapshots - Snapshots keyed by absolute path
 * @param path - Absolute path
 * @returns Snapshot
 */
export function getPlanningPathSnapshot(
  snapshots: Readonly<Record<string, PlanningPathSnapshot>>,
  path: string,
): PlanningPathSnapshot {
  const snapshot = snapshots[path];
  if (!snapshot) {
    throw new Error(`Missing preflight snapshot for ${path}`);
  }
  return snapshot;
}

/**
 * Adapt a planning snapshot to a regular-file plan input.
 *
 * @param snapshots - Snapshots keyed by absolute path
 * @param path - Absolute file path
 * @returns File snapshot
 */
export function getPlanningFileSnapshot(
  snapshots: Readonly<Record<string, PlanningPathSnapshot>>,
  path: string,
): ProjectFileSnapshot {
  const snapshot = getPlanningPathSnapshot(snapshots, path);
  if (snapshot.kind === 'directory' || snapshot.kind === 'link') {
    throw new Error(`Expected a regular file or absent path: ${path}`);
  }
  return snapshot.kind === 'file'
    ? { path, contents: snapshot.contents, mode: snapshot.mode }
    : { path, contents: null };
}

/**
 * Stage a file only when its desired content differs.
 *
 * @param input - File change input
 * @returns A file change, or undefined for a no-op
 */
export function planFileChange(input: {
  /** File snapshot. */
  snapshot: ProjectFileSnapshot;
  /** Desired contents. */
  after: string;
  /** Human-readable reason. */
  description: string;
  /** Refuse every existing file. */
  createOnly?: boolean;
}): PlannedFileChange | undefined {
  const { snapshot, after, description, createOnly } = input;
  if (createOnly && snapshot.contents !== null) {
    throw new Error(`Refusing to overwrite existing file: ${snapshot.path}`);
  }
  if (snapshot.contents === after) {
    return undefined;
  }
  return {
    kind: 'file',
    path: snapshot.path,
    before: snapshot.contents,
    after,
    description,
    ...(snapshot.mode === undefined ? {} : { mode: snapshot.mode }),
    ...(createOnly === undefined ? {} : { createOnly }),
  };
}
