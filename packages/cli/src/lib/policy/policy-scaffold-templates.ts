import yaml from 'js-yaml';

import permissionsPolicyInputSchema from '../../../schema/permissions-policy-input.json' with { type: 'json' };
import { version as CLI_VERSION } from '../../constants.js';

/** Published Permissions API OPA input schema `$id` (raw GitHub URL). */
export const PERMISSIONS_POLICY_INPUT_SCHEMA_ID = permissionsPolicyInputSchema.$id;

/** OPA version targeted by generated policy authoring configuration. */
export const POLICY_STARTER_OPA_VERSION = '1.18.2';

/**
 * Package-path prefix for the disposable starter bundle.
 *
 * Matches OPA `.manifest` `roots` and Regal `project.roots` (not a filesystem
 * folder name by itself). The default publish directory is `{root}-bundle/`;
 * `policy new --bundle-dir` can override that basename.
 */
export const POLICY_STARTER_ROOT = 'example';

/** Publish directory name for the disposable starter (`{root}-bundle`). */
export const POLICY_STARTER_BUNDLE_DIRECTORY = `${POLICY_STARTER_ROOT}-bundle`;

/** Input JSON Schema filename written beside each publish directory's fixtures. */
export const POLICY_INPUT_SCHEMA_FILENAME = 'input.schema.json';

/** One deterministic file in the safe policy starter. */
export interface PolicyStarterFile {
  /** POSIX-style path relative to the policy workspace directory. */
  path: string;
  /** Complete UTF-8 file contents. */
  contents: string;
  /** Human-readable reason shown in the plan. */
  description: string;
}

/** OPA bundle manifest filename used for local authoring and upload. */
export const POLICY_MANIFEST_FILENAME = '.manifest';

/**
 * Remote bundle name reserved for Permissions API.
 *
 * Upload treats every bundle the same; Sombra's Permissions API always queries
 * this fixed name (never taken from the request body).
 */
export const PERMISSIONS_POLICY_BUNDLE_NAME = 'permissions';

/** OPA `.manifest` `metadata` key for Transcend authoring hints. */
export const POLICY_MANIFEST_TRANSCEND_METADATA_KEY = 'transcend.io';

/** Supported policy bundle templates (enum-style constants). */
export const PolicyTemplate = {
  Generic: 'generic',
  Permissions: 'permissions',
} as const;

/** Supported policy bundle template names. */
export const POLICY_TEMPLATE_NAMES = [PolicyTemplate.Generic, PolicyTemplate.Permissions] as const;

/** A supported policy bundle template name. */
export type PolicyTemplateName = (typeof PolicyTemplate)[keyof typeof PolicyTemplate];

/**
 * OPA `.manifest` `metadata.transcend.io` key for the CLI version that
 * generated the scaffold template.
 */
export const POLICY_MANIFEST_TEMPLATE_VERSION_KEY = 'templateVersion';

/**
 * Build an OPA bundle manifest for a given root and scaffold template.
 *
 * `metadata.transcend.io.template` and `templateVersion` are authoring hints
 * only — Policy Engine upload does not branch on them. Permissions API still
 * keys off the remote bundle name {@link PERMISSIONS_POLICY_BUNDLE_NAME}.
 * `templateVersion` records the `@transcend-io/cli` package version used to
 * generate the scaffold.
 *
 * @param root - Package root
 * @param template - Scaffold template that produced this bundle
 * @returns Manifest JSON
 */
export function buildPolicyManifestTemplate(
  root: string,
  template: PolicyTemplateName = PolicyTemplate.Generic,
): string {
  return `{
  "$schema": "https://openpolicyagent.org/schemas/bundle/v1/manifest.schema.json",
  "revision": "",
  "roots": ["${root}"],
  "rego_version": 1,
  "metadata": {
    "${POLICY_MANIFEST_TRANSCEND_METADATA_KEY}": {
      "template": "${template}",
      "${POLICY_MANIFEST_TEMPLATE_VERSION_KEY}": "${CLI_VERSION}"
    }
  }
}
`;
}

/** OPA bundle manifest for the disposable starter publish directory. */
export const POLICY_MANIFEST_TEMPLATE = buildPolicyManifestTemplate(
  POLICY_STARTER_ROOT,
  PolicyTemplate.Generic,
);

/**
 * Build workspace-level Regal configuration for given roots.
 *
 * `project.roots` are package-path prefixes (same meaning as OPA `.manifest`
 * roots), not filesystem folders.
 *
 * @param roots - Package-path roots
 * @returns YAML configuration
 */
export function buildPolicyRegalConfigTemplate(roots: readonly string[]): string {
  const rootsSection =
    roots.length === 0
      ? '  roots: []'
      : `  roots:\n${roots.map((root) => `    - ${root}`).join('\n')}`;
  return `# Workspace-level Regal config for both publishable bundles under this tree.
# \`project.roots\` are package-path prefixes (same meaning as OPA \`.manifest\`
# roots), not filesystem folders. Each bundle also has its own \`.manifest\`.
capabilities:
  from:
    engine: opa
    version: v${POLICY_STARTER_OPA_VERSION}
project:
${rootsSection}
  rego-version: 1
`;
}

/**
 * Merge one package-path root into an existing Regal config without wiping
 * unrelated keys (custom rules, ignores, etc.).
 *
 * Comments and key order may be reformatted by the YAML serializer. Invalid
 * `project.roots` shapes throw instead of silently dropping prior roots.
 *
 * @param existingContents - Current `.regal/config.yaml` contents
 * @param rootToAdd - Package-path root to include
 * @returns Updated file contents and the full roots list
 */
export function mergePolicyRegalConfigRoots(
  existingContents: string,
  rootToAdd: string,
): { contents: string; roots: string[] } {
  const trimmed = existingContents.trim();
  if (trimmed.length === 0) {
    const roots = [rootToAdd];
    return { contents: buildPolicyRegalConfigTemplate(roots), roots };
  }

  let parsed: unknown;
  try {
    parsed = yaml.load(existingContents);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`.regal/config.yaml is not valid YAML: ${detail}`);
  }

  if (parsed === null || parsed === undefined) {
    const roots = [rootToAdd];
    return { contents: buildPolicyRegalConfigTemplate(roots), roots };
  }
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('.regal/config.yaml must be a YAML mapping at the top level.');
  }

  const config = { ...(parsed as Record<string, unknown>) };
  const existingProject = config.project;
  if (
    existingProject !== undefined &&
    existingProject !== null &&
    (typeof existingProject !== 'object' || Array.isArray(existingProject))
  ) {
    throw new Error('.regal/config.yaml project must be a YAML mapping when present.');
  }

  const project: Record<string, unknown> = {
    ...((existingProject as Record<string, unknown> | undefined) ?? {}),
  };
  const existingRoots = project.roots;
  let roots: string[];
  if (existingRoots === undefined) {
    roots = [rootToAdd];
  } else if (
    Array.isArray(existingRoots) &&
    existingRoots.every((root): root is string => typeof root === 'string')
  ) {
    roots = [...new Set([...existingRoots, rootToAdd])].sort((left, right) =>
      left.localeCompare(right),
    );
  } else {
    throw new Error(
      '.regal/config.yaml project.roots must be an array of strings. ' +
        'Fix the Regal config before running `transcend policy new`.',
    );
  }

  project.roots = roots;
  if (project['rego-version'] === undefined) {
    project['rego-version'] = 1;
  }
  config.project = project;

  if (config.capabilities === undefined) {
    config.capabilities = {
      from: {
        engine: 'opa',
        version: `v${POLICY_STARTER_OPA_VERSION}`,
      },
    };
  }

  const dumped = yaml.dump(config, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
  return {
    contents: dumped.endsWith('\n') ? dumped : `${dumped}\n`,
    roots,
  };
}

/**
 * Workspace-level Regal configuration.
 *
 * `project.roots` are package-path prefixes (same meaning as OPA `.manifest`
 * roots), not filesystem folders.
 */
export const POLICY_REGAL_CONFIG_TEMPLATE = buildPolicyRegalConfigTemplate([POLICY_STARTER_ROOT]);

/** Regal config for an empty workspace with no bundles yet. */
export const POLICY_REGAL_CONFIG_EMPTY_TEMPLATE = buildPolicyRegalConfigTemplate([]);

/** Disposable, fail-closed example policy. */
export const POLICY_RESULT_REGO_TEMPLATE = `# METADATA
# title: Disposable example result
# description: |
#   A fail-closed teaching entrypoint. Replace this example with the document
#   tree and result contract required by your application.
# scope: package
# entrypoint: true
package ${POLICY_STARTER_ROOT}.result

import rego.v1

default decision := "deny"

decision := "allow" if {
	input.subject.trusted == true
}

default reason_code := "untrusted_or_invalid_input"

reason_code := "trusted_subject" if {
	decision == "allow"
}
`;

/** Executable tests adjacent to the disposable example policy. */
export const POLICY_RESULT_TEST_REGO_TEMPLATE = `package ${POLICY_STARTER_ROOT}.result_test

import data.${POLICY_STARTER_ROOT}.result
import rego.v1

test_denies_untrusted_subject if {
	result.decision == "deny" with input as {"subject": {"trusted": false}}
	result.reason_code == "untrusted_or_invalid_input" with input as {"subject": {"trusted": false}}
}

test_fails_closed_for_missing_subject if {
	result.decision == "deny" with input as {}
	result.reason_code == "untrusted_or_invalid_input" with input as {}
}

test_allows_trusted_subject if {
	result.decision == "allow" with input as {"subject": {"trusted": true}}
	result.reason_code == "trusted_subject" with input as {"subject": {"trusted": true}}
}
`;

/** Sanitized local input example containing no credentials or personal data. */
export const POLICY_INPUT_EXAMPLE_TEMPLATE = `{
  "subject": {
    "trusted": false
  }
}
`;

/** Input JSON Schema for the disposable starter (editor + \`opa check -s\`). */
export const POLICY_INPUT_SCHEMA_TEMPLATE = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://transcend.io/policy-schemas/${POLICY_STARTER_ROOT}/input.json",
  "title": "Example policy input",
  "description": "Disposable teaching envelope for the example bundle.",
  "type": "object",
  "additionalProperties": true,
  "properties": {
    "subject": {
      "type": "object",
      "additionalProperties": true,
      "properties": {
        "trusted": {
          "type": "boolean",
          "description": "When true, the example policy allows; otherwise it denies."
        }
      }
    }
  }
}
`;

/** Target-local ignore rules for private evaluation input only. */
export const POLICY_GITIGNORE_TEMPLATE = `# Local policy evaluation input (VS Code / Regal look for input.json here).
/input.json
`;

/** Concise workspace-local authoring guide (multi-bundle, empty workspace). */
export const POLICY_README_TEMPLATE = `# Transcend Policy

Multi-bundle workspace for Transcend Policy Engine bundles
(OPA / Rego v1). Requires **Transcend CLI ≥ 11** (\`transcend policy --help\`
should list \`init\`, \`new\`, and positional \`[directory]\` args).

Each \`*-bundle/\` directory is a separate publishable unit (own \`.manifest\`,
input, and query path). Add a new bundle with:

\`\`\`sh
transcend policy new
\`\`\`

## Quick start

\`\`\`sh
transcend policy init                   # create the workspace
transcend policy new --template generic # add a bundle from a template

transcend policy check --noInteractive
transcend policy test
transcend policy eval transcend/policy/example-bundle \\
  --package=data.example.result \\
  --input=transcend/policy/example-bundle/input.json
\`\`\`

\`policy new\` also writes a gitignored \`input.json\` (copy of \`input.example.json\`)
for local Evaluate. \`policy check\` / \`policy test\` default to every child with a
\`.manifest\` and use bundle-mode \`opa test -b\`, so both input files can coexist
without a merge error.

## Layout

\`\`\`
transcend/policy/
  example-bundle/               # publish directory (added by policy new)
    example/                    # package root (matches .manifest roots)
    input.example.json
    input.json                  # local only (gitignored)
    input.schema.json           # input JSON Schema (editor + opa --schema)
  .regal/config.yaml
\`\`\`

Replace or delete example bundles when you have a real policy. Publish each
bundle separately (\`transcend policy publish --remote-bundle-name … <dir>\`).

## Permissions API

Scaffold the Permissions starter, then simulate the query Sombra runs:

\`\`\`sh
transcend policy new \\
  --template permissions \\
  --name ${PERMISSIONS_POLICY_BUNDLE_NAME} \\
  --bundle-dir ${PERMISSIONS_POLICY_BUNDLE_NAME}-bundle \\
  --yes

transcend policy eval transcend/policy/${PERMISSIONS_POLICY_BUNDLE_NAME}-bundle \\
  --package=data.${PERMISSIONS_POLICY_BUNDLE_NAME}.purposes \\
  --input=transcend/policy/${PERMISSIONS_POLICY_BUNDLE_NAME}-bundle/input.json \\
  --schema=transcend/policy/${PERMISSIONS_POLICY_BUNDLE_NAME}-bundle/input.schema.json
\`\`\`

Upload does **not** distinguish bundle kinds. What makes a bundle “Permissions”
is the remote name plus where Sombra queries it:

- **Permissions API** always loads the fixed remote bundle name
  \`${PERMISSIONS_POLICY_BUNDLE_NAME}\`. Publish that starter with
  \`--remote-bundle-name=${PERMISSIONS_POLICY_BUNDLE_NAME}\`.
- **Generic / decide** bundles use any other \`--remote-bundle-name\` and the decide
  path.

Scaffolded \`.manifest\` files may include \`metadata.transcend.io.template\`
(\`generic\` or \`permissions\`) and \`templateVersion\` (the \`@transcend-io/cli\`
version that generated the scaffold) as authoring hints. Upload ignores them;
\`policy publish\` may warn when the template hint and \`--remote-bundle-name\` disagree.
`;

/** Workspace-relative path to the disposable example entrypoint. */
export const POLICY_STARTER_RESULT_REGO_PATH = `${POLICY_STARTER_BUNDLE_DIRECTORY}/${POLICY_STARTER_ROOT}/result/result.rego`;

/** Workspace-relative path to the disposable example tests. */
export const POLICY_STARTER_RESULT_TEST_REGO_PATH = `${POLICY_STARTER_BUNDLE_DIRECTORY}/${POLICY_STARTER_ROOT}/result/result_test.rego`;

/** Complete safe starter in deterministic plan order. */
const POLICY_STARTER_FILES: readonly PolicyStarterFile[] = [
  {
    path: `${POLICY_STARTER_BUNDLE_DIRECTORY}/${POLICY_MANIFEST_FILENAME}`,
    contents: POLICY_MANIFEST_TEMPLATE,
    description: 'Create the OPA bundle .manifest',
  },
  {
    path: '.regal/config.yaml',
    contents: POLICY_REGAL_CONFIG_TEMPLATE,
    description: `Pin strict Rego v1 linting to OPA ${POLICY_STARTER_OPA_VERSION} capabilities`,
  },
  {
    path: `${POLICY_STARTER_BUNDLE_DIRECTORY}/${POLICY_INPUT_SCHEMA_FILENAME}`,
    contents: POLICY_INPUT_SCHEMA_TEMPLATE,
    description: 'Create the input JSON Schema for the example bundle',
  },
  {
    path: POLICY_STARTER_RESULT_REGO_PATH,
    contents: POLICY_RESULT_REGO_TEMPLATE,
    description: 'Create a documented fail-closed result entrypoint',
  },
  {
    path: POLICY_STARTER_RESULT_TEST_REGO_PATH,
    contents: POLICY_RESULT_TEST_REGO_TEMPLATE,
    description: 'Create executable tests for allow and fail-closed decisions',
  },
  {
    path: `${POLICY_STARTER_BUNDLE_DIRECTORY}/input.example.json`,
    contents: POLICY_INPUT_EXAMPLE_TEMPLATE,
    description: 'Create a sanitized local evaluation input',
  },
  {
    path: `${POLICY_STARTER_BUNDLE_DIRECTORY}/.gitignore`,
    contents: POLICY_GITIGNORE_TEMPLATE,
    description: 'Ignore only the private local input file',
  },
  {
    path: 'README.md',
    contents: POLICY_README_TEMPLATE,
    description: 'Create the concise policy project guide',
  },
];

/**
 * Generate an independent copy of the safe policy starter.
 *
 * @returns Deterministic relative files
 */
export function generatePolicyStarterFiles(): PolicyStarterFile[] {
  return POLICY_STARTER_FILES.map((file) => ({ ...file }));
}

// ---------------------------------------------------------------------------
// Workspace-only init files (no bundles)
// ---------------------------------------------------------------------------

/** Files created by `policy init` — empty workspace only. */
const POLICY_INIT_WORKSPACE_FILES: readonly PolicyStarterFile[] = [
  {
    path: '.regal/config.yaml',
    contents: POLICY_REGAL_CONFIG_EMPTY_TEMPLATE,
    description: `Pin strict Rego v1 linting to OPA ${POLICY_STARTER_OPA_VERSION} capabilities`,
  },
  {
    path: 'README.md',
    contents: POLICY_README_TEMPLATE,
    description: 'Create the concise multi-bundle workspace guide',
  },
];

/**
 * Generate files for an empty workspace (init without bundles).
 *
 * @returns Deterministic workspace files
 */
export function generatePolicyWorkspaceFiles(): PolicyStarterFile[] {
  return POLICY_INIT_WORKSPACE_FILES.map((file) => ({ ...file }));
}

// ---------------------------------------------------------------------------
// Policy bundle templates (used by `policy new`)
// ---------------------------------------------------------------------------

/** Interactive labels for each policy template. */
export const POLICY_TEMPLATE_PROMPT_LABELS: Record<PolicyTemplateName, string> = {
  [PolicyTemplate.Generic]: 'Generic example',
  [PolicyTemplate.Permissions]: 'Permission API starter',
};

/** Default root names for each template. */
export const POLICY_TEMPLATE_DEFAULT_ROOTS: Record<PolicyTemplateName, string> = {
  [PolicyTemplate.Generic]: 'example',
  [PolicyTemplate.Permissions]: PERMISSIONS_POLICY_BUNDLE_NAME,
};

/**
 * Build the bundle directory name from a root.
 *
 * @param root - Package root
 * @returns Bundle directory name
 */
export function buildBundleDirectoryName(root: string): string {
  return `${root}-bundle`;
}

/**
 * Validate a local bundle directory basename (under the policy workspace).
 *
 * @param value - Proposed directory basename
 * @returns True or error message
 */
export function validateBundleDirectoryName(value: string): true | string {
  if (!value) {
    return 'Enter a bundle directory name.';
  }
  if (value === '.' || value === '..' || value.includes('/') || value.includes('\\')) {
    return 'Bundle directory must be a single path segment (no slashes).';
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(value)) {
    return 'Bundle directory must be alphanumeric (plus ., _, -), e.g. "my-bundle".';
  }
  if (value.length > 128) {
    return 'Bundle directory cannot exceed 128 characters.';
  }
  return true;
}

/**
 * Generate bundle files for the generic template.
 *
 * @param root - Package root name
 * @param bundleDir - Publish directory basename under the workspace
 * @returns Bundle files relative to the workspace
 */
export function generateGenericBundleFiles(
  root: string,
  bundleDir: string = buildBundleDirectoryName(root),
): PolicyStarterFile[] {
  const bundle = bundleDir;
  return [
    {
      path: `${bundle}/${POLICY_MANIFEST_FILENAME}`,
      contents: buildPolicyManifestTemplate(root, PolicyTemplate.Generic),
      description: 'Create the OPA bundle .manifest',
    },
    {
      path: `${bundle}/${POLICY_INPUT_SCHEMA_FILENAME}`,
      contents: `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://transcend.io/policy-schemas/${root}/input.json",
  "title": "${root === 'example' ? 'Example policy input' : `${root} policy input`}",
  "description": "${root === 'example' ? 'Disposable teaching envelope for the example bundle.' : `Input envelope for the ${root} bundle.`}",
  "type": "object",
  "additionalProperties": true,
  "properties": {
    "subject": {
      "type": "object",
      "additionalProperties": true,
      "properties": {
        "trusted": {
          "type": "boolean",
          "description": "When true, the ${root === 'example' ? 'example' : root} policy allows; otherwise it denies."
        }
      }
    }
  }
}
`,
      description: `Create the input JSON Schema for the ${root} bundle`,
    },
    {
      path: `${bundle}/${root}/result/result.rego`,
      contents: `# METADATA
# title: ${root === 'example' ? 'Disposable example result' : `${root} result`}
# description: |
#   A fail-closed ${root === 'example' ? 'teaching ' : ''}entrypoint. Replace this ${root === 'example' ? 'example ' : ''}with the document
#   tree and result contract required by your application.
# scope: package
# entrypoint: true
package ${root}.result

import rego.v1

default decision := "deny"

decision := "allow" if {
\tinput.subject.trusted == true
}

default reason_code := "untrusted_or_invalid_input"

reason_code := "trusted_subject" if {
\tdecision == "allow"
}
`,
      description: 'Create a documented fail-closed result entrypoint',
    },
    {
      path: `${bundle}/${root}/result/result_test.rego`,
      contents: `package ${root}.result_test

import data.${root}.result
import rego.v1

test_denies_untrusted_subject if {
\tresult.decision == "deny" with input as {"subject": {"trusted": false}}
\tresult.reason_code == "untrusted_or_invalid_input" with input as {"subject": {"trusted": false}}
}

test_fails_closed_for_missing_subject if {
\tresult.decision == "deny" with input as {}
\tresult.reason_code == "untrusted_or_invalid_input" with input as {}
}

test_allows_trusted_subject if {
\tresult.decision == "allow" with input as {"subject": {"trusted": true}}
\tresult.reason_code == "trusted_subject" with input as {"subject": {"trusted": true}}
}
`,
      description: 'Create executable tests for allow and fail-closed decisions',
    },
    {
      path: `${bundle}/input.example.json`,
      contents: POLICY_INPUT_EXAMPLE_TEMPLATE,
      description: 'Create a sanitized local evaluation input example',
    },
    {
      path: `${bundle}/input.json`,
      contents: POLICY_INPUT_EXAMPLE_TEMPLATE,
      description: 'Create a local evaluation input (gitignored copy of the example)',
    },
    {
      path: `${bundle}/.gitignore`,
      contents: POLICY_GITIGNORE_TEMPLATE,
      description: 'Ignore only the private local input file',
    },
  ];
}

/**
 * Generate bundle files for the permissions template.
 *
 * @param root - Package root name
 * @returns Bundle files relative to the workspace
 */
/**
 * Serialize the published Permissions input schema for the local bundle path.
 *
 * Written as `{bundle}/input.schema.json` so editors and `opa --schema` can
 * type-check the envelope offline without a workspace `schemas/` directory.
 *
 * @returns Schema file contents ending in a trailing newline
 */
export function buildPermissionsInputSchemaContents(): string {
  return `${JSON.stringify(permissionsPolicyInputSchema, null, 2)}\n`;
}

/**
 * Serialize the published Permissions input example for local evaluation.
 *
 * @returns Example input JSON ending in a trailing newline
 */
export function buildPermissionsInputExampleContents(): string {
  const [example] = permissionsPolicyInputSchema.examples;
  if (!example) {
    throw new Error('permissions-policy-input.json must declare at least one example');
  }
  return `${JSON.stringify(example, null, 2)}\n`;
}

/**
 * Generate bundle files for the permissions template.
 *
 * @param root - Package root name
 * @param bundleDir - Publish directory basename under the workspace
 * @returns Bundle files relative to the workspace
 */
export function generatePermissionsBundleFiles(
  root: string,
  bundleDir: string = buildBundleDirectoryName(root),
): PolicyStarterFile[] {
  const bundle = bundleDir;
  const inputExample = buildPermissionsInputExampleContents();
  return [
    {
      path: `${bundle}/${POLICY_MANIFEST_FILENAME}`,
      contents: buildPolicyManifestTemplate(root, PolicyTemplate.Permissions),
      description: 'Create the OPA bundle .manifest',
    },
    {
      path: `${bundle}/${POLICY_INPUT_SCHEMA_FILENAME}`,
      contents: buildPermissionsInputSchemaContents(),
      description: `Create the input JSON Schema for the ${root} bundle (from published permissions-policy-input.json)`,
    },
    {
      path: `${bundle}/${root}/config/config.rego`,
      contents: `# METADATA
# title: Permissions config
# description: |
#   Static bundle configuration. Values come from data.json in this directory.
package ${root}.config

import rego.v1
`,
      description: 'Create the static bundle configuration package',
    },
    {
      path: `${bundle}/${root}/config/data.json`,
      contents: `{
  "default_consent_allowed": true,
  "purposes": [
    "Analytics",
    "SaleOfInfo"
  ],
  "default_consent": {}
}
`,
      description: 'Create the static purpose configuration data',
    },
    {
      path: `${bundle}/${root}/helpers/preference/preference.rego`,
      contents: `# METADATA
# title: Purpose preference resolution
# description: |
#   Resolves the subject's recorded choice for one purpose from the OPA
#   \`input.preferences\` array Sombra injects (one \`{name, choice,
#   days_since_choice?}\` entry per purpose; \`choice\` may be null when unset).
package ${root}.helpers.preference

import rego.v1

import data.${root}.config

raw_preferences := object.get(input, "preferences", [])

source_available if {
\tis_array(raw_preferences)
\tevery entry in raw_preferences {
\t\tis_object(entry)
\t\tis_string(entry.name)
\t\tentry.name != ""
\t}
}

# Boolean choice for a purpose, last-wins across duplicate entries (matching
# Sombra's own dedup semantics). Returns the boolean only when a usable choice
# exists; otherwise the rule is undefined and the purpose is undecided.
choice(name) := choice if {
\tsource_available
\tmatching := [entry | some entry in raw_preferences; entry.name == name]
\tcount(matching) > 0
\tlast := matching[count(matching) - 1]
\tchoice := object.get(last, "choice", null)
\tis_boolean(choice)
}

enabled(name) if choice(name) == true

disabled(name) if choice(name) == false

decided(name) if enabled(name)

decided(name) if disabled(name)

# A configured purpose with no usable boolean choice is undecided: the subject
# never chose, so the resolved default applies (not an opt-out).
undecided(name) if {
\tname in config.purposes
\tnot enabled(name)
\tnot disabled(name)
}
`,
      description: 'Create purpose preference resolution helpers',
    },
    {
      path: `${bundle}/${root}/helpers/preference/preference_test.rego`,
      contents: `# Mechanical tests for purpose preference resolution.
# Policy outcomes are tested beside the public entrypoint.
package ${root}.helpers.preference_test

import rego.v1

import data.${root}.helpers.preference

given(preferences) := {"preferences": preferences}

test_treats_an_absent_preferences_array_as_no_recorded_choices if {
\tfixture := {}

\tpreference.source_available with input as fixture
\tpreference.undecided("Analytics") with input as fixture
}

test_accepts_an_empty_preferences_array if {
\tfixture := given([])

\tpreference.source_available with input as fixture
\tpreference.undecided("Analytics") with input as fixture
}

test_reports_a_non_array_preferences_as_unavailable if {
\tnot preference.source_available with input as {"preferences": {"Analytics": true}}
}

test_reports_entries_without_a_usable_name_as_unavailable if {
\tnot preference.source_available with input as {"preferences": [{}]}
\tnot preference.source_available with input as {"preferences": [{"name": ""}]}
\tnot preference.source_available with input as {"preferences": [{"choice": true}]}
}

test_distinguishes_enabled_and_disabled_choices if {
\tfixture := given([
\t\t{"name": "Analytics", "choice": true},
\t\t{"name": "SaleOfInfo", "choice": false},
\t])

\tpreference.enabled("Analytics") with input as fixture
\tpreference.disabled("SaleOfInfo") with input as fixture
\tpreference.decided("Analytics") with input as fixture
\tpreference.decided("SaleOfInfo") with input as fixture
\tnot preference.undecided("Analytics") with input as fixture
}

test_treats_a_null_choice_as_undecided if {
\tfixture := given([{"name": "Analytics", "choice": null}])

\tpreference.undecided("Analytics") with input as fixture
\tnot preference.decided("Analytics") with input as fixture
}

test_treats_an_absent_choice_key_as_undecided if {
\tfixture := given([{"name": "Analytics", "channel": "email"}])

\tpreference.undecided("Analytics") with input as fixture
}

test_treats_a_non_boolean_choice_as_undecided if {
\tfixture := given([{"name": "SaleOfInfo", "choice": "Daily"}])

\tpreference.undecided("SaleOfInfo") with input as fixture
\tnot preference.decided("SaleOfInfo") with input as fixture
}

# Sombra dedupes by purpose before sending; last-wins keeps the bundle correct
# against hand-crafted input that names the same purpose twice.
test_last_wins_on_duplicate_entries if {
\tfixture := given([
\t\t{"name": "SaleOfInfo", "choice": true},
\t\t{"name": "SaleOfInfo", "choice": false},
\t])

\tpreference.disabled("SaleOfInfo") with input as fixture
\tnot preference.enabled("SaleOfInfo") with input as fixture
}

# Extra fields on an entry (evidence, days_since_choice, channel) are ignored
# rather than treated as a choice.
test_ignores_fields_beyond_the_recorded_choice if {
\tfixture := given([{
\t\t"name": "Analytics",
\t\t"choice": true,
\t\t"evidence": "consent_banner",
\t\t"days_since_choice": 45,
\t\t"channel": "email",
\t}])

\tpreference.enabled("Analytics") with input as fixture
}
`,
      description: 'Create preference resolution tests',
    },
    {
      path: `${bundle}/${root}/purposes/analytics/analytics.rego`,
      contents: `# METADATA
# title: Analytics purpose decision
# description: |
#   The Analytics purpose's verdict as a \`result\` document
#   (\`data.${root}.purposes.analytics.result\`).
package ${root}.purposes.analytics

import rego.v1

import data.${root}.helpers.preference

default result := {
\t"decision": "deny",
\t"reason_code": "default_deny",
}

result := {
\t"decision": "allow",
\t"reason_code": "explicit_allow",
} if {
\tpreference.enabled("Analytics")
}

result := {
\t"decision": "deny",
\t"reason_code": "explicit_deny",
} if {
\tpreference.disabled("Analytics")
}

result := {
\t"decision": "allow",
\t"reason_code": "default_allow",
} if {
\tpreference.undecided("Analytics")
}
`,
      description: 'Create the analytics purpose decision rule',
    },
    {
      path: `${bundle}/${root}/purposes/analytics/analytics_test.rego`,
      contents: `# Policy outcomes for the Analytics purpose (the queried document).
package ${root}.purposes.analytics_test

import rego.v1

import data.${root}.purposes.analytics

given(preferences) := {"preferences": preferences}

test_explicit_allow if {
\tresult := analytics.result with input as given([{"name": "Analytics", "choice": true}])
\tresult == {
\t\t"decision": "allow",
\t\t"reason_code": "explicit_allow",
\t}
}

test_explicit_deny if {
\tresult := analytics.result with input as given([{"name": "Analytics", "choice": false}])
\tresult == {
\t\t"decision": "deny",
\t\t"reason_code": "explicit_deny",
\t}
}

test_undecided_resolves_to_default_allow if {
\tresult := analytics.result with input as given([])
\tresult == {
\t\t"decision": "allow",
\t\t"reason_code": "default_allow",
\t}
}

test_missing_preferences_resolves_to_default_allow if {
\tresult := analytics.result with input as {}
\tresult == {
\t\t"decision": "allow",
\t\t"reason_code": "default_allow",
\t}
}

test_non_boolean_choice_falls_back_to_default_allow if {
\tresult := analytics.result with input as given([{"name": "Analytics", "choice": "yes"}])
\tresult == {
\t\t"decision": "allow",
\t\t"reason_code": "default_allow",
\t}
}

test_malformed_preferences_are_treated_as_undecided if {
\t# source_available is false, so enabled/disabled never fire; undecided still
\t# holds for configured purposes (not enabled and not disabled).
\tresult := analytics.result with input as {"preferences": {"Analytics": true}}
\tresult == {
\t\t"decision": "allow",
\t\t"reason_code": "default_allow",
\t}
}
`,
      description: 'Create analytics purpose decision tests',
    },
    {
      path: `${bundle}/${root}/purposes/entrypoint.rego`,
      contents: `# METADATA
# title: Purpose decisions
# description: Returns each purpose's decision and reason code.
# scope: package
# entrypoint: true
package ${root}.purposes

import rego.v1
`,
      description: 'Create the purposes entrypoint',
    },
    {
      path: `${bundle}/input.example.json`,
      contents: inputExample,
      description: 'Create a sanitized permissions evaluation input example',
    },
    {
      path: `${bundle}/input.json`,
      contents: inputExample,
      description: 'Create a local evaluation input (gitignored copy of the example)',
    },
    {
      path: `${bundle}/.gitignore`,
      contents: POLICY_GITIGNORE_TEMPLATE,
      description: 'Ignore only the private local input file',
    },
  ];
}

/**
 * Generate bundle files for a given template and root.
 *
 * @param template - Template name
 * @param root - Package root name
 * @param bundleDir - Publish directory basename under the workspace
 * @returns Bundle files relative to the workspace
 */
export function generatePolicyBundleFiles(
  template: PolicyTemplateName,
  root: string,
  bundleDir: string = buildBundleDirectoryName(root),
): PolicyStarterFile[] {
  switch (template) {
    case PolicyTemplate.Generic:
      return generateGenericBundleFiles(root, bundleDir);
    case PolicyTemplate.Permissions:
      return generatePermissionsBundleFiles(root, bundleDir);
    default:
      throw new Error(`Unknown policy template: ${String(template)}`);
  }
}

/**
 * Build the suggested `policy eval` follow-up after `policy new`.
 *
 * @param options - Bundle display path, package root, and template
 * @returns Multi-line shell command ready to paste
 */
export function buildPolicyBundleEvalNextStep(options: {
  /** Workspace-relative publish directory (e.g. `transcend/policy/permissions-bundle`). */
  bundleDirectory: string;
  /** Rego / `.manifest` package root. */
  root: string;
  /** Scaffold template that determined the query path. */
  template: PolicyTemplateName;
}): string {
  const { bundleDirectory, root, template } = options;
  const packagePath =
    template === PolicyTemplate.Permissions ? `data.${root}.purposes` : `data.${root}.result`;
  return [
    `transcend policy eval ${bundleDirectory} \\`,
    `  --package=${packagePath} \\`,
    `  --input=${bundleDirectory}/input.json \\`,
    `  --schema=${bundleDirectory}/${POLICY_INPUT_SCHEMA_FILENAME}`,
  ].join('\n');
}
