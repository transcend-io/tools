---
name: transcend-policy-engine
description: Sets up, authors, validates, tests, and publishes Transcend Policy Engine projects backed by OPA and Rego. Use for manifest.json roots, Rego v1 policy trees, Regal configuration, local policy inputs, Policy Engine CI, or transcend policy CLI commands.
compatibility: Requires OPA 1.x and Regal for local validation, plus the Transcend CLI.
---

# Transcend Policy Engine

Use the CLI for deterministic scaffolding and validation. Treat the generated example as disposable teaching material and derive the real policy contract from repository code and product requirements.

## Workflow

1. Locate the policy directory and its `manifest.json`.
2. For initialization, editor support, tools, or CI, read [references/setup-tooling.md](references/setup-tooling.md).
3. For package layout, document-tree design, decisions, and inputs, read [references/authoring.md](references/authoring.md).
4. For tests, local inputs, linting, and evaluation, read [references/testing-debugging.md](references/testing-debugging.md).
5. For bundle validation and publishing, read [references/publishing.md](references/publishing.md).
6. Preserve repository conventions and run `transcend policy lint <policy-directory> --noInteractive` before finishing.

## Documentation

- Every Transcend CLI command and subcommand provides contextual help with `transcend <command> --help`.
- Use the [Transcend CLI README](https://github.com/transcend-io/tools/tree/main/packages/cli#readme) for command documentation and examples.
- Use the [Transcend documentation index](https://docs.transcend.io/llms.txt) to find current product documentation.

## Guardrails

- Do not invent an input shape, output contract, package tree, or deployment convention.
- Keep decisions fail-closed and make result documents extensible.
- Never commit credentials or a real local `input.json`.
- Keep every publishable Rego package covered by a `manifest.json` root.
