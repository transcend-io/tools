import { relative, sep } from 'node:path';

import { applyEdits, createScanner, modify, parse, type ParseError } from 'jsonc-parser';

import {
  CustomFunctionSetupFeature,
  type CustomFunctionSetup,
  type CustomFunctionSetupFeature as CustomFunctionSetupFeatureType,
} from './model.js';

/**
 * Runtime values of jsonc-parser's ambient const enum, repeated locally
 * because isolated modules cannot access that enum directly.
 */
const JSONC_SYNTAX_KIND = {
  /** Closing object delimiter. */
  CloseBraceToken: 2,
  /** Closing array delimiter. */
  CloseBracketToken: 4,
  /** Single-line comment. */
  LineCommentTrivia: 12,
  /** Block comment. */
  BlockCommentTrivia: 13,
  /** Line break. */
  LineBreakTrivia: 14,
  /** Whitespace. */
  Trivia: 15,
  /** End of input. */
  EOF: 17,
} as const;

/** One JSONC path update. */
interface JsoncUpdate {
  /** Object path. */
  path: (string | number)[];
  /** Desired value. */
  value: unknown;
}

/** Coding-agent project skill target. */
export interface AgentSkillTarget {
  /** Stable CLI identifier. */
  id: string;
  /** Human-readable agent name. */
  displayName: string;
  /** Project-local skills directory. */
  skillsDirectory: string;
  /** Project markers used for detection. */
  projectMarkers: string[];
  /** Home-directory markers used for detection. */
  homeMarkers: string[];
}

/**
 * Project skill locations derived from the MIT-licensed vercel-labs/skills
 * registry. Universal agents intentionally collapse into one target.
 */
export const AGENT_SKILL_TARGETS: readonly AgentSkillTarget[] = [
  {
    id: 'universal',
    displayName: 'Universal agents (Cursor, Codex, Copilot, Gemini, OpenCode, and others)',
    skillsDirectory: '.agents/skills',
    projectMarkers: ['.agents', '.cursor', '.github', '.gemini', '.opencode'],
    homeMarkers: ['.cursor', '.codex', '.copilot', '.gemini', '.config/opencode'],
  },
  {
    id: 'claude-code',
    displayName: 'Claude Code',
    skillsDirectory: '.claude/skills',
    projectMarkers: ['.claude'],
    homeMarkers: ['.claude'],
  },
  {
    id: 'windsurf',
    displayName: 'Windsurf',
    skillsDirectory: '.windsurf/skills',
    projectMarkers: ['.windsurf'],
    homeMarkers: ['.codeium/windsurf'],
  },
  {
    id: 'cline',
    displayName: 'Cline',
    skillsDirectory: '.agents/skills',
    projectMarkers: ['.cline'],
    homeMarkers: ['.cline'],
  },
  {
    id: 'continue',
    displayName: 'Continue',
    skillsDirectory: '.continue/skills',
    projectMarkers: ['.continue'],
    homeMarkers: ['.continue'],
  },
  {
    id: 'roo',
    displayName: 'Roo Code',
    skillsDirectory: '.roo/skills',
    projectMarkers: ['.roo'],
    homeMarkers: ['.roo'],
  },
  {
    id: 'droid',
    displayName: 'Factory Droid',
    skillsDirectory: '.factory/skills',
    projectMarkers: ['.factory'],
    homeMarkers: ['.factory'],
  },
  {
    id: 'devin',
    displayName: 'Devin',
    skillsDirectory: '.devin/skills',
    projectMarkers: ['.devin'],
    homeMarkers: ['.config/devin'],
  },
] as const;

/** Recommended setup independent of repository-specific detection. */
const BASE_RECOMMENDED_FEATURES: readonly CustomFunctionSetupFeatureType[] = [
  CustomFunctionSetupFeature.Deno,
  CustomFunctionSetupFeature.Tasks,
];

/** All optional setup features. */
export const ALL_SETUP_FEATURES = Object.values(CustomFunctionSetupFeature);

/**
 * Resolve setup preset defaults before explicit flag overrides.
 *
 * @param setup - Selected preset
 * @param options - Repository capabilities
 * @returns Selected features
 */
export function resolveSetupFeatures(
  setup: CustomFunctionSetup,
  options: {
    /** Whether a supported coding agent was detected. */
    hasDetectedAgent: boolean;
  },
): CustomFunctionSetupFeatureType[] {
  if (setup === 'none') {
    return [];
  }
  if (setup === 'all') {
    return [...ALL_SETUP_FEATURES];
  }
  return [
    ...BASE_RECOMMENDED_FEATURES,
    ...(options.hasDetectedAgent ? [CustomFunctionSetupFeature.Skill] : []),
  ];
}

/**
 * Apply explicit feature flags after preset resolution.
 *
 * @param features - Preset features
 * @param overrides - Explicit feature overrides
 * @returns Final feature list
 */
export function applySetupFeatureOverrides(
  features: readonly CustomFunctionSetupFeatureType[],
  overrides: Partial<Record<CustomFunctionSetupFeatureType, boolean>>,
): CustomFunctionSetupFeatureType[] {
  const selected = new Set(features);
  Object.entries(overrides).forEach(([feature, enabled]) => {
    if (enabled) {
      selected.add(feature as CustomFunctionSetupFeatureType);
    } else {
      selected.delete(feature as CustomFunctionSetupFeatureType);
    }
  });
  return ALL_SETUP_FEATURES.filter((feature) => selected.has(feature));
}

/**
 * Parse JSONC and fail with a manual-patch-oriented error.
 *
 * @param contents - JSON or JSONC text
 * @param label - Configuration label
 * @returns Parsed value
 */
function parseJsonc(contents: string, label: string): Record<string, unknown> {
  const errors: ParseError[] = [];
  const value = parse(contents, errors, {
    allowTrailingComma: true,
    disallowComments: false,
  }) as unknown;
  if (errors.length > 0 || value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(
      `Cannot safely merge ${label}; fix its JSONC syntax or apply the patch manually.`,
    );
  }
  return value as Record<string, unknown>;
}

/**
 * Infer formatting without reformatting existing content.
 *
 * @param contents - Existing JSONC
 * @returns Formatting settings
 */
function inferFormatting(contents: string): {
  /** Number of spaces per indent. */
  tabSize: number;
  /** Whether indentation uses spaces. */
  insertSpaces: boolean;
  /** Existing line ending. */
  eol: string;
} {
  const indent = contents.match(/\n([ \t]+)"/)?.[1] ?? '  ';
  return {
    tabSize: indent.includes('\t') ? 1 : indent.length,
    insertSpaces: !indent.includes('\t'),
    eol: contents.includes('\r\n') ? '\r\n' : '\n',
  };
}

/**
 * Capture comment text in order.
 *
 * @param contents - JSONC text
 * @returns Comments
 */
function extractComments(contents: string): string[] {
  const scanner = createScanner(contents, false);
  const comments: string[] = [];
  let token = scanner.scan();
  while (token !== JSONC_SYNTAX_KIND.EOF) {
    if (
      token === JSONC_SYNTAX_KIND.LineCommentTrivia ||
      token === JSONC_SYNTAX_KIND.BlockCommentTrivia
    ) {
      comments.push(
        contents.slice(
          scanner.getTokenOffset(),
          scanner.getTokenOffset() + scanner.getTokenLength(),
        ),
      );
    }
    token = scanner.scan();
  }
  return comments;
}

/**
 * Detect the jsonc-parser insertion edge case that can reattach an inline
 * comment from the previous final property.
 *
 * @param contents - Existing JSONC text
 * @returns Whether a guarded manual patch is required
 */
function hasTrailingPropertyComment(contents: string): boolean {
  const scanner = createScanner(contents, false);
  let previousSignificantLine = -1;
  let token = scanner.scan();
  while (token !== JSONC_SYNTAX_KIND.EOF) {
    if (token === JSONC_SYNTAX_KIND.LineCommentTrivia) {
      const hasInlineValue = previousSignificantLine === scanner.getTokenStartLine();
      let next = scanner.scan();
      while (
        next === JSONC_SYNTAX_KIND.Trivia ||
        next === JSONC_SYNTAX_KIND.LineBreakTrivia ||
        next === JSONC_SYNTAX_KIND.LineCommentTrivia ||
        next === JSONC_SYNTAX_KIND.BlockCommentTrivia
      ) {
        next = scanner.scan();
      }
      if (
        hasInlineValue &&
        (next === JSONC_SYNTAX_KIND.CloseBraceToken || next === JSONC_SYNTAX_KIND.CloseBracketToken)
      ) {
        return true;
      }
      token = next;
      continue;
    }
    if (
      token !== JSONC_SYNTAX_KIND.Trivia &&
      token !== JSONC_SYNTAX_KIND.LineBreakTrivia &&
      token !== JSONC_SYNTAX_KIND.BlockCommentTrivia
    ) {
      previousSignificantLine = scanner.getTokenStartLine();
    }
    token = scanner.scan();
  }
  return false;
}

/**
 * Apply surgical JSONC updates while retaining every existing comment.
 *
 * @param contents - Existing contents, or null for a new file
 * @param updates - Ordered updates
 * @param label - Configuration label
 * @returns Updated contents
 */
export function mergeJsonc(
  contents: string | null,
  updates: readonly JsoncUpdate[],
  label: string,
): string {
  let next = contents ?? '{}\n';
  parseJsonc(next, label);
  if (contents !== null && hasTrailingPropertyComment(contents)) {
    throw new Error(
      `Cannot prove comment-preserving edits for ${label}; apply the displayed patch manually.`,
    );
  }
  const originalComments = extractComments(next);
  const formattingOptions = inferFormatting(next);
  updates.forEach(({ path, value }) => {
    next = applyEdits(
      next,
      modify(next, path, value, {
        formattingOptions: {
          ...formattingOptions,
          insertFinalNewline: true,
          keepLines: true,
        },
      }),
    );
  });
  const finalComments = extractComments(next);
  if (
    originalComments.length !== finalComments.length ||
    originalComments.some((comment, index) => finalComments[index] !== comment)
  ) {
    throw new Error(`A comment would move or disappear in ${label}; apply the patch manually.`);
  }
  parseJsonc(next, label);
  return next.endsWith(formattingOptions.eol) ? next : `${next}${formattingOptions.eol}`;
}

/**
 * Merge unique string values without reordering existing entries.
 *
 * @param current - Existing value
 * @param additions - Values to append
 * @returns Merged strings
 */
function mergeStringArray(current: unknown, additions: readonly string[]): string[] {
  const values = Array.isArray(current)
    ? current.filter((value): value is string => typeof value === 'string')
    : [];
  return [...values, ...additions.filter((value) => !values.includes(value))];
}

/**
 * Build target-scoped Deno authoring configuration.
 *
 * @param contents - Existing deno.json/jsonc contents
 * @param contractVersion - Exact authoring-contract version
 * @param includeTasks - Whether to add local tasks
 * @returns Merged configuration
 */
export function mergeDenoConfiguration(
  contents: string | null,
  contractVersion: string,
  includeTasks: boolean,
): string {
  const current = parseJsonc(contents ?? '{}\n', 'Deno configuration');
  const compilerOptions =
    current.compilerOptions &&
    typeof current.compilerOptions === 'object' &&
    !Array.isArray(current.compilerOptions)
      ? (current.compilerOptions as Record<string, unknown>)
      : {};
  const lint =
    current.lint && typeof current.lint === 'object' && !Array.isArray(current.lint)
      ? (current.lint as Record<string, unknown>)
      : {};
  const fmt =
    current.fmt && typeof current.fmt === 'object' && !Array.isArray(current.fmt)
      ? (current.fmt as Record<string, unknown>)
      : {};
  const tasks =
    current.tasks && typeof current.tasks === 'object' && !Array.isArray(current.tasks)
      ? (current.tasks as Record<string, unknown>)
      : {};
  const taskName = 'custom-functions:check';
  const taskCommand =
    'deno check functions/**/*.ts && deno lint functions/ && deno fmt --check functions/ test-payloads/';
  if (includeTasks && tasks[taskName] !== undefined && tasks[taskName] !== taskCommand) {
    throw new Error(
      `Deno task "${taskName}" already has a different command; apply the patch manually.`,
    );
  }
  const updates: JsoncUpdate[] = [
    {
      path: ['imports', '@transcend-io/custom-function-types'],
      value: `npm:@transcend-io/custom-function-types@${contractVersion}`,
    },
    { path: ['compilerOptions', 'strict'], value: true },
    {
      path: ['compilerOptions', 'lib'],
      value: mergeStringArray(compilerOptions.lib, ['deno.ns', 'dom', 'dom.iterable', 'esnext']),
    },
    { path: ['lint', 'include'], value: mergeStringArray(lint.include, ['functions/']) },
    {
      path: ['fmt', 'include'],
      value: mergeStringArray(fmt.include, [
        'functions/',
        'test-payloads/',
        'transcend-functions.yml',
      ]),
    },
    { path: ['fmt', 'singleQuote'], value: true },
    { path: ['fmt', 'lineWidth'], value: 100 },
  ];
  if (includeTasks) {
    updates.push({ path: ['tasks', taskName], value: taskCommand });
  }
  return mergeJsonc(contents, updates, 'Deno configuration');
}

/**
 * Merge VS Code-compatible Deno settings scoped to the target.
 *
 * @param contents - Existing settings JSONC
 * @param repositoryRoot - Repository root
 * @param targetDirectory - Custom Function project directory
 * @returns Merged settings
 */
export function mergeEditorSettings(
  contents: string | null,
  repositoryRoot: string,
  targetDirectory: string,
): string {
  const current = parseJsonc(contents ?? '{}\n', 'editor settings');
  const target = relative(repositoryRoot, targetDirectory).split(sep).join('/') || '.';
  return mergeJsonc(
    contents,
    [
      { path: ['deno.enable'], value: true },
      {
        path: ['deno.enablePaths'],
        value: mergeStringArray(current['deno.enablePaths'], [target]),
      },
    ],
    'editor settings',
  );
}

/**
 * Merge the recommended Deno editor extension.
 *
 * @param contents - Existing extensions JSONC
 * @returns Merged extensions
 */
export function mergeEditorExtensions(contents: string | null): string {
  const current = parseJsonc(contents ?? '{}\n', 'editor extension recommendations');
  return mergeJsonc(
    contents,
    [
      {
        path: ['recommendations'],
        value: mergeStringArray(current.recommendations, ['denoland.vscode-deno']),
      },
    ],
    'editor extension recommendations',
  );
}
