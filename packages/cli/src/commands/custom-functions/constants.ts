import { DEFAULT_CUSTOM_FUNCTION_DIRECTORY } from '../../lib/custom-functions/paths.js';
import { createProjectDirectoryParameter } from '../../lib/scaffolding/command-parameters.js';

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

/** Shared positional Custom Function project directory. */
export const customFunctionDirectoryParameter = createProjectDirectoryParameter({
  projectName: 'Custom Function',
  defaultDirectory: DEFAULT_CUSTOM_FUNCTION_DIRECTORY,
});
