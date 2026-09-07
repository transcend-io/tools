import { CustomFunctionSetup, CustomFunctionTemplate } from './model.js';

/** Common init/new scaffold flags. */
export const customFunctionScaffoldFlagParameters = {
  manifest: {
    kind: 'parsed',
    parse: String,
    brief: 'Path to transcend-functions.yml; defaults inside the target directory',
    optional: true,
  },
  setup: {
    kind: 'enum',
    values: Object.values(CustomFunctionSetup),
    brief: 'Optional repository setup preset',
    optional: true,
  },
  deno: {
    kind: 'boolean',
    brief: 'Create or merge target-scoped Deno configuration',
    optional: true,
  },
  tasks: {
    kind: 'boolean',
    brief: 'Add target-scoped Deno check, lint, and format tasks',
    optional: true,
  },
  packageManager: {
    kind: 'boolean',
    brief: 'Install the exact authoring type package with the detected package manager',
    optional: true,
  },
  editor: {
    kind: 'boolean',
    brief: 'Merge target-scoped Deno editor settings and recommendations',
    optional: true,
  },
  skill: {
    kind: 'boolean',
    brief: 'Install the canonical Custom Function coding-agent skill',
    optional: true,
  },
  ci: {
    kind: 'boolean',
    brief: 'Generate secure GitHub Actions checks and gated deployment',
    optional: true,
  },
  secretDocs: {
    kind: 'boolean',
    brief: 'Document secret names and ignore the local secret file',
    optional: true,
  },
  noInteractive: {
    kind: 'boolean',
    brief: 'Disable prompts and require every missing answer as a flag',
    default: false,
  },
  dryRun: {
    kind: 'boolean',
    brief: 'Preview all changes without writing files or running commands',
    default: false,
  },
  yes: {
    kind: 'boolean',
    brief: 'Skip only the final plan confirmation',
    default: false,
  },
  json: {
    kind: 'boolean',
    brief: 'Emit a stable JSON result and imply non-interactive output',
    default: false,
  },
} as const;

/** Optional scaffold target directory. */
export const customFunctionDirectoryPositionalParameters = {
  kind: 'tuple',
  parameters: [
    {
      brief: 'Custom Function project directory',
      placeholder: 'directory',
      parse: String,
      optional: true,
    },
  ],
} as const;

/** New-command-only flags. */
export const customFunctionNewFlagParameters = {
  ...customFunctionScaffoldFlagParameters,
  name: {
    kind: 'parsed',
    parse: String,
    brief: 'Customer-visible Custom Function display name',
    optional: true,
  },
  template: {
    kind: 'enum',
    values: Object.values(CustomFunctionTemplate),
    brief: 'Generated handler and fixture shape',
    optional: true,
  },
} as const;
