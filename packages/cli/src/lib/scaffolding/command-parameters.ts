/**
 * Shared positional project directory parameter.
 *
 * @param options - Product-specific directory details
 * @returns Stricli positional parameter definition
 */
export function createProjectDirectoryParameter(options: {
  /** User-facing project name. */
  projectName: string;
  /** Default project directory. */
  defaultDirectory: string;
}) {
  return {
    brief: `${options.projectName} project directory`,
    placeholder: 'directory',
    parse: String,
    optional: true as const,
    default: options.defaultDirectory,
  };
}

/** Shared stable machine-readable output flag. */
export const projectJsonParameter = {
  kind: 'boolean',
  brief: 'Emit stable JSON output and disable prompts',
  default: false,
} as const;

/** Shared prompt-disabling flag. */
export const projectNoInteractiveParameter = {
  kind: 'boolean',
  brief: 'Disable prompts',
  default: false,
} as const;

/** Shared project preview flag. */
export const projectDryRunParameter = {
  kind: 'boolean',
  brief: 'Preview changes without applying them',
  default: false,
} as const;

/** Shared final-confirmation bypass flag. */
export const projectYesParameter = {
  kind: 'boolean',
  brief: 'Skip only the final plan confirmation',
  default: false,
} as const;
