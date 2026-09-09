/** A file observed while collecting project state. */
export interface ProjectFileSnapshot {
  /** Absolute path. */
  path: string;
  /** Existing UTF-8 contents, or null when absent. */
  contents: string | null;
  /** Existing file mode, when present. */
  mode?: number;
}

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
