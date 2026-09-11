import { DEFAULT_CUSTOM_FUNCTION_DIRECTORY } from '../../lib/custom-functions/paths.js';

/** Shared explicit Custom Function manifest path flag. */
export const customFunctionManifestParameter = {
  kind: 'parsed',
  parse: String,
  brief: 'Path to transcend-functions.yml; defaults inside the target directory',
  optional: true,
} as const;

/** Shared Custom Function manifest variable substitutions flag. */
export const customFunctionVariablesParameter = {
  kind: 'parsed',
  parse: String,
  brief: 'Comma-separated variables to template into the manifest, such as API_KEY:value',
  default: '',
} as const;

/** Shared machine-readable output flag. */
export const customFunctionJsonParameter = {
  kind: 'boolean',
  brief: 'Emit stable JSON output and disable prompts',
  default: false,
} as const;

/** Shared prompt-disabling flag. */
export const customFunctionNoInteractiveParameter = {
  kind: 'boolean',
  brief: 'Disable prompts',
  default: false,
} as const;

/** Shared project preview flag. */
export const customFunctionDryRunParameter = {
  kind: 'boolean',
  brief: 'Preview changes without applying them',
  default: false,
} as const;

/** Shared final-confirmation bypass flag. */
export const customFunctionYesParameter = {
  kind: 'boolean',
  brief: 'Skip only the final plan confirmation',
  default: false,
} as const;

/** Shared positional Custom Function project directory. */
export const customFunctionDirectoryParameter = {
  brief: 'Custom Function project directory',
  placeholder: 'directory',
  parse: String,
  optional: true,
  default: DEFAULT_CUSTOM_FUNCTION_DIRECTORY,
} as const;
