# @transcend-io/internationalization

Shared locale constants, translation maps, and message helpers for Transcend packages.

This package now lives in the `tools` monorepo and follows the shared package conventions,
quality checks, and release workflow documented in [`CONTRIBUTING.md`](../../CONTRIBUTING.md).

## Development

Run package-local commands from the repository root with `pnpm --filter`:

```bash
pnpm -F @transcend-io/internationalization build
pnpm -F @transcend-io/internationalization test
pnpm -F @transcend-io/internationalization typecheck
```

Future releases are published from the monorepo through Changesets rather than from the old
standalone repository.
