/** OPA version targeted by generated policy authoring configuration. */
export const POLICY_STARTER_OPA_VERSION = '1.13.1';

/**
 * Default Rego document-tree root for Policy Engine starters and examples.
 *
 * Declared in `.manifest` `roots` and used as the top-level package/directory
 * prefix for generated policy.
 */
export const POLICY_ENGINE_ROOT = 'policy_engine';

/** Relative directory for the disposable starter example package. */
export const POLICY_STARTER_EXAMPLE_DIRECTORY = `${POLICY_ENGINE_ROOT}/example`;

/** One deterministic file in the safe policy starter. */
export interface PolicyStarterFile {
  /** POSIX-style path relative to the policy directory. */
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

/** OPA bundle manifest for local authoring and Policy Engine publish. */
export const POLICY_MANIFEST_TEMPLATE = `{
  "$schema": "https://openpolicyagent.org/schemas/bundle/v1/manifest.schema.json",
  "revision": "",
  "roots": ["${POLICY_ENGINE_ROOT}"],
  "rego_version": 1
}
`;

/** Strict Regal project configuration pinned to the deployed OPA capabilities. */
export const POLICY_REGAL_CONFIG_TEMPLATE = `capabilities:
  from:
    engine: opa
    version: v${POLICY_STARTER_OPA_VERSION}
project:
  roots:
    - .
  rego-version: 1
`;

/** Disposable, fail-closed example policy. */
export const POLICY_RESULT_REGO_TEMPLATE = `package ${POLICY_ENGINE_ROOT}.example

import rego.v1

# METADATA
# title: Disposable example result
# description: |
#   A fail-closed teaching entrypoint. Replace this example with the document
#   tree and result contract required by your application.
# entrypoint: true
default result := {
	"decision": "deny",
	"reason_code": "untrusted_or_invalid_input",
}

result := {
	"decision": "allow",
	"reason_code": "trusted_subject",
} if {
	input.subject.trusted == true
}
`;

/** Executable tests adjacent to the disposable example policy. */
export const POLICY_RESULT_TEST_REGO_TEMPLATE = `package ${POLICY_ENGINE_ROOT}.example_test

import data.${POLICY_ENGINE_ROOT}.example
import rego.v1

test_denies_untrusted_subject if {
	result := example.result with input as {"subject": {"trusted": false}}
	result == {
		"decision": "deny",
		"reason_code": "untrusted_or_invalid_input",
	}
}

test_fails_closed_for_missing_subject if {
	result := example.result with input as {}
	result == {
		"decision": "deny",
		"reason_code": "untrusted_or_invalid_input",
	}
}

test_allows_trusted_subject if {
	result := example.result with input as {"subject": {"trusted": true}}
	result == {
		"decision": "allow",
		"reason_code": "trusted_subject",
	}
}
`;

/** Sanitized local input example containing no credentials or personal data. */
export const POLICY_INPUT_EXAMPLE_TEMPLATE = `{
  "subject": {
    "trusted": false
  }
}
`;

/** Target-local ignore rules for private evaluation input only. */
export const POLICY_GITIGNORE_TEMPLATE = `# Local policy evaluation input.
/input.json
`;

/** Concise project-local authoring guide. */
export const POLICY_README_TEMPLATE = `# Transcend Policy Project

This directory is an OPA document tree that can be published to Transcend Policy Engine.

The policy under \`${POLICY_STARTER_EXAMPLE_DIRECTORY}\` is disposable teaching material. Replace it with your intended package tree, input shape, and extensible result documents. Keep decisions fail-closed and cover every non-test package with \`.manifest\` roots.

Validate formatting, strict Rego v1 compatibility, Regal lint, tests, and the publish contract:

\`\`\`sh
transcend policy lint .
\`\`\`
`;

/** Complete safe starter in deterministic plan order. */
const POLICY_STARTER_FILES: readonly PolicyStarterFile[] = [
  {
    path: POLICY_MANIFEST_FILENAME,
    contents: POLICY_MANIFEST_TEMPLATE,
    description: 'Create the OPA bundle .manifest',
  },
  {
    path: '.regal/config.yaml',
    contents: POLICY_REGAL_CONFIG_TEMPLATE,
    description: 'Pin strict Rego v1 linting to OPA 1.13.1 capabilities',
  },
  {
    path: `${POLICY_STARTER_EXAMPLE_DIRECTORY}/result.rego`,
    contents: POLICY_RESULT_REGO_TEMPLATE,
    description: 'Create a documented fail-closed result entrypoint',
  },
  {
    path: `${POLICY_STARTER_EXAMPLE_DIRECTORY}/result_test.rego`,
    contents: POLICY_RESULT_TEST_REGO_TEMPLATE,
    description: 'Create executable tests for allow and fail-closed decisions',
  },
  {
    path: 'input.example.json',
    contents: POLICY_INPUT_EXAMPLE_TEMPLATE,
    description: 'Create a sanitized local evaluation input',
  },
  {
    path: '.gitignore',
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
