/** Namespaced directory and frontmatter name for the installed Agent Skill. */
export const CUSTOM_FUNCTION_SKILL_NAME = 'transcend-io-custom-functions';

/** Main progressively disclosed Agent Skill instructions. */
export const CUSTOM_FUNCTION_SKILL_MD = `---
name: ${CUSTOM_FUNCTION_SKILL_NAME}
description: Sets up, implements, validates, and deploys Transcend Custom Functions. Use when working with transcend-functions.yml, General or DSR handlers, test payloads, Deno configuration, Custom Function CI, or transcend custom-functions CLI commands.
compatibility: Requires Deno 2.x for local validation and the Transcend CLI.
---

# Transcend Custom Functions

Use the CLI for deterministic scaffolding and validation. Use this skill for the repository-specific implementation and integration decisions that remain.

## Workflow

1. Locate \`transcend-functions.yml\`. The default project is \`transcend/custom-functions\`.
2. For project setup, Deno, editor support, or CI, read [references/setup.md](references/setup.md).
3. For handlers, manifest entries, test payloads, validation, or deployment, read [references/writing-custom-functions.md](references/writing-custom-functions.md).
4. Follow existing repository conventions and preserve unrelated configuration.
5. Run \`transcend custom-functions check <custom-function-directory>\` before considering the work complete.

## Guardrails

- Never commit credentials. Keep secrets in parameter placeholders and the repository's secret store.
- Do not invent third-party API endpoints, authentication behavior, or field mappings. Inspect available documentation and existing code; ask for missing requirements.
- Keep source and test-payload paths relative to the manifest.
- Custom Functions run on Deno 2.x. Avoid Node-only APIs.
`;

/** Setup and CI guidance loaded only when needed. */
export const CUSTOM_FUNCTION_SETUP_REFERENCE_MD = `# Project setup and CI

## Initialize

Run:

\`\`\`sh
transcend custom-functions init
\`\`\`

The default target is \`transcend/custom-functions\`. Interactive setup offers:

- \`transcend-functions.yml\`
- strict, target-scoped Deno configuration and a check task
- target-scoped VS Code Deno settings and extension recommendation
- this Agent Skill
- credential-free GitHub Actions validation

Review the complete plan before applying it. Existing JSONC settings and comments should be preserved. Do not overwrite unrelated repository configuration.

## Deno

Local validation requires Deno 2.x. If it is missing or unsupported, direct the developer to the official installation instructions; do not install or upgrade runtimes without permission.

## CI

The generated GitHub Actions workflow is a secure reference implementation: it uses read-only repository permissions, pinned actions, Deno 2.x, a pinned Transcend CLI version, and no Transcend credentials.

Adapt it to existing repository conventions instead of creating a parallel CI system. For another CI provider, preserve this validation recipe:

1. Trigger when the Custom Function manifest, source, payloads, or Deno configuration changes.
2. Install Deno 2.x.
3. Install a pinned \`@transcend-io/cli\` version.
4. Run:

\`\`\`sh
transcend custom-functions check "<custom-function-directory>" \\
  --manifest="<manifest-path>" \\
  --noInteractive
\`\`\`

Do not add deployment credentials to validation-only jobs.
`;

/** Handler, fixture, validation, and deployment guidance. */
export const CUSTOM_FUNCTION_WRITING_REFERENCE_MD = `# Writing Custom Functions

## Add a function

Initialize the project first, then scaffold a function:

\`\`\`sh
transcend custom-functions new
\`\`\`

Choose the smallest matching template:

- \`general\` for a General Custom Function
- \`dsr-datapoint\` for the DSR data-point handler
- \`dsr-enricher\` for the DSR request enricher
- \`dsr-both\` when both DSR exports are required

Inspect the generated source, manifest entry, and payloads before implementing. Keep the generated export shape unless the manifest and fixtures change with it.

## Type contracts

Import \`CustomFunction\` as a type from \`@transcend-io/custom-function-types\`:

- General functions default-export a handler using \`CustomFunction.GeneralArgument\`.
- DSR data-point functions default-export a handler using \`CustomFunction.Argument\`.
- DSR request enrichers export \`enricher\` using \`CustomFunction.EnricherArgument\`.

Handlers receive \`payload\`, \`environment\`, \`sdk\`, and \`kv\`. Use:

- \`payload\` for trigger data
- \`environment\` for configured values
- \`sdk\` for Transcend and external HTTP calls
- \`kv\` for small persistent strings

Check \`response.ok\` for every \`sdk.fetch\` call. Include the response status and useful response details in failures without exposing secrets.

## Manifest and fixtures

- Use \`<<parameters.name>>\` placeholders for local secret values.
- Add every external network destination to \`allowed-hosts\`. Transcend SDK routes do not require an allowed-host entry.
- Set \`allow-third-party-imports\` only when the implementation needs undeclared third-party modules.
- Keep fixtures minimal but realistic, with at least one case for every implemented export.
- Match DSR fixtures to \`DATA_POINT\` and \`REQUEST_ENRICHER\`. Do not hardcode values such as the data silo identity that the push workflow supplies.

## Validate and deploy

Run:

\`\`\`sh
transcend custom-functions check "<custom-function-directory>"
transcend custom-functions push \\
  --file="<custom-function-directory>/transcend-functions.yml" \\
  --auth="$TRANSCEND_API_KEY" \\
  --dryRun
\`\`\`

Fix every check failure before pushing. Keep a revision as a draft with \`--promote=false\`. After the first successful push, use \`--updateManifest\` to record assigned IDs for stable future matching.
`;

/** One generated file in the installed Agent Skill. */
export interface CustomFunctionSkillFile {
  /** Path relative to the skill directory. */
  path: string;
  /** Complete Markdown contents. */
  contents: string;
}

/** Complete portable Agent Skill file set. */
export const CUSTOM_FUNCTION_SKILL_FILES: readonly CustomFunctionSkillFile[] = [
  { path: 'SKILL.md', contents: CUSTOM_FUNCTION_SKILL_MD },
  { path: 'references/setup.md', contents: CUSTOM_FUNCTION_SETUP_REFERENCE_MD },
  {
    path: 'references/writing-custom-functions.md',
    contents: CUSTOM_FUNCTION_WRITING_REFERENCE_MD,
  },
];
