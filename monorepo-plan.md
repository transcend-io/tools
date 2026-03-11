# The Modern TypeScript Open Source Monorepo Stack (2026)

## The Core Stack

| Layer | Tool | Role |
|-------|------|------|
| Package manager | **pnpm** (w/ workspaces + catalogs) | Install, link, version consistency |
| Task runner / caching | **Turborepo** | Parallel builds, remote caching, dependency graph |
| Bundler | **tsdown** | Library bundling (ESM-first, Rolldown-powered) |
| Test runner | **Vitest** | Fast, Vite-native testing |
| Linter | **Oxlint** | 50-100x faster than ESLint, 696 built-in rules, type-aware via tsgo |
| Formatter | **Oxfmt** | 30x faster than Prettier, 100% JS/TS compat, built-in import sorting |
| Versioning + changelogs | **Changesets** | Semver versioning, changelog generation, npm publish |
| Module system | **`"type": "module"`** | ESM-only by default |
| Preview releases | **pkg.pr.new** | Installable preview packages per PR/commit |
| Dep version consistency | **syncpack** or **pnpm catalogs** | Enforce single-version policy |
| Package correctness | **attw** (`@arethetypeswrong/cli`) | Validate exports/types before publish |
| TypeScript config | **`isolatedDeclarations`** + project references | Parallel .d.ts generation, incremental builds |

---

## Tool-by-Tool Breakdown

### pnpm (Package Manager)

The consensus winner for monorepo package management. Faster than npm/yarn, strict dependency resolution (no phantom deps), disk-efficient via content-addressable storage.

**Key 2025-2026 feature: Catalogs.** Centralize dependency versions in `pnpm-workspace.yaml` instead of each `package.json`:

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
  - "apps/*"

catalog:
  typescript: ^5.7.0
  react: ^19.0.0
  vitest: ^3.0.0
  "@types/node": ^22.0.0
```

```json
// packages/core/package.json
{
  "devDependencies": {
    "typescript": "catalog:",
    "@types/node": "catalog:"
  }
}
```

Set `catalogMode: strict` to enforce that all deps go through catalogs. The `catalog:` protocol is replaced with real versions on `pnpm publish`. Dependabot has full catalog support as of early 2025.

**When to use catalogs vs. syncpack:** Catalogs are native to pnpm and cover version centralization. Syncpack adds CI enforcement, formatting consistency, banned dependency rules, and works across npm/yarn/pnpm. Use catalogs for new pnpm projects; consider syncpack if you need more policy enforcement or are migrating incrementally.

---

### Turborepo (Task Runner + Build Orchestration)

Non-negotiable for 2026 monorepos. Understands your dependency graph, runs tasks in parallel, and caches outputs locally + remotely.

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

Remote caching means if anyone on your team (or CI) has built a given commit, the artifacts are reused. This is the single biggest CI time savings in most monorepos.

---

### tsdown (Library Bundler)

The successor to tsup. Built on Rolldown (Rust-based bundler from the Vite/VoidZero ecosystem), uses Oxc for type declaration generation. tsup is no longer actively maintained and points users to tsdown.

**Why tsdown over tsup:**
- ESM-first (tsup was CJS-first with ESM bolted on)
- ~2x faster standard builds, up to 8x faster .d.ts generation
- Native `isolatedDeclarations` support for fast type generation
- Built-in `tsdown migrate` command for tsup projects
- Rolldown plugin ecosystem + most Rollup plugins work

```ts
// tsdown.config.ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],       // ESM-only is the 2026 default
  dts: true,             // Uses Oxc + isolatedDeclarations
  clean: true,
})
```

**For apps** (not libraries): Use Vite + Rolldown directly. tsdown is specifically optimized for library bundling.

**Monorepo tip:** Create a shared `tsdown.config.base.ts` and extend per-package:

```ts
// tsdown.config.base.ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  format: ['esm'],
  dts: true,
  clean: true,
})
```

---

### Vitest (Testing)

Vite-native test runner. Fast, ESM-first, excellent TypeScript support out of the box. Shares Vite's config/transform pipeline.

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',  // or 'jsdom' for browser
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
})
```

Vitest workspace support means you can run tests across all packages from the root. Pair with Turborepo's `test` task for cached, parallelized test runs.

---

### Oxlint (Linter)

Part of the Oxc project (VoidZero/Vite ecosystem). Oxlint 1.0 shipped June 2025. 696 built-in rules covering the plugins most teams already use: typescript-eslint, React, JSX-a11y, import, unicorn, and more.

**Why Oxlint over Biome or ESLint:**
- 50-100x faster than ESLint, ~2-3x faster than Biome
- Type-aware linting via **tsgo** (the official Go port of the TypeScript compiler / TS 7.0 foundation) — 8-12x faster than typescript-eslint. This means full TypeScript type system fidelity, not a custom approximation like Biome's approach.
- Multi-file analysis (module graph for rules like `no-cycle`)
- `@oxlint/migrate` for automated ESLint config migration
- ESLint-compatible JS plugins (experimental) for gap coverage

```json
// oxlint.json (or .oxlintrc.json)
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "rules": {
    "no-unused-vars": "warn",
    "no-console": "warn",
    "typescript/no-floating-promises": "error",
    "typescript/no-unsafe-assignment": "error"
  },
  "ignorePatterns": ["dist", "node_modules"]
}
```

**Migration from ESLint:**
```bash
# Automated config migration
npx @oxlint/migrate

# Or run alongside ESLint during transition
# eslint-plugin-oxlint disables overlapping ESLint rules
npm install -D eslint-plugin-oxlint
```

**Monorepo scripts:**
```json
{
  "scripts": {
    "lint": "oxlint .",
    "lint:fix": "oxlint --fix ."
  }
}
```

---

### Oxfmt (Formatter)

Prettier-compatible formatter from the same Oxc ecosystem. Alpha shipped Dec 2025, beta Feb 2026. Now passes 100% of Prettier's JS/TS conformance tests.

**Why Oxfmt over Biome or Prettier:**
- 30x faster than Prettier, ~2-3x faster than Biome
- 100% Prettier JS/TS formatting compatibility (any diff is a bug)
- Built-in import sorting (no plugin needed)
- Built-in Tailwind CSS class sorting (replaces `prettier-plugin-tailwindcss`)
- Built-in package.json field sorting
- Formats JS, TS, JSON, YAML, TOML, HTML, Vue, CSS, SCSS, Markdown, MDX, GraphQL
- Prettier config compatible — can literally rename `.prettierrc` to `.oxfmtrc.jsonc`

```jsonc
// .oxfmtrc.jsonc
{
  "$schema": "./node_modules/oxfmt/configuration_schema.json",
  "printWidth": 100,        // Oxfmt default (Prettier is 80)
  "tabWidth": 2,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "experimentalSortImports": true,
  "experimentalSortPackageJson": true
}
```

**Migration from Prettier:**
```bash
# Automated migration
oxfmt --migrate prettier

# Or manually:
# 1. Install oxfmt
# 2. Rename .prettierrc → .oxfmtrc.jsonc
# 3. Replace prettier scripts with oxfmt
# 4. Run oxfmt to reformat (minimal diffs)
# 5. Uninstall prettier
```

**Monorepo scripts:**
```json
{
  "scripts": {
    "format": "oxfmt --write .",
    "format:check": "oxfmt --check ."
  }
}
```

**Editor support:** VS Code, Cursor, Zed, WebStorm, Neovim — via the Oxc extension.

**Why two tools instead of one (Biome)?** The Oxc philosophy is that linting checks logic and formatting checks style — these are separate concerns. This mirrors the broader VoidZero ecosystem alignment (Vite → Rolldown → tsdown → Vitest → Oxlint → Oxfmt). You get best-in-class at each layer rather than one monolith. And critically, Oxlint's type-aware linting uses the *real* TypeScript compiler (via tsgo), while Biome rolled its own type synthesizer that covers ~75-85% of typescript-eslint rules with potential edge-case divergence.

---

### Changesets (Versioning + Publishing)

The standard for monorepo versioning and npm publishing. Developer declares intent ("I fixed a bug in package X"), changesets handles version bumps, changelog generation, and publish.

```bash
# Developer workflow
pnpm changeset              # Interactive: pick packages, bump type, write summary
git add .changeset/         # Commit the changeset file
git push                    # CI opens "Version Packages" PR

# CI (via changesets/action)
pnpm changeset version      # Applies bumps + changelogs
pnpm changeset publish      # Publishes to npm
```

**2026 best practice: npm trusted publishing (OIDC).** No long-lived `NPM_TOKEN` secrets. Configure once per package on npmjs.com, and your GitHub Action publishes via OIDC token exchange.

---

### ESM-Only (`"type": "module"`)

The 2026 consensus is to drop CJS entirely for new packages. ESM-only simplifies your build config, removes dual-publish complexity, and avoids the "dual package hazard."

```json
// package.json
{
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist"]
}
```

No more `"import"` / `"require"` conditional exports. No `.mjs` / `.cjs` extensions. Just `.js` and `.d.ts`.

**Validate with attw:**
```bash
npx attw --pack . --ignore-rules cjs-resolves-to-esm
```

---

### pkg.pr.new (Preview Releases)

GitHub App that gives every PR/commit an installable npm-compatible URL — without publishing to npm. Think "Vercel preview deploys but for packages."

```yaml
# .github/workflows/preview.yml
name: Preview Release
on: [push, pull_request]
jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: corepack enable
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install
      - run: pnpm build
      - run: npx pkg-pr-new publish './packages/*'
```

PR comment gives you:
```
npm i https://pkg.pr.new/yourorg/yourrepo/package-name@abc1234
```

Backed by Cloudflare R2, used by Vite, Svelte, Nuxt, and many others.

---

### TypeScript Configuration

**Key compiler options for 2026 monorepos:**

```json
// tsconfig.base.json (shared root config)
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "isolatedModules": true,
    "isolatedDeclarations": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "incremental": true,
    "skipLibCheck": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true
  }
}
```

**`isolatedDeclarations`** (TS 5.5+) is the key unlock: it allows `.d.ts` generation without full type-checking, enabling tools like tsdown/Oxc to generate declarations in parallel at Rust speed. The tradeoff is explicit return types on exported functions — but this is also what makes code more LLM-friendly and self-documenting.

**Project references** enable incremental builds across the monorepo. Each package gets its own `tsconfig.json` extending the base, and the root `tsconfig.json` lists all projects in `references`.

**Live types pattern** (for dev ergonomics): Point `"exports"` directly at `.ts` source files during development so editors resolve to raw TypeScript. tsdown/build step produces the `dist/` for publish via `publishConfig`.

---

## File Structure

```
my-monorepo/
├── apps/
│   └── web/
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── core/
│   │   ├── src/index.ts
│   │   ├── tsdown.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── utils/
│       ├── src/index.ts
│       ├── tsdown.config.ts
│       ├── package.json
│       └── tsconfig.json
├── .changeset/
│   └── config.json
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── oxlint.json
├── .oxfmtrc.jsonc
├── turbo.json
├── tsconfig.json              # Root: project references only
├── tsconfig.base.json         # Shared compiler options
├── tsdown.config.base.ts      # Shared bundler config
├── vitest.config.ts
├── pnpm-workspace.yaml        # Workspaces + catalogs
├── package.json               # Root scripts
└── .npmrc
```

---

## Root package.json Scripts

```json
{
  "scripts": {
    "build": "turbo build",
    "test": "turbo test",
    "lint": "oxlint .",
    "lint:fix": "oxlint --fix .",
    "typecheck": "turbo typecheck",
    "format": "oxfmt --write .",
    "format:check": "oxfmt --check .",
    "changeset": "changeset",
    "version-packages": "changeset version",
    "release": "turbo build && changeset publish",
    "check-exports": "turbo check-exports",
    "syncpack:lint": "syncpack lint"
  }
}
```

---

## CI Pipeline (GitHub Actions)

```yaml
name: CI
on: [push, pull_request]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: corepack enable
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint                    # Oxlint
      - run: pnpm format:check            # Oxfmt
      - run: pnpm typecheck               # tsc --noEmit per package
      - run: pnpm build                   # tsdown via Turborepo
      - run: pnpm test                    # Vitest via Turborepo
      - run: pnpm check-exports           # attw --pack per package

  release:
    needs: ci
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      id-token: write                     # For npm OIDC publishing
    steps:
      - uses: actions/checkout@v4
      - run: corepack enable
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          registry-url: https://registry.npmjs.org
      - run: pnpm install --frozen-lockfile
      - uses: changesets/action@v1
        with:
          publish: pnpm release
          version: pnpm version-packages
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # No NPM_TOKEN needed with OIDC trusted publishing
```

---

## Reference Template

The best existing reference for this exact stack is [jkomyno/pnpm-monorepo-template](https://github.com/jkomyno/pnpm-monorepo-template), which bundles: pnpm + Turborepo + tsdown + Vitest + Biome + Changesets + pkg.pr.new + npm OIDC trusted publishing.

---

## Decision Notes

| Decision | Rationale |
|----------|-----------|
| **pnpm over npm/yarn** | Strict deps, catalogs, performance, workspace: protocol |
| **tsdown over tsup** | tsup unmaintained, tsdown is ESM-first + Rolldown + faster .d.ts |
| **Oxlint+Oxfmt over Biome** | Oxlint uses real TS compiler (tsgo) for type-aware linting; Oxfmt has 100% Prettier compat; both faster; aligned with Vite/Rolldown ecosystem |
| **ESM-only over dual CJS/ESM** | Simpler config, no dual-package hazard, ecosystem ready in 2026 |
| **isolatedDeclarations** | Unlocks parallel .d.ts gen, explicit types improve LLM+human readability |
| **pnpm catalogs over syncpack** | Native, zero-config version centralization (use syncpack for extra policy) |
| **pkg.pr.new** | Zero-friction preview releases, no npm pollution, PR-level testing |
| **attw in CI** | Catches ESM/CJS/types mismatches before users hit them |
| **npm OIDC publishing** | No long-lived tokens, audit-friendly, per-package trust |