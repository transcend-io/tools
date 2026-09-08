# Project setup and CI

## Initialize

Run:

```sh
transcend custom-functions init
```

The default target is `transcend/custom-functions`. Interactive setup offers:

- `transcend-functions.yml`
- strict, target-scoped Deno configuration and a check task
- target-scoped VS Code Deno settings and extension recommendation
- this Agent Skill
- credential-free GitHub Actions validation

Review the complete plan before applying it. Existing JSONC settings and comments should be preserved. Do not overwrite unrelated repository configuration.

## Deno

Local validation requires Deno 2.4.5, matching the production runtime. The generated `custom-functions:check` Deno task delegates to the CLI so it runs the same manifest, export, type, lint, and format checks. If Deno is missing or unsupported, direct the developer to the official installation instructions; do not install or switch runtimes without permission.

## CI

The generated GitHub Actions workflow is a secure reference implementation: it uses read-only repository permissions, pinned actions, Deno 2.4.5, a pinned Transcend CLI version, and no Transcend credentials.

Adapt it to existing repository conventions instead of creating a parallel CI system. For another CI provider, preserve this validation recipe:

1. Trigger when the Custom Function manifest, source, payloads, or Deno configuration changes.
2. Install Deno 2.4.5.
3. Install a pinned `@transcend-io/cli` version.
4. Run:

```sh
transcend custom-functions check "<custom-function-directory>" \
  --manifest="<manifest-path>" \
  --noInteractive \
  --json
```

Do not add deployment credentials to validation-only jobs.
