/** OPA version targeted by generated policy authoring configuration. */
export const POLICY_STARTER_OPA_VERSION = '1.13.1';

/**
 * Package-path prefix for the disposable starter bundle.
 *
 * Matches OPA `.manifest` `roots` and Regal `project.roots` (not a filesystem
 * folder name by itself). The publish directory is `{root}-bundle/`.
 */
export const POLICY_STARTER_ROOT = 'example';

/** Publish directory name for the disposable starter (`{root}-bundle`). */
export const POLICY_STARTER_BUNDLE_DIRECTORY = `${POLICY_STARTER_ROOT}-bundle`;

/** One deterministic file in the safe policy starter. */
export interface PolicyStarterFile {
  /** POSIX-style path relative to the policy workspace directory. */
  path: string;
  /** Complete UTF-8 file contents. */
  contents: string;
  /** Human-readable reason shown in the plan. */
  description: string;
}

/** OPA bundle manifest filename used for local authoring. */
export const POLICY_MANIFEST_FILENAME = '.manifest';

/** Upload archive entry name expected by the Policy Engine API. */
export const POLICY_UPLOAD_MANIFEST_FILENAME = 'manifest.json';

/**
 * Build an OPA bundle manifest for a given root.
 *
 * @param root - Package root
 * @returns Manifest JSON
 */
export function buildPolicyManifestTemplate(root: string): string {
  return `{
  "$schema": "https://openpolicyagent.org/schemas/bundle/v1/manifest.schema.json",
  "revision": "",
  "roots": ["${root}"],
  "rego_version": 1
}
`;
}

/** OPA bundle manifest for the disposable starter publish directory. */
export const POLICY_MANIFEST_TEMPLATE = buildPolicyManifestTemplate(POLICY_STARTER_ROOT);

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
# schemas:
#   - input: schema.${POLICY_STARTER_ROOT}.input
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

Multi-bundle workspace for [Transcend Policy Engine](https://docs.transcend.io) bundles
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

transcend policy lint --noInteractive
transcend policy test
transcend policy eval transcend/policy/example-bundle \\
  --pkg data.example.result \\
  --input transcend/policy/example-bundle/input.json
\`\`\`

\`policy new\` also writes a gitignored \`input.json\` (copy of \`input.example.json\`)
for local Evaluate. \`policy lint\` / \`policy test\` default to every child with a
\`.manifest\` and use bundle-mode \`opa test -b\`, so both input files can coexist
without a merge error.

## Layout

\`\`\`
transcend/policy/
  example-bundle/               # publish directory (added by policy new)
    example/                    # package root (matches .manifest roots)
    input.example.json
    input.json                  # local only (gitignored)
  schemas/                      # input JSON Schemas (editor + opa check -s)
  .regal/config.yaml
\`\`\`

Replace or delete example bundles when you have a real policy. Publish each
bundle separately (\`transcend policy publish --bundle-name … <dir>\`).
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
    description: 'Pin strict Rego v1 linting to OPA 1.13.1 capabilities',
  },
  {
    path: `schemas/${POLICY_STARTER_ROOT}/input.json`,
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
    description: 'Pin strict Rego v1 linting to OPA 1.13.1 capabilities',
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

/** Supported policy bundle template names. */
export const POLICY_TEMPLATE_NAMES = ['generic', 'permissions'] as const;

/** A supported policy bundle template name. */
export type PolicyTemplateName = (typeof POLICY_TEMPLATE_NAMES)[number];

/** Interactive labels for each policy template. */
export const POLICY_TEMPLATE_PROMPT_LABELS: Record<PolicyTemplateName, string> = {
  generic: 'Generic example',
  permissions: 'Permission API starter',
};

/** Default root names for each template. */
export const POLICY_TEMPLATE_DEFAULT_ROOTS: Record<PolicyTemplateName, string> = {
  generic: 'example',
  permissions: 'permissions',
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
 * Generate bundle files for the generic template.
 *
 * @param root - Package root name
 * @returns Bundle files relative to the workspace
 */
export function generateGenericBundleFiles(root: string): PolicyStarterFile[] {
  const bundle = buildBundleDirectoryName(root);
  return [
    {
      path: `${bundle}/${POLICY_MANIFEST_FILENAME}`,
      contents: buildPolicyManifestTemplate(root),
      description: 'Create the OPA bundle .manifest',
    },
    {
      path: `schemas/${root}/input.json`,
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
# schemas:
#   - input: schema.${root}.input
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
export function generatePermissionsBundleFiles(root: string): PolicyStarterFile[] {
  const bundle = buildBundleDirectoryName(root);
  const inputExample = `{
  "request_id": "req-1",
  "preferences": [
    {
      "name": "marketing",
      "choice": true,
      "days_since_choice": 45
    },
    {
      "name": "analytics",
      "choice": false,
      "days_since_choice": 12
    },
    {
      "name": "product_updates",
      "choice": true
    }
  ],
  "context": {
    "region": "US",
    "surface": "web"
  }
}
`;
  return [
    {
      path: `${bundle}/${POLICY_MANIFEST_FILENAME}`,
      contents: buildPolicyManifestTemplate(root),
      description: 'Create the OPA bundle .manifest',
    },
    {
      path: `schemas/${root}/input.json`,
      contents: `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://transcend.io/policy-schemas/${root}/input.json",
  "title": "Permissions policy input",
  "description": "Envelope Sombra injects for the Permissions / default-consent path.",
  "type": "object",
  "additionalProperties": true,
  "properties": {
    "request_id": {
      "type": "string",
      "description": "Optional caller id; not required by V0 decision rules."
    },
    "preferences": {
      "type": "array",
      "description": "One entry per purpose with an explicit choice (Sombra dedupes by purpose).",
      "items": {
        "type": "object",
        "additionalProperties": true,
        "required": ["name"],
        "properties": {
          "name": {
            "type": "string",
            "minLength": 1,
            "description": "Purpose name (e.g. analytics, marketing)."
          },
          "choice": {
            "description": "Boolean opt-in/out; null or omitted means undecided.",
            "type": ["boolean", "null"]
          },
          "days_since_choice": {
            "type": "number",
            "minimum": 0,
            "description": "Accepted on input; ignored by V0 rules."
          }
        }
      }
    },
    "context": {
      "type": "object",
      "additionalProperties": true,
      "description": "Optional caller context; forwarded verbatim, unread by V0 rules."
    }
  }
}
`,
      description: `Create the input JSON Schema for the ${root} bundle`,
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
    "analytics",
    "marketing",
    "personalization",
    "research"
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
#   days_since_choice?}\` entry per purpose with an explicit choice).
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
\tpreference.undecided("marketing") with input as fixture
}

test_accepts_an_empty_preferences_array if {
\tfixture := given([])

\tpreference.source_available with input as fixture
\tpreference.undecided("marketing") with input as fixture
}

test_reports_a_non_array_preferences_as_unavailable if {
\tnot preference.source_available with input as {"preferences": {"marketing": true}}
}

test_reports_entries_without_a_usable_name_as_unavailable if {
\tnot preference.source_available with input as {"preferences": [{}]}
\tnot preference.source_available with input as {"preferences": [{"name": ""}]}
\tnot preference.source_available with input as {"preferences": [{"choice": true}]}
}

test_distinguishes_enabled_and_disabled_choices if {
\tfixture := given([
\t\t{"name": "marketing", "choice": true},
\t\t{"name": "analytics", "choice": false},
\t])

\tpreference.enabled("marketing") with input as fixture
\tpreference.disabled("analytics") with input as fixture
\tpreference.decided("marketing") with input as fixture
\tpreference.decided("analytics") with input as fixture
\tnot preference.undecided("marketing") with input as fixture
}

test_treats_a_null_choice_as_undecided if {
\tfixture := given([{"name": "marketing", "choice": null}])

\tpreference.undecided("marketing") with input as fixture
\tnot preference.decided("marketing") with input as fixture
}

test_treats_an_absent_choice_key_as_undecided if {
\tfixture := given([{"name": "marketing", "channel": "email"}])

\tpreference.undecided("marketing") with input as fixture
}

test_treats_a_non_boolean_choice_as_undecided if {
\tfixture := given([{"name": "personalization", "choice": "Daily"}])

\tpreference.undecided("personalization") with input as fixture
\tnot preference.decided("personalization") with input as fixture
}

# Sombra dedupes by purpose before sending; last-wins keeps the bundle correct
# against hand-crafted input that names the same purpose twice.
test_last_wins_on_duplicate_entries if {
\tfixture := given([
\t\t{"name": "research", "choice": true},
\t\t{"name": "research", "choice": false},
\t])

\tpreference.disabled("research") with input as fixture
\tnot preference.enabled("research") with input as fixture
}

# Extra fields on an entry (evidence, days_since_choice, channel) are ignored
# rather than treated as a choice.
test_ignores_fields_beyond_the_recorded_choice if {
\tfixture := given([{
\t\t"name": "marketing",
\t\t"choice": true,
\t\t"evidence": "consent_banner",
\t\t"days_since_choice": 45,
\t\t"channel": "email",
\t}])

\tpreference.enabled("marketing") with input as fixture
}
`,
      description: 'Create preference resolution tests',
    },
    {
      path: `${bundle}/${root}/main.rego`,
      contents: `# METADATA
# title: Permissions bundle root
# description: |
#   Declares the Permissions envelope schema for this package and all
#   subpackages (helpers, purposes, and static config data).
# scope: subpackages
# schemas:
#   - input: schema.${root}.input
package ${root}

import rego.v1
`,
      description: 'Create the bundle root package with schema declaration',
    },
    {
      path: `${bundle}/${root}/purposes/analytics/analytics.rego`,
      contents: `# METADATA
# title: analytics purpose decision
# description: |
#   The analytics purpose's verdict as a \`result\` document
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
\tpreference.enabled("analytics")
}

result := {
\t"decision": "deny",
\t"reason_code": "explicit_deny",
} if {
\tpreference.disabled("analytics")
}

result := {
\t"decision": "allow",
\t"reason_code": "default_allow",
} if {
\tpreference.undecided("analytics")
}
`,
      description: 'Create the analytics purpose decision rule',
    },
    {
      path: `${bundle}/${root}/purposes/analytics/analytics_test.rego`,
      contents: `# Policy outcomes for the analytics purpose (the queried document).
package ${root}.purposes.analytics_test

import rego.v1

import data.${root}.purposes.analytics

given(preferences) := {"preferences": preferences}

test_explicit_allow if {
\tresult := analytics.result with input as given([{"name": "analytics", "choice": true}])
\tresult == {
\t\t"decision": "allow",
\t\t"reason_code": "explicit_allow",
\t}
}

test_explicit_deny if {
\tresult := analytics.result with input as given([{"name": "analytics", "choice": false}])
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
\tresult := analytics.result with input as given([{"name": "analytics", "choice": "yes"}])
\tresult == {
\t\t"decision": "allow",
\t\t"reason_code": "default_allow",
\t}
}

test_malformed_preferences_are_treated_as_undecided if {
\t# source_available is false, so enabled/disabled never fire; undecided still
\t# holds for configured purposes (not enabled and not disabled).
\tresult := analytics.result with input as {"preferences": {"analytics": true}}
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
 * @returns Bundle files relative to the workspace
 */
export function generatePolicyBundleFiles(
  template: PolicyTemplateName,
  root: string,
): PolicyStarterFile[] {
  switch (template) {
    case 'generic':
      return generateGenericBundleFiles(root);
    case 'permissions':
      return generatePermissionsBundleFiles(root);
    default:
      throw new Error(`Unknown policy template: ${String(template)}`);
  }
}
