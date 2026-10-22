# Transcend Developer Tools Monorepo

Public TypeScript monorepo for `@transcend-io/*` developer tools.

For setup, day-to-day commands, package conventions, changesets, and releases, start with
[`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Packages

The packages in `packages/` are the public developer tools for Transcend.

- [`packages/cli`](./packages/cli/) (`@transcend-io/cli`): the Transcend CLI, used to programmatically manage your Transcend
  infrastructure and data.
- [`packages/internationalization`](./packages/internationalization/) (`@transcend-io/internationalization`): shared locale
  constants, translation maps, and message helpers for Transcend packages.
- [`packages/privacy-types`](./packages/privacy-types/) (`@transcend-io/privacy-types`): shared enums, codecs, and type
  definitions for Transcend APIs and product surfaces.
- [`packages/mcp`](./packages/mcp/): [Model Context Protocol](https://modelcontextprotocol.io/) servers (`@transcend-io/mcp` and
  per-domain packages) so AI agents can work with Transcend.
- [`packages/airgap.js-types`](./packages/airgap.js-types/) (`@transcend-io/airgap.js-types`): shared enums, codecs, and type
  definitions for Transcend airgap.js.

## Agent Skills

Install [Transcend's Agent Skills](./skills) via:

```sh
npx skills add transcend-io/tools
```

## Plugins

Official Transcend marketplace plugins for AI coding tools, packaged under [`plugins/`](./plugins):

| Tool   | Index                                                    | Marketplace manifest                                                   |
| ------ | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| Cursor | [`plugins/cursor/README.md`](./plugins/cursor/README.md) | [`.cursor-plugin/marketplace.json`](./.cursor-plugin/marketplace.json) |
| Claude | [`plugins/claude/README.md`](./plugins/claude/README.md) | [`.claude-plugin/marketplace.json`](./.claude-plugin/marketplace.json) |
