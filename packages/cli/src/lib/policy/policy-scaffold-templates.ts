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

/** OPA bundle manifest for the disposable starter publish directory. */
export const POLICY_MANIFEST_TEMPLATE = `{
  "$schema": "https://openpolicyagent.org/schemas/bundle/v1/manifest.schema.json",
  "revision": "",
  "roots": ["${POLICY_STARTER_ROOT}"],
  "rego_version": 1
}
`;

/**
 * Workspace-level Regal configuration.
 *
 * `project.roots` are package-path prefixes (same meaning as OPA `.manifest`
 * roots), not filesystem folders.
 */
export const POLICY_REGAL_CONFIG_TEMPLATE = `# Workspace-level Regal config for publishable bundles under this tree.
# \`project.roots\` are package-path prefixes (same meaning as OPA \`.manifest\`
# roots), not filesystem folders. Each bundle also has its own \`.manifest\`.
capabilities:
  from:
    engine: opa
    version: v${POLICY_STARTER_OPA_VERSION}
project:
  roots:
    - ${POLICY_STARTER_ROOT}
  rego-version: 1
`;

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

/** Concise workspace-local authoring guide. */
export const POLICY_README_TEMPLATE = `# Transcend Policy

Template workspace for [Transcend Policy Engine](https://docs.transcend.io) bundles
(OPA / Rego v1). Requires **Transcend CLI ≥ 11** (\`transcend policy --help\`
should list \`init\` and positional \`[directory]\` args).

Each \`*-bundle/\` directory is a separate publishable unit (own \`.manifest\`,
input, and query path):

| Bundle | Directory | Query |
| --- | --- | --- |
| Example (disposable) | \`${POLICY_STARTER_BUNDLE_DIRECTORY}/\` | \`data.${POLICY_STARTER_ROOT}.result\` |

## Quick start

\`\`\`sh
cp transcend/policy/${POLICY_STARTER_BUNDLE_DIRECTORY}/input.example.json \\
  transcend/policy/${POLICY_STARTER_BUNDLE_DIRECTORY}/input.json

transcend policy lint transcend/policy/${POLICY_STARTER_BUNDLE_DIRECTORY} --noInteractive
transcend policy test transcend/policy/${POLICY_STARTER_BUNDLE_DIRECTORY}

transcend policy eval --pkg data.${POLICY_STARTER_ROOT}.result \\
  --input transcend/policy/${POLICY_STARTER_BUNDLE_DIRECTORY}/input.json \\
  transcend/policy/${POLICY_STARTER_BUNDLE_DIRECTORY}
\`\`\`

If local \`input.json\` is present next to \`input.example.json\`, directory-mode
\`opa test\` can hit a merge error. CI is fine (only the example file is
committed). Locally use \`opa test -b <bundle>\` until the CLI ignores fixtures.

## Layout

\`\`\`
transcend/policy/
  ${POLICY_STARTER_BUNDLE_DIRECTORY}/   # publish directory
    ${POLICY_STARTER_ROOT}/             # package root (matches .manifest roots)
    input.example.json
    input.json                          # local only (gitignored)
  schemas/                              # input JSON Schemas (editor + opa check -s)
  .regal/config.yaml
\`\`\`

Replace or delete the example bundle when you have a real policy. Publish each
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
