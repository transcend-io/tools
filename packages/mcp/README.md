# Transcend MCP Servers

> **Beta** — these packages are under active development. APIs may change without notice.

[Model Context Protocol](https://modelcontextprotocol.io/) (MCP) servers that let AI agents interact with the [Transcend](https://transcend.io) privacy platform. Every server supports both **stdio** (local process) and **Streamable HTTP** (remote hosting) transports, so it works with any compliant client (Claude Desktop, Cursor, Cline, custom agents, etc.).

## Quick start (stdio + OAuth)

1. **Create an OAuth client** — an org admin opens [app.transcend.io/admin/oauth-clients](https://app.transcend.io/admin/oauth-clients), creates a client, and copies the client ID and secret.
2. **Register a redirect URI** — choose an available localhost port number, then add `http://127.0.0.1:{port}/callback` (use `127.0.0.1`, not `localhost`; path must be `/callback`; `{port}` is the number you chose). See [OAuth client setup](#oauth-client-setup) for IPv6 and multi-server ports.
3. **Configure your MCP client** — paste the JSON example below into Cursor (`.cursor/mcp.json`), Claude Desktop, or VS Code with your credentials.
4. **Restart the MCP client** — the server verifies your OAuth client at startup; connection errors usually mean a redirect URI or secret mismatch.
5. **Invoke any tool** — on the first tool call the server opens a browser for login. Complete consent and return to your agent.
6. **Use tools normally** — tokens stay in memory for this session. Restarting the MCP process requires signing in again.

## Prerequisites

- **Node.js** ≥ 22.12 (see each CLI package’s `engines` in `package.json`).
- **OAuth credentials** for stdio transport — see [OAuth client setup](#oauth-client-setup) below. Requires **admin access** to create OAuth clients in the Transcend dashboard.
- Packages are in **beta**. Install via `npm install -g @transcend-io/<package>` or use `npx -y @transcend-io/<package>`. To develop from source, clone this repository: copy [`secret.env.example`](../../secret.env.example) to **`secret.env`** at the repo root and set the OAuth environment variables; then from the repo root run `pnpm exec turbo run build --filter="@transcend-io/<package>..."` (trailing `...` includes dependencies such as `mcp-server-base`), then `set -a && source ./secret.env && set +a` and `pnpm -F @transcend-io/<package> exec node ./dist/cli.mjs` (or use [`scripts/mcp-run.sh`](../../scripts/mcp-run.sh) — see **Run from the monorepo** in each package README and [CONTRIBUTING.md](../../CONTRIBUTING.md#mcp-servers)).

In client config, `npx` with `-y @transcend-io/...` runs that package’s published `bin` (see `package.json` in each package).

## OAuth client setup

Before configuring an MCP client, create OAuth credentials in the Transcend admin dashboard:

1. Navigate to [app.transcend.io/admin/oauth-clients](https://app.transcend.io/admin/oauth-clients) and create an OAuth client (org admin required).
2. Copy the **client ID** and **client secret**.
3. Choose an available localhost port number (`{port}`), then register a redirect URI that **exactly** matches what the server will send:
   - Default: `http://127.0.0.1:{port}/callback`
   - IPv6: `http://[::1]:{port}/callback` (set `TRANSCEND_OAUTH_REDIRECT_HOST=::1`)

> **Use `127.0.0.1`, not `localhost`.** The server builds redirect URIs from `TRANSCEND_OAUTH_REDIRECT_HOST` (default `127.0.0.1`). Registering `http://localhost:{port}/callback` will fail verification even if the port matches.

> **Host, port, and path must all match.** `{port}` must be a port number you choose that is available (not in use) on your machine. The redirect URI must end with `/callback`. `TRANSCEND_OAUTH_REDIRECT_PORT` must match the port in the registered URI.

For example, if you choose port `4567` and set `TRANSCEND_OAUTH_REDIRECT_PORT=4567`, register `http://127.0.0.1:4567/callback` (default) or `http://[::1]:4567/callback` with `TRANSCEND_OAUTH_REDIRECT_HOST=::1`.

**Multiple domain servers:** use a **different** `TRANSCEND_OAUTH_REDIRECT_PORT` (and matching redirect URI) for each server. One OAuth client can register **multiple** redirect URIs on the same client (e.g. `:your-client-redirect-port/callback` and `:your-other-redirect-port/callback`).

**Startup vs browser login:** at startup the server verifies client ID, secret, and redirect URI via Transcend's API. If verification fails, the MCP server will not connect — fix credentials first. After startup succeeds, the **browser** opens on the first tool call to complete user consent.

On first tool call, the server opens a browser for login. Tokens are session-only (in-memory); restarting the MCP process requires signing in again.

### OAuth scopes

Each server requests domain-specific OAuth scopes during browser consent (plus `offline_access` for token refresh). The signed-in user must hold these permissions in Transcend; otherwise login succeeds but individual tools may return authorization errors.

| Package                                               | OAuth scopes requested                                                                                                                                                                           |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`mcp`](./mcp/) (unified)                             | Union of all domain scopes below                                                                                                                                                                 |
| [`mcp-server-admin`](./mcp-server-admin/)             | `ViewEmployees`, `ViewApiKeys`, `ManageApiKeys`                                                                                                                                                  |
| [`mcp-server-assessment`](./mcp-server-assessment/)   | `ViewAssessments`, `ViewAssignedAssessments`, `ManageAssessments`, `ManageAssignedAssessments`                                                                                                   |
| [`mcp-server-consent`](./mcp-server-consent/)         | `ViewConsentManager`, `ViewAssignedConsentManager`, `ManageConsentManager`, `ManageAssignedConsentManager`, `ViewDataFlow`, `ManageDataFlow`                                                     |
| [`mcp-server-discovery`](./mcp-server-discovery/)     | `ViewDataMap`, `ViewAssignedIntegrations`, `ViewCodeScanning`, `ManageCodeScanning`, `ViewPrompts`, `ViewPromptRuns`, `ExecutePrompt`                                                            |
| [`mcp-server-docs`](./mcp-server-docs/)               | _(none — tools fetch public docs URLs only)_                                                                                                                                                     |
| [`mcp-server-dsr`](./mcp-server-dsr/)                 | `ViewRequests`, `ViewAssignedRequests`, `MakeDataSubjectRequest`, `ManageAssignedRequests`, `ViewRequestCompilation`, `ManageRequestCompilation`                                                 |
| [`mcp-server-inventory`](./mcp-server-inventory/)     | `ViewDataMap`, `ViewAssignedIntegrations`, `ManageDataMap`, `ManageAssignedIntegrations`, `ViewDataInventory`, `ViewAssignedDataInventory`, `ManageDataInventory`, `ManageAssignedDataInventory` |
| [`mcp-server-preferences`](./mcp-server-preferences/) | `ViewPrivacyCenter`, `ManagePrivacyCenter`                                                                                                                                                       |
| [`mcp-server-workflows`](./mcp-server-workflows/)     | `ViewAllActionItems`, `ManageAllActionItems`, `ViewEmailTemplates`                                                                                                                               |

Canonical scope lists live in each package's `src/scopes.ts`.

### Troubleshooting

| Symptom                                          | Likely cause                               | Fix                                                                                                                                                                                    |
| ------------------------------------------------ | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MCP server fails to connect / start              | Startup client verification failed         | Check client ID, secret, and that the registered redirect URI **exactly** matches `http://127.0.0.1:{port}/callback` (`{port}` is an available port number you chose; not `localhost`) |
| OAuth login fails after browser redirect         | Redirect URI mismatch                      | Ensure host (`127.0.0.1` or `::1`), port, and `/callback` path match between dashboard and env vars                                                                                    |
| `EADDRINUSE` / port in use                       | Two servers share a redirect port          | Assign a unique `TRANSCEND_OAUTH_REDIRECT_PORT` per server and register each URI                                                                                                       |
| Browser opened but tool still fails              | Consent denied, timed out, or closed early | Complete consent in the browser; if timed out, restart the MCP client and try again (do not retry automatically)                                                                       |
| Login works but a tool returns permission errors | User lacks required OAuth scopes           | Sign in as a user with the scopes listed above, or use a domain server with narrower scope requirements                                                                                |
| Must re-login after every restart                | Expected behavior                          | OAuth tokens are session-only (in-memory); restart MCP to sign in again                                                                                                                |

## Choosing a server

There are two ways to consume the MCP tools, and they can be mixed freely.

### Unified server

Install **`@transcend-io/mcp`** to get every tool (73 across all domains) in a single process. This is the fastest way to get started and is ideal when your agent can handle a large tool set.

**Claude Desktop** (`claude_desktop_config.json`) / **Cursor** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "transcend": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp"],
      "env": {
        "TRANSCEND_OAUTH_CLIENT_ID": "your-client-id",
        "TRANSCEND_OAUTH_CLIENT_SECRET": "your-client-secret",
        "TRANSCEND_OAUTH_REDIRECT_PORT": "your-client-redirect-port"
      }
    }
  }
}
```

**VS Code** (`.vscode/mcp.json`):

```json
{
  "servers": {
    "transcend": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp"],
      "env": {
        "TRANSCEND_OAUTH_CLIENT_ID": "your-client-id",
        "TRANSCEND_OAUTH_CLIENT_SECRET": "your-client-secret",
        "TRANSCEND_OAUTH_REDIRECT_PORT": "your-client-redirect-port"
      }
    }
  }
}
```

### Domain servers

Install only the domains you need. Smaller tool counts help AI agents stay focused and reduce token overhead from tool descriptions. You can run multiple domain servers side by side.

**Claude Desktop** (`claude_desktop_config.json`) / **Cursor** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "transcend-consent": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server-consent"],
      "env": {
        "TRANSCEND_OAUTH_CLIENT_ID": "your-client-id",
        "TRANSCEND_OAUTH_CLIENT_SECRET": "your-client-secret",
        "TRANSCEND_OAUTH_REDIRECT_PORT": "your-client-redirect-port"
      }
    },
    "transcend-dsr": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server-dsr"],
      "env": {
        "TRANSCEND_OAUTH_CLIENT_ID": "your-client-id",
        "TRANSCEND_OAUTH_CLIENT_SECRET": "your-client-secret",
        "TRANSCEND_OAUTH_REDIRECT_PORT": "your-other-redirect-port"
      }
    }
  }
}
```

> When running multiple domain servers, use a **different** `TRANSCEND_OAUTH_REDIRECT_PORT` (and matching redirect URI) for each server. One OAuth client can register multiple redirect URIs.

**VS Code** (`.vscode/mcp.json`):

```json
{
  "servers": {
    "transcend-consent": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server-consent"],
      "env": {
        "TRANSCEND_OAUTH_CLIENT_ID": "your-client-id",
        "TRANSCEND_OAUTH_CLIENT_SECRET": "your-client-secret",
        "TRANSCEND_OAUTH_REDIRECT_PORT": "your-client-redirect-port"
      }
    },
    "transcend-dsr": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server-dsr"],
      "env": {
        "TRANSCEND_OAUTH_CLIENT_ID": "your-client-id",
        "TRANSCEND_OAUTH_CLIENT_SECRET": "your-client-secret",
        "TRANSCEND_OAUTH_REDIRECT_PORT": "your-other-redirect-port"
      }
    }
  }
}
```

### Picking the right approach

| Scenario                                                      | Recommendation                                   |
| ------------------------------------------------------------- | ------------------------------------------------ |
| Exploring what Transcend can do                               | Unified server — try everything at once          |
| Production agent with a narrow task (e.g. cookie triage)      | Single domain server (e.g. `mcp-server-consent`) |
| Agent that spans a few domains (e.g. inventory + assessments) | Multiple domain servers running side by side     |
| Minimizing token usage / tool-selection errors                | Domain servers — fewer tools means less noise    |
| Remote hosting / multi-user deployment                        | Any server with `--transport http`               |

## Remote HTTP transport

Any server can be started in HTTP mode for remote hosting:

```bash
TRANSCEND_API_KEY=your-api-key npx @transcend-io/mcp --transport http --port 3000
```

This starts a Streamable HTTP server at `http://127.0.0.1:3000/mcp` with a health check at `/health`. Each client connection gets its own session with automatic cleanup after idle timeout.

For Docker, reverse proxy, and cloud deployment patterns, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Authentication

The MCP server supports three authentication modes:

### OAuth (stdio, recommended)

For external consumers (Claude Enterprise, Cursor, etc.) using stdio transport, authenticate via browser OAuth login. Set these environment variables in your MCP client config (see [OAuth client setup](#oauth-client-setup)):

- `TRANSCEND_OAUTH_CLIENT_ID` — client ID from [app.transcend.io/admin/oauth-clients](https://app.transcend.io/admin/oauth-clients); enables OAuth stdio mode when set (unless `TRANSCEND_API_KEY` is also set)
- `TRANSCEND_OAUTH_CLIENT_SECRET` — client secret from the same page
- `TRANSCEND_OAUTH_REDIRECT_PORT` — port number you choose for the OAuth callback server (must be available on your machine); **must match the port in your registered redirect URI**
- `TRANSCEND_OAUTH_REDIRECT_HOST` — loopback host for the OAuth callback (`127.0.0.1` default, or `::1` for IPv6 format)
- `TRANSCEND_OAUTH_ISSUER` — optional; **auto-detected in production** by probing regional backends (`api.transcend.io`, `api.us.transcend.io`). Only needed in test environments.

OAuth mode activates when `TRANSCEND_OAUTH_CLIENT_ID` is set and `TRANSCEND_API_KEY` is not. At startup the server verifies credentials and redirect URI; on first tool call it opens a browser for user consent. Tokens are kept in process memory only; restarting the MCP client requires signing in again.

### API key (stdio alternative)

For scripts or local development, stdio mode also accepts `TRANSCEND_API_KEY` instead of OAuth. When both are set, the API key takes precedence and OAuth is disabled. This bypasses browser login but requires managing a long-lived secret in your MCP client config.

### Session cookie (in-app dashboard)

For the Transcend dashboard's internal MCP integration, the server accepts session cookie authentication over HTTP transport. The dashboard forwards the user's `laravel_session` cookie and organization ID to the MCP server:

- `Cookie: laravel_session=<session-token>`
- `x-transcend-active-organization-id: <org-uuid>`

When both cookie and API key headers are present, the session cookie takes priority.

**Sidecar pattern (Prometheus):** The MCP server supports auth-free initialization for use as a sidecar process. In this mode, the server starts without any credentials, allowing the MCPClient to connect and list tools at startup. Per-request auth headers (Cookie + org ID) are then resolved from each subsequent `tools/call` request and propagated through `AsyncLocalStorage` so that concurrent requests from different users never share credentials.

## Packages

| Package                                               | Binary                      | Tools | Description                                      |
| ----------------------------------------------------- | --------------------------- | ----: | ------------------------------------------------ |
| [`mcp`](./mcp/)                                       | `transcend-mcp`             |    73 | Unified server — all tools in one process        |
| [`mcp-server-admin`](./mcp-server-admin/)             | `transcend-mcp-admin`       |     8 | Organization, users, teams, API keys             |
| [`mcp-server-assessment`](./mcp-server-assessment/)   | `transcend-mcp-assessment`  |    14 | Privacy assessments, templates, groups           |
| [`mcp-server-consent`](./mcp-server-consent/)         | `transcend-mcp-consent`     |    14 | Consent management, analytics, cookie triage     |
| [`mcp-server-base`](./mcp-server-base/)               | —                           |     — | Shared infrastructure (not installed directly)   |
| [`mcp-server-discovery`](./mcp-server-discovery/)     | `transcend-mcp-discovery`   |     6 | Data discovery, classification, NER              |
| [`mcp-server-docs`](./mcp-server-docs/)               | `transcend-mcp-docs`        |     2 | Transcend documentation lookup (list + fetch)    |
| [`mcp-server-dsr`](./mcp-server-dsr/)                 | `transcend-mcp-dsr`         |    12 | Data subject requests (submit, track, respond)   |
| [`mcp-server-inventory`](./mcp-server-inventory/)     | `transcend-mcp-inventory`   |    10 | Data inventory, silos, vendors, data points      |
| [`mcp-server-preferences`](./mcp-server-preferences/) | `transcend-mcp-preferences` |     6 | Privacy preference store (query, upsert, delete) |
| [`mcp-server-workflows`](./mcp-server-workflows/)     | `transcend-mcp-workflows`   |     3 | Workflow & email-template configuration          |

See each package's README for full tool lists, detailed environment variable docs, and client configuration examples.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  mcp  (unified)                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ ToolRegistry                                        │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │ │
│  │  │  admin   │ │ consent  │ │   dsr    │  ...       │ │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘            │ │
│  └───────┼─────────────┼────────────┼──────────────────┘ │
│          └─────────────┼────────────┘                    │
│                        ▼                                 │
│               mcp-server-base                            │
│        (GraphQL base, REST client, validation)           │
└──────────────────────────────────────────────────────────┘
```

Each domain package (admin, consent, dsr, ...) is a self-contained MCP server with its own CLI entry point. It can run standalone or be composed into the unified server. All domain packages depend on `mcp-server-base` for shared infrastructure:

- **`TranscendGraphQLBase`** — base class extended by each domain's GraphQL mixin
- **`TranscendRestClient`** — REST client for the Sombra API (used by DSR, preferences, and discovery)
- **`createMCPServer`** — factory that bootstraps an MCP server from tool definitions (stdio or HTTP, selected via `--transport`)
- **`buildMcpServer`** — lower-level factory that creates a `Server` with tool handlers (no transport)
- **`runMcpHttp`** — starts an Express-based Streamable HTTP server with session management
- **Validation & helpers** — Zod schemas, `validateArgs`, `createToolResult`, `createListResult`

The unified `mcp` package aggregates tools via `ToolRegistry` and composes a `TranscendGraphQLClient` that mixes in all domain GraphQL capabilities.

## Client capabilities and MCP Apps

MCP hosts differ widely in what they can render. Claude Desktop can show interactive views and forms; a plain scripted client can only handle text. Rather than shipping the lowest common denominator or branching per host inside tool handlers, `mcp-server-base` negotiates capabilities once per connection and resolves each tool to the best variant that host supports.

Because every server funnels its tools through `buildMcpServer`, all packages get this behavior without any per-package wiring.

### How a session is negotiated

During `initialize`, the host declares its capabilities and identifies itself. `deriveClientCapabilities` reduces that to the set we can act on, and `whatIsTheClient` maps `clientInfo.name` to an `McpHostClient`. The result is stored in an `AsyncLocalStorage` context for the request, so handlers can read it via `getMcpSession()` without any change to their signatures.

Only two capabilities are detected, because they are the only ones we can act on:

| Capability                        | Detected from                                           |
| --------------------------------- | ------------------------------------------------------- |
| `McpClientCapability.Elicitation` | `capabilities.elicitation.form`                         |
| `McpClientCapability.McpApp`      | `capabilities.extensions['io.modelcontextprotocol/ui']` |

Sampling and roots are deliberately excluded. Roots is inert for these servers (they are API-backed, so there is no filesystem scope to negotiate), our target hosts do not implement sampling, and both are deprecated as of the 2026-07-28 spec under SEP-2577.

### Adding variants to a tool

Use `defineToolWithCapabilities` instead of `defineTool`. The inherited `handler` is the required baseline; each variant is optional:

```typescript
defineToolWithCapabilities({
  name: 'my_tool',
  // ...everything defineTool takes; this handler is the baseline
  handler: async (args) => plainTextResult(args),
  variants: {
    [McpClientCapability.Elicitation]: {
      elicitMessage: 'Which environment should this apply to?',
      elicitSchema: { type: 'object', properties: { env: { type: 'string', description: '...' } } },
      handler: async (args) => withForm(args),
    },
    [McpClientCapability.McpApp]: {
      resource: MY_VIEW,
      handler: async (args) => richPayload(args),
      appOnlyTools: [refreshTool],
    },
  },
});
```

Precedence is fixed at MCP App, then elicitation, then baseline, so `tools/list` and `tools/call` always agree for a given host. Note that `elicitSchema` is not a Zod schema: the spec restricts elicitation to a flat object of primitives, so it cannot reuse a tool's `zodSchema`. Both that restriction and the usual description requirements are validated at construction, so mistakes fail in CI rather than mid-conversation.

`appOnlyTools` are emitted with `visibility: ['app']`, which keeps them callable by the view via `tools/call` but hides them from the model.

### What this changes on the wire

For a server with no views, nothing: the `resources` capability is only declared when at least one `ui://` resource exists, so those handshakes stay byte-identical.

For a server with views, `resources/list` and `resources/read` are registered, tools carry a `_meta.ui.resourceUri` binding, and `resources/read` returns the HTML with the `text/html;profile=mcp-app` MIME type. The binding is emitted regardless of host support, since the spec's degradation path is that hosts without the extension ignore it and show the text result.

See [`dev/mcp-server-examples`](../../dev/mcp-server-examples/README.md) for two worked examples: `example_hello_app`, which uses all three paths, and `example_elicitation`, which is form collection alone — every field shape the spec allows, and a separate outcome for each way a request can end. They live in `dev/` rather than beside a published package because each view inlines hundreds of kilobytes, and a `private` package cannot carry them into a tarball.

### Usage attribution

Outbound Transcend requests carry three orthogonal headers:

- `x-transcend-mcp-caller` — recognized-host identity. This is the dimension usage dashboards group by, and the one Transcend matches by exact equality, so it has to stay a closed set. An explicitly forwarded header always wins, since a caller proxying on a user's behalf knows its own identity best. Otherwise the value is the session's `McpHostClient` from `initialize`, including `unknown` when the host is unrecognized. That keeps the dashboard's denominator honest: unrecognized traffic is an `unknown` slice, not a missing tag.
- `x-transcend-mcp-client-name` — discovery. A sanitized `clientInfo.name` from `initialize`, sent whenever a usable name exists, independent of how caller resolved. Restricted to an ASCII allowlist so a client-controlled string cannot break outbound `fetch` (header values are ByteStrings).
- `x-transcend-mcp-version` — `@transcend-io/mcp-server-base` package version, resolved at build time from this package's own manifest. Unlike the client-name header it needs no sanitization (the string is ours), which is why it is safe to group by on a dashboard while `x-transcend-mcp-client-name` is not. Absence means a pre-version-header client.

When a name shows up often enough in the discovery view, promote it: add a member to `McpHostClient`, a pattern in `HOST_PATTERNS`, and expect its dashboard series to split from `unknown` (and from the raw discovery label) at that point. The resolved host and capability set are also logged once per session.

## Scaffolding a tool, an app, or a form

One command writes any of the three, taking the kind, the package, and a kebab-case name:

```bash
pnpm mcp:new tool        docs      fetch-usage     # src/tools/docs_fetch_usage.ts
pnpm mcp:new app         inventory usage-chart     # a view, its ui:// resource, and the tool that opens it
pnpm mcp:new elicitation consent   confirm-optout  # a tool that collects its arguments through a form
```

| Kind          | Writes                                                                       | Touches the manifest      |
| ------------- | ---------------------------------------------------------------------------- | ------------------------- |
| `tool`        | one `defineTool`, no variants                                                | no                        |
| `app`         | the component, the `ui://` resource, and a `defineToolWithCapabilities` tool | on a package's first view |
| `elicitation` | one tool whose elicitation variant collects what the agent left out          | no                        |

Only `app` needs package-level wiring, which is why it is the only kind that edits a `package.json`: a tool that renders as text needs none of React, Vite, or Tailwind, and a command that added them anyway would put a browser toolchain into packages that ship no view.

The name is kebab-case for every kind because it has to serve as a directory name, a `*View.tsx` component name, the last segment of a `ui://` uri, and a tool name on the wire; `usage-chart` in the `docs` package becomes the tool `docs_usage_chart`, or `docs_usage_chart_app` for the `app` kind. The suffix is what lets one name carry both: a tool and the view that renders its result are separate registrations, and `example_hello_app` is spelled the same way. The generated file is left **unregistered** in all three cases, and the command prints the import and array entry to paste into `src/tools/index.ts`.

The prefix is the package's own, which is not always its directory's short name — `mcp-server-examples` ships `example_*` and `mcp-server-assessment` ships `assessments_*` — so the two exceptions are listed in `scripts/lib/mcp-new/shared.ts` rather than derived. The `ui://` uri and `pnpm mcp:inspect` still take the directory's short name, matching what those packages already serve.

Two things the templates deliberately do rather than stub:

- The `elicitation` kind emits a **valid** form — one required field, a real prompt — because `assertElicitFormSchema` and the empty-message check run at construction. A placeholder schema would produce a package that throws on boot.
- The `app` kind emits the MCP App variant **only**. To serve a form as well, generate one with `pnpm mcp:new elicitation` and move its variant across; `example_hello_app` is the worked example of a single tool serving all three paths.

## Building MCP App views

A view is a React component that runs inside the host's sandboxed iframe. It reaches the host through `useMcpApp` from `@transcend-io/mcp-server-base/ui`, and it is styled with the Tailwind theme published alongside that entry point.

### Building a view with React

Views are React apps built by Vite into a single self-contained HTML document. That single-file constraint is not a style preference: `resources/read` returns one string, and the host renders it in a sandboxed iframe with no same-origin server, so anything left as a separate file or CDN URL cannot be fetched. Inlining everything also means a view needs no CSP `resourceDomains` at all.

To add a view, run the generator and fill in the three files it writes:

```bash
pnpm mcp:new app inventory usage-chart
```

That is `src/ui/usage-chart/UsageChartView.tsx`, the component; `src/apps/usage-chart.ts`, which binds the built document to a `ui://` resource; and `src/tools/usage_chart_app.ts`, the `defineToolWithCapabilities` tool that opens it with the resource already bound. On a package with no views yet it also adds `tsconfig.ui.json`, the gitignore entry, three scripts, and the browser-side devDependencies, then installs them.

The one step it leaves alone is adding the generated factory to the array `src/tools/index.ts` returns. That line is where a tool's name and description become public API on a published package, so it stays a person's decision; the command prints the two lines to paste.

See [Scaffolding a tool, an app, or a form](#scaffolding-a-tool-an-app-or-a-form) for the other two kinds.

A view is discovered by convention rather than declared: **a directory under `src/ui/` holding exactly one `*View.tsx`, which exports the name its filename promises.** `HelloView.tsx` must export `HelloView`. Zero or several matching files is an error naming the directory, and `scripts/mcp-app-views.test.ts` catches a mismatch before a build does. Prefix a directory with `_` to hold shared code that is not a view.

Two files that a view needs are **synthesized during the build and exist nowhere on disk**, served by `synthesizeMcpAppViews` in the repo-root `vite.config.base.ts` from ids inside the view's own directory:

- `mcp-app-entry.tsx` — imports the component, mounts it into `#root` under `StrictMode`, and imports the stylesheet below.
- `mcp-app-theme.css` — imports the shared theme and registers the view's directory as a Tailwind source, i.e. exactly the two statements under [Styling and design tokens](#styling-and-design-tokens).

The tradeoff is deliberate: a view directory no longer shows how it boots, which is why that is spelled out here. If a view needs CSS that utilities cannot express — keyframes, or an `@layer components` rule — add `src/ui/<name>/<name>.css` and the synthesized entry imports it automatically.

#### Splitting a view into components

A view is one _entry_ component, not one file. Break it up freely:

```
src/ui/
  _shared/                       shared across views; `_` means "not a view"
    Badge.tsx
  cookie-triage/
    CookieTriageView.tsx         the entry — the only *View.tsx here
    ActionBar.tsx                sibling components
    ConfirmModal.tsx
    useTriageSelection.ts
    table/
      TriageTable.tsx            nested as deep as you like
      TableRow.tsx
    cookie-triage.css            optional, imported automatically
```

Two rules, both enforced rather than trusted:

- **Only the entry may end in `View.tsx`.** Discovery looks for exactly one match at the top level of the view directory, so a sibling named `ConfirmModalView.tsx` fails the build by name. Nesting is unaffected — `table/TriageTableView.tsx` would be fine, since the search is not recursive — but the simplest habit is to reserve the suffix for the entry.
- **Shared components go in a `_`-prefixed directory under `src/ui/`.** Tailwind generates utilities per document by scanning files, so the synthesized stylesheet sources every `_` directory in addition to the view's own. Putting a shared component anywhere else outside the view directory bundles it correctly and then renders it unstyled, which reads as a CSS bug rather than a missing `@source`. The cost of sourcing them is that shared components' utilities appear in every view's document, which is why `_shared` is for genuinely shared UI rather than a dumping ground.

```tsx
// src/ui/hello/HelloView.tsx
import { useMcpApp } from '@transcend-io/mcp-server-base/ui';

export function HelloView() {
  const { data, theme, callTool, isCallingTool } = useMcpApp<{ greeting: string }>({
    appInfo: { name: 'my-view', version: '1.0.0' },
  });

  return (
    <button onClick={() => void callTool('my_tool_refresh', {})} disabled={isCallingTool}>
      {data?.greeting} ({theme})
    </button>
  );
}
```

`useMcpApp` wraps `@modelcontextprotocol/ext-apps` with this repo's conventions: it connects to the host, applies the host's style variables to the document so the shared theme can pick them up, keeps `theme` in sync, and unwraps the `createToolResult` envelope into typed `data`. `callTool` invokes a tool on the originating server — this is how `appOnlyTools` are reached — and folds the response back into `data`, so a refresh re-renders the view.

Import view code only from `@transcend-io/mcp-server-base/ui`, never the package root. That subpath exists so browser code cannot reach the root barrel, which pulls in `node:async_hooks`, GraphQL clients, and OAuth.

A few constraints worth knowing before adding a view:

- **A package has no Vite config of its own.** `scripts/build-mcp-views.ts` discovers the package's views and runs one Vite build per view, because the single-file plugin collapses a whole bundle into one document — so a config naming a single entry could not express a package with two views, and would have silently emitted both into one document. The script also passes `configFile: false`, since Vitest auto-loads a `vite.config.ts` when a package has no test config and would otherwise replace the shared root config.
- **The built document is generated into `src/ui/generated/` and gitignored**, then inlined as a string by tsdown's `.html` text loader. Because a test reads the document off disk, `test` for a view-building package depends on `build` in `turbo.json`. Typecheck does not: the `declare module '*.html'` in `types/html.d.ts` is a wildcard, which TypeScript resolves without the file existing.
- **Views are checked by a second tsconfig.** `tsconfig.json` excludes `src/ui`, since browser code needs bundler module resolution — `@modelcontextprotocol/ext-apps` re-exports its React entry with extensionless specifiers that `NodeNext` refuses to resolve.
- **Expect a few hundred kilobytes per view.** React, the Apps SDK, and its Zod dependency are all inlined. That is fine for a locally served resource, but it is not a budget for many small views.

### Styling and design tokens

Views are styled with Tailwind utilities, but not stock Tailwind: the default theme is never imported, so `bg-red-500` does not exist. Every utility resolves through `@transcend-io/mcp-server-base/ui/theme.css`, which deliberately splits where a value comes from:

- **Surfaces, typography, radii, and shadows follow the host**, via the style variables it sends during the handshake. A view then looks native in light or dark Claude, and this covers what `@transcend-io/design-tokens` does not yet define.
- **Brand and status colors come from Transcend tokens**, so a view still reads as ours.
- **Spacing is Tailwind's own scale.** The MCP Apps spec omits spacing on purpose, since layouts break when it shifts underneath them.

So a view's stylesheet is two statements, which is why the build writes it rather than each view repeating it:

```css
@import '@transcend-io/mcp-server-base/ui/theme.css';

/* The theme sets `source(none)`, so each view registers its own files. */
@source './**/*.{ts,tsx}';
```

`.ts` is scanned as well as `.tsx` because class names are not confined to JSX. A status-to-color lookup or a variant map is an ordinary module, and one left unscanned bundles correctly and then renders unstyled — the same break as a shared component outside a `_` directory.

The `@source` cannot be left implicit even though it is now generated. Tailwind's automatic detection starts at the working directory, which differs depending on whether the build was invoked from the package or from the repo root, so an implicit scan would generate a different set of utilities depending on how it was run. Naming the directory is also what forces the synthesized stylesheet's id to sit _inside_ the view directory: Tailwind resolves `@source` against `path.dirname` of the stylesheet's id.

The namespaces available, all of which are host-aware:

| Utilities                                                  | Values                                                                                                                                         |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `bg-*`, `text-*`, `border-*`                               | `surface`, `surface-raised`, `surface-sunken`, `content`, `content-muted`, `content-subtle`, `content-inverse`, `line`, `line-subtle`, `focus` |
| `bg-brand*`, `text-brand-text`                             | `brand`, `brand-hovered`, `brand-pressed`, `brand-text`                                                                                        |
| `text-success`, `text-warning`, `text-danger`              | Transcend status colors                                                                                                                        |
| `text-sm`, `text-md`, `text-heading-sm`, `text-heading-md` | Font sizes, each carrying its line height                                                                                                      |
| `rounded-*`, `shadow-sm`, `font-*`                         | `sm`, `md`, `lg`, `full`                                                                                                                       |

Two rules follow from this. **Never write an arbitrary color or length** — `bg-[#fff]`, `p-[20px]`, `bg-[var(--color-surface)]` — because each one opts a view out of the host. Snap to the scale, or add a token to the theme if the scale is genuinely missing something. Arbitrary values that are _structural_ are fine, since they have no namespace to live in: `grid-cols-[max-content_1fr]` is the intended way to write that.

The theme replaces Tailwind's Preflight rather than layering on top of it, because a view lives in an iframe the host measures: the body has to be transparent and nothing may trap content in its own scroller. It is ordered as `@layer theme, tokens, base, components, utilities`, which is also how a view ends up dark inside a dark host — `tokens.css` declares `color-scheme: light`, and the later `base` layer overrides it.

### Developing and debugging a view

`pnpm mcp:inspect [pkg]` is the loop. It builds the target, starts a watcher that rebuilds a view on save, and opens the official MCP Inspector against it: a real `initialize` handshake, real `_meta.ui` binding, a real sandboxed iframe, and real `tools/call` traffic from inside the view. A simulated host is faster to iterate against but can only ever agree with itself, and the failures that matter here are the ones a real host produces.

It defaults to the umbrella server when no package is given, so every app across every published package is listed. Passing a package (`inventory`, or the full name) narrows the build, which is noticeably faster. Credentials are not needed for view work, but the umbrella starts without them, so any tool that calls the Transcend API fails at call time — that is expected, not a bug.

Add `--examples` to serve [`dev/mcp-server-examples`](../../dev/mcp-server-examples/README.md) instead. The umbrella does not aggregate it — a published package depending on a development-only one is exactly what keeping the reference views out of `packages/` prevents — so `--examples` is how you reach them, and it is the fastest way to check a host's render path against a view that needs no credentials.

The command uses Inspector v2, which was chosen by measurement rather than recency. All three of its clients declare `extensions["io.modelcontextprotocol/ui"]`, and its CLI has a scriptable probe:

```bash
npx -y @modelcontextprotocol/inspector@2 --cli node dev/mcp-server-examples/dist/cli.mjs \
  --method tools/list --app-info
# {"hasApp":true,"toolName":"example_hello_app","resourceUri":"ui://transcend-examples/hello",...}
```

v2 is a floor rather than a preference. Earlier Inspector releases ship an Apps tab that reads `_meta["ui/resourceUri"]`, but their client declares `capabilities: {}`, so a spec-correct server withholds every view and the tab renders empty. Running one against this loop would mean overriding negotiation to compensate, which is the one thing the loop exists to check.

A view's document is read once, when the app's sandbox iframe mounts, and never again while that app is alive — later tool calls arrive as `ui/notifications/tool-result` over the bridge. So after a rebuild the data a view renders updates but its markup does not, until you reopen the app or reload the tab. That is how a real host loads an app rather than an Inspector quirk, so reopening the app is the step that shows a markup edit.

Two things must be true for that reopen to show new markup, and both are handled for you. The server has to read the view from disk rather than the copy inlined at build time, and it has to actually receive `TRANSCEND_MCP_DEV_VIEWS` — which exporting it cannot achieve, because the Inspector spawns a stdio server with an allowlisted environment (`HOME`, `LOGNAME`, `PATH`, `SHELL`, `TERM`, `USER`) plus only what its `-e KEY=VALUE` flag supplied. `pnpm mcp:inspect` passes the flag. The same allowlist drops API credentials, and we deliberately leave them out rather than exposing them in a command line every local process can read, so use `--http` when a tool needs to reach the Transcend API: there we spawn the server ourselves and it inherits the environment normally.

#### When a view does not appear, check the capability gate first

This is the failure that looks exactly like a broken view. A tool's `_meta.ui` is only attached when the client declared the MCP Apps extension:

```typescript
// mcp-server-base/src/capabilities/derive.ts
function supportsMcpApps(capabilities: ClientCapabilities | undefined): boolean {
  const settings = capabilities?.extensions?.[MCP_UI_EXTENSION_ID];
  if (!settings) return false;
  // ...then the view's MIME type must be one the host accepts
}
```

That check is the same one `@modelcontextprotocol/ext-apps` makes server-side in `getUiCapability`, so the strictness is the spec's, not ours. A host that does not advertise gets no view and falls back to the text result, which is the intended degradation — but during development it is indistinguishable from a bug. Confirm what the host declared before looking anywhere else, and use `TRANSCEND_MCP_ASSUME_CAPABILITIES=MCP_APP` to force the issue for a host that ships app support without declaring it.

#### Seeing the other branches of a tool

To exercise a form, call `example_elicitation`. It ships no view, so v2 resolves it to the elicitation variant and renders the request under **Elicitation Request** — no override, no restart, and the same `mode: 'form'` path a production host takes.

The other branches of a tool that _does_ have a view are not reachable here, and the override cannot get you there: it only ever adds a capability, never removes one, while the Inspector declares both the Apps extension and `elicitation/create`. Such a tool therefore always resolves to its view.

That is a limit of the Inspector rather than a gap in coverage. Variant selection is exhaustively checked in [`define-tool-with-capabilities.test.ts`](mcp-server-base/tests/define-tool-with-capabilities.test.ts), which is both cheaper to consult and more precise than reading a rendered panel. It is also why `example_elicitation` deliberately ships no view: keeping one tool form-only is what makes the form flow reachable in this loop at all.

## Environment variables

All servers share the same environment variables:

| Variable                        | Required (stdio OAuth) | Default                                    | Description                                                                                                                                       |
| ------------------------------- | ---------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TRANSCEND_OAUTH_CLIENT_ID`     | Yes                    | —                                          | Client ID from [app.transcend.io/admin/oauth-clients](https://app.transcend.io/admin/oauth-clients); enables OAuth stdio mode when set            |
| `TRANSCEND_OAUTH_CLIENT_SECRET` | Yes                    | —                                          | Client secret from the same OAuth clients page                                                                                                    |
| `TRANSCEND_OAUTH_REDIRECT_PORT` | Yes                    | —                                          | Port number you choose for the OAuth callback server (must be available on your machine); **must match the port in your registered redirect URI** |
| `TRANSCEND_OAUTH_REDIRECT_HOST` | No                     | `127.0.0.1`                                | Loopback host for the OAuth callback (`127.0.0.1` or `::1` for `http://[::1]:{port}/callback`)                                                    |
| `TRANSCEND_OAUTH_ISSUER`        | No                     | auto-detected                              | OAuth issuer URL; production auto-detects region. Test-only override                                                                              |
| `TRANSCEND_API_KEY`             | No                     | —                                          | API key for stdio (alternative to OAuth) or HTTP default auth. Disables OAuth when set alongside client ID                                        |
| `TRANSCEND_API_URL`             | No                     | `https://api.transcend.io`                 | GraphQL backend API URL (matches CLI / main monorepo convention)                                                                                  |
| `SOMBRA_URL`                    | No                     | `https://multi-tenant.sombra.transcend.io` | Sombra REST API URL (matches CLI / SDK convention)                                                                                                |
| `TRANSCEND_DASHBOARD_URL`       | No                     | `https://app.transcend.io`                 | Override the admin-dashboard base URL used for deep links. Useful for testing against staging or local dashboards                                 |
| `TRANSCEND_HTTP_PORT`           | No                     | `3000`                                     | HTTP listen port                                                                                                                                  |
| `TRANSCEND_HTTP_HOST`           | No                     | `127.0.0.1`                                | HTTP listen host                                                                                                                                  |
| `TRANSCEND_MCP_CORS_ORIGINS`    | No                     | —                                          | Comma-separated allowed CORS origins                                                                                                              |
| `TRANSCEND_MCP_SESSION_TTL_MS`  | No                     | `1800000`                                  | Idle session timeout (ms)                                                                                                                         |

Two more exist for local view development only, both set automatically by `pnpm mcp:inspect`:

| Variable                            | Description                                                                                                                                                                                                       |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TRANSCEND_MCP_DEV_VIEWS`           | Read each view's built HTML from disk on every `resources/read` instead of using the copy inlined at build time, so a view rebuild needs no restart                                                               |
| `TRANSCEND_MCP_ASSUME_CAPABILITIES` | Comma-separated capabilities to force on regardless of what the client declared. Never set in production: it claims a host can render a view when it may not, turning a graceful text fallback into a blank panel |

**Monorepo:** store these in root **`secret.env`** (from [`secret.env.example`](../../secret.env.example)); load with `source` or [`scripts/mcp-run.sh`](../../scripts/mcp-run.sh). See [CONTRIBUTING.md](../../CONTRIBUTING.md#mcp-servers).

## Contributing

See the [MCP Servers section of CONTRIBUTING.md](../../CONTRIBUTING.md#mcp-servers) for how to add tools, run tests, and publish packages.
