---
name: transcend-policy-engine
description: Sets up, authors, validates, tests, and publishes Transcend Policy Engine projects backed by OPA and Rego. Use for .manifest roots, Rego v1 policy trees, Regal configuration, local policy inputs, Policy Engine CI, or transcend policy CLI commands.
compatibility: Requires OPA 1.x, Regal, and Transcend CLI ≥ 11 for local validation.
---

# Transcend Policy Engine

Use the CLI for deterministic scaffolding and validation. Treat generated
examples as disposable teaching material and derive the real policy contract
from repository code and product requirements.

Requires **Transcend CLI ≥ 11** (`transcend policy lint [<directory>]`, with
`init` available).

## Workflow

1. Locate each publishable bundle directory (a directory with a `.manifest`;
   `policy new` scaffolds these as `{root}-bundle/` by default (override with
   `--bundle-dir`) with a `{root}/` package
   tree inside).
2. For initialization, editor support, tools, or CI, read [references/setup-tooling.md](references/setup-tooling.md).
3. For package layout, document-tree design, decisions, and inputs, read [references/authoring.md](references/authoring.md).
4. For tests, local inputs, linting, and evaluation, read [references/testing-debugging.md](references/testing-debugging.md).
5. For bundle validation and publishing, read [references/publishing.md](references/publishing.md).
6. Preserve repository conventions and finish with:

```sh
transcend policy lint --noInteractive
```

## Documentation

- Every Transcend CLI command and subcommand provides contextual help with `transcend <command> --help`.
- Use the [Transcend CLI README](https://github.com/transcend-io/tools/tree/main/packages/cli#readme) for command documentation and examples.
- Use the [Transcend documentation index](https://docs.transcend.io/llms.txt) to find current product documentation.

## Guardrails

- Do not invent an input shape, output contract, package tree, or deployment convention.
- Keep decisions fail-closed and make result documents extensible.
- Never commit credentials or a real local `input.json`.
- Keep every publishable Rego package covered by a `.manifest` root.
- One publish directory = one Policy Engine bundle; do not merge unrelated
  products into a single `.manifest` unless they share activation and callers.
