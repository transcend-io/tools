<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

## Table of Contents

- [Developers](#developers)
  - [Getting started](#getting-started)
  - [Repo Structure](#repo-structure)
  - [Generated files](#generated-files)
    - [README.md](#readmemd)
    - [transcend.yml and pathfinder.yml JSON schemas](#transcendyml-and-pathfinderyml-json-schemas)
  - [Testing](#testing)
  - [Publishing](#publishing)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Developers

## Getting started

1. See [CONTRIBUTING.md](../../CONTRIBUTING.md) for repository setup instructions.

2. From the repo root:
   1. Run `pnpm build` to build all packages in the monorepo.

      > [!Note]
      > This package depends on other packages inside this monorepo's workspace, so you must build those packages before you can use this one, and any time you make changes to those packages.

   2. Run the `"start"` script to call the CLI in dev mode:

      From the repo root:

      ```bash
      # This is the dev environment equivalent to `transcend --help`
      pnpm -F cli start --help

      # This is the dev environment equivalent to `transcend inventory pull --auth=my-api-key`
      pnpm -F cli start inventory pull --auth=my-api-key
      ```

      If you are in the `packages/cli` directory, you can run the `start` script directly:

      ```bash
      pnpm start --help
      pnpm start inventory pull --auth=my-api-key
      ```

You can generate an API key with the necessary scopes at [https://app.transcend.io/infrastructure/api-keys](https://app.transcend.io/infrastructure/api-keys) (or the equivalent page in whichever backend you're testing against).

## Repo Structure

The `src/commands/` directory contains the CLI commands and has a strict structure which is [tested](https://github.com/transcend-io/tools/blob/main/packages/cli/src/lib/tests/codebase.test.ts).

The folders are the namespace of the CLI, so `src/commands/request/cron/pull-identifiers/command.ts` is the command for `transcend request cron pull-identifiers`. The _route_ portion of the file path is `/request/cron` and the _command_ portion of the file path is `/pull-identifiers`.

- `src/commands/[...route]/[command]/command.ts` contains the [command](https://bloomberg.github.io/stricli/docs/features/command-routing/commands) arguments and CLI documentation.
- `src/commands/[...route]/[command]/impl.ts` contains the actual function that gets executed when the command runs.
- `src/commands/[...route]/[command]/readme.ts` is an optional file that can be used to add additional documentation to this repo's README.md for the command. This gets injected into the README.md below the CLI documentation for that command. NOTE: This should be used sparingly, since it is difficult to keep up to date. Prefer to use the `docs` field in the `command.ts` file instead.
- `src/commands/[...route]/routes.ts` contains the command [route maps](https://bloomberg.github.io/stricli/docs/features/command-routing/route-maps). This must export any new commands.

For more information on the commands and routings, see [the Stricli documentation](https://bloomberg.github.io/stricli/).

## Generated files

To just regenerate them all:

```bash
pnpm -F cli genfiles
```

### README.md

```bash
pnpm -F cli docgen
```

This will generate the README.md file from the command documentation and the `src/commands/**/readme.ts` files. To add examples, use the `buildExamples` command to generate type-safe examples. For complex or multi-line bash scripts, use `buildExampleCommand` directly (search for examples in the codebase).

### transcend.yml and pathfinder.yml JSON schemas

```bash
pnpm -F cli script:transcend-json-schema
pnpm -F cli script:pathfinder-json-schema
```

These commands generate the `transcend.yml` and `pathfinder.yml` JSON schema files in `schema/`. They are published to [schemastore](https://github.com/SchemaStore/schemastore), which powers linting and JSON schema support in VSCode and other IDEs.

## Testing

Uses [Vitest](https://vitest.dev/) (same test syntax as Jest/Mocha/Chai).

```bash
pnpm -F cli test
```
