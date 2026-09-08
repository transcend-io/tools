---
name: transcend-custom-functions
description: Sets up, implements, validates, and deploys Transcend Custom Functions. Use when working with transcend-functions.yml, General or DSR handlers, test payloads, Deno configuration, Custom Function CI, or transcend custom-functions CLI commands.
compatibility: Requires Deno 2.4.5 for local validation and the Transcend CLI.
---

# Transcend Custom Functions

Use the CLI for deterministic scaffolding and validation. Use this skill for the repository-specific implementation and integration decisions that remain.

## Workflow

1. Locate `transcend-functions.yml`. The default project is `transcend/custom-functions`.
2. For project setup, Deno, editor support, or CI, read [references/setup.md](references/setup.md).
3. For handlers, manifest entries, test payloads, validation, or deployment, read [references/writing-custom-functions.md](references/writing-custom-functions.md).
4. Follow existing repository conventions and preserve unrelated configuration.
5. Use `transcend custom-functions run <custom-function-directory>` while developing, then run `transcend custom-functions check <custom-function-directory>` before considering the work complete.

## Documentation

- Every Transcend CLI command and subcommand provides contextual help with `transcend <command> --help`.
- Use the [Transcend CLI README](https://github.com/transcend-io/tools/tree/main/packages/cli#readme) for command documentation and examples.
- Use the [Transcend documentation index](https://docs.transcend.io/llms.txt) to find current product documentation.

## Guardrails

- Never commit credentials. Keep secrets in parameter placeholders and the repository's secret store.
- Do not invent third-party API endpoints, authentication behavior, or field mappings. Inspect available documentation and existing code; ask for missing requirements.
- Keep source and test-payload paths relative to the manifest.
- Custom Functions run on Deno 2.4.5. Avoid Node-only APIs.
