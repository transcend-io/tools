# Transcend Developer Tools Monorepo

Public TypeScript monorepo for future `@transcend-io/*` developer tools.

For setup, day-to-day commands, package conventions, changesets, and releases, start with
`CONTRIBUTING.md`.

## Packages

The packages in `packages/` are placeholders today. They exist to exercise workspace linking,
builds, tests, and release automation while the real package surface area takes shape.

- `packages/utils` (`@transcend-io/utils`): shared naming helpers that normalize human-readable
  names into display names and npm-friendly slugs.
- `packages/core` (`@transcend-io/core`): higher-level monorepo helpers built on `utils`; today it
  creates simple package metadata from a name and directory.

## Workspace Layout

- `packages/*`: publishable libraries
- `apps/*`: reserved for non-publishable apps; empty today
- `.changeset/*`: release intent files
- `.github/workflows/*`: CI, preview, and release automation

## More Reading

- `CONTRIBUTING.md`: setup, workflow, commands, package conventions, and releases
- `monorepo-plan.md`: rationale behind the stack and original monorepo plan
