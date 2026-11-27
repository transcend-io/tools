# @transcend-io/mcp-server-consent

> **Beta** — this package is under active development. APIs may change without notice.

Transcend MCP Server for consent management. Provides tools for managing consent preferences, cookie triage, data flow management, and consent regime configuration.

Requires **Node.js ≥ 22.12** (see `engines` in `package.json`).

For local runs from this repository, copy [`secret.env.example`](../../../secret.env.example) to **`secret.env`** at the repo root (gitignored) and set the OAuth environment variables (see **Run from the monorepo**).

## Install

Install the CLI globally:

```bash
npm install -g @transcend-io/mcp-server-consent
```

Or run from a checkout of this repository (see **Run from the monorepo** below).

## Usage

```bash
# With OAuth env vars in the environment; from the monorepo use secret.env (see Run from the monorepo)
TRANSCEND_OAUTH_CLIENT_ID=your-client-id \
TRANSCEND_OAUTH_CLIENT_SECRET=your-client-secret \
TRANSCEND_OAUTH_REDIRECT_PORT=your-client-redirect-port \
transcend-mcp-consent
```

The process speaks MCP over **stdio** and is meant to be launched by an MCP client (for example Cursor or Claude Desktop), not used as an interactive shell.

### OAuth client setup

OAuth stdio is the recommended path for MCP clients (Cursor, Claude Desktop). Requires **org admin** access to create OAuth clients.

1. Navigate to [app.transcend.io/admin/oauth-clients](https://app.transcend.io/admin/oauth-clients) and create an OAuth client.
2. Copy the **client ID** and **client secret**.
3. Choose an available localhost port number, then register `http://127.0.0.1:{port}/callback` on the OAuth client (`{port}` is the number you chose). Use **`127.0.0.1`, not `localhost`**, and ensure the path is `/callback`. Set `TRANSCEND_OAUTH_REDIRECT_PORT` to the same port number.

At startup the server verifies client ID, secret, and redirect URI. On first tool call your MCP client asks you to sign in, and a browser opens for login after you accept. The login is saved and reused after a restart; see [Saved login](../README.md#saved-login).

**OAuth scopes:** `ViewConsentManager`, `ViewAssignedConsentManager`, `ManageConsentManager`, `ManageAssignedConsentManager`, `ViewDataFlow`, `ManageDataFlow`, `ManageConsentManagerDeveloperSettings`, `ViewPreferenceStoreSettings`, `ManagePreferenceStoreSettings`. The signed-in user must hold these permissions. See [`src/scopes.ts`](./src/scopes.ts).

Full setup, troubleshooting, and multi-server guidance: [MCP root README](../README.md#oauth-client-setup).

> **API key alternative:** set `TRANSCEND_API_KEY` instead of OAuth vars for stdio (OAuth is disabled when both are set).

### MCP client configuration

`npx` runs the package’s `transcend-mcp-consent` binary (see `bin` in `package.json`).

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
    }
  }
}
```

When developing in this repository, reuse the same variable names from root **`secret.env`** in the `env` block, or use your client’s env-file support if it has one.

### Run from the monorepo

1. **Credentials** — From the repository root, copy [`secret.env.example`](../../../secret.env.example) to **`secret.env`** and set `TRANSCEND_OAUTH_CLIENT_ID`, `TRANSCEND_OAUTH_CLIENT_SECRET`, and `TRANSCEND_OAUTH_REDIRECT_PORT` (and optional URL overrides).

2. **Build and run** — `node ./dist/cli.mjs` matches the `transcend-mcp-consent` `bin` (use `node` because `pnpm exec transcend-mcp-consent` may not resolve this package’s own binary in a pnpm workspace):

```bash
# from the repository root — builds this package and its dependencies (e.g. mcp-server-base)
pnpm exec turbo run build --filter="@transcend-io/mcp-server-consent..."
set -a && source ./secret.env && set +a
pnpm -F @transcend-io/mcp-server-consent exec node ./dist/cli.mjs
```

**Alternative:** `./scripts/mcp-run.sh ./packages/mcp/mcp-server-consent/dist/cli.mjs` (sources `secret.env` when present; run after build).

See [CONTRIBUTING.md](../../../CONTRIBUTING.md#mcp-servers) for workspace layout and `pnpm --filter` workflows.

### Environment variables

| Variable                        | Required (stdio OAuth) | Default                                    | Description                                                                                                                                       |
| ------------------------------- | ---------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TRANSCEND_OAUTH_CLIENT_ID`     | Yes                    | —                                          | Client ID from [app.transcend.io/admin/oauth-clients](https://app.transcend.io/admin/oauth-clients)                                               |
| `TRANSCEND_OAUTH_CLIENT_SECRET` | Yes                    | —                                          | Client secret from the same OAuth clients page                                                                                                    |
| `TRANSCEND_OAUTH_REDIRECT_PORT` | Yes                    | —                                          | Port number you choose for the OAuth callback server (must be available on your machine); **must match the port in your registered redirect URI** |
| `TRANSCEND_OAUTH_REDIRECT_HOST` | No                     | `127.0.0.1`                                | Loopback host for the OAuth callback (`127.0.0.1` or `::1` for `http://[::1]:{port}/callback`)                                                    |
| `TRANSCEND_OAUTH_ISSUER`        | No                     | auto-detected                              | OAuth issuer URL; production auto-detects region. Test-only override                                                                              |
| `TRANSCEND_API_KEY`             | No                     | —                                          | API key for stdio (alternative to OAuth). Disables OAuth when set alongside client ID                                                             |
| `TRANSCEND_API_URL`             | No                     | `https://api.transcend.io`                 | GraphQL backend API URL (matches CLI convention)                                                                                                  |
| `SOMBRA_URL`                    | No                     | `https://multi-tenant.sombra.transcend.io` | Sombra REST API URL (matches CLI / SDK convention)                                                                                                |

**Monorepo:** keep these in root **`secret.env`** (from [`secret.env.example`](../../../secret.env.example)); see **Run from the monorepo**.

## Tools

- `consent_get_preferences` — Get consent preferences for a user
- `consent_list_purposes` — List tracking purposes
- `consent_list_data_flows` — List data flows
- `consent_list_cookies` — List cookies
- `consent_list_airgap_bundles` — List Airgap bundles
- `consent_list_regimes` — List consent regimes
- `consent_get_inventory_stats` — Cookie/data-flow inventory triage counts (live, needs review, junk). Matches the Consent Manager tables; CSP data flows are omitted like the UI.
- `consent_cookie_triage_review_app` — Open an interactive cookie/data-flow triage review UI; pass `triageType` (`cookies` | `data_flows`). MCP App hosts get a fast shell then the view pages `consent_list_cookies` or `consent_list_data_flows`; other hosts get the full payload from the tool
- `consent_get_aggregate_analytics` — Aggregate consent analytics (`airgapBundleAggregateAnalytics`)
- `consent_get_timeseries_analytics` — Timeseries consent analytics (`airgapBundleTimeseriesAnalytics`)
- `consent_get_analytics_data` — Consent metrics via `analyticsData` (opt-in/out, signals, sessions)
- `consent_update_cookies` — Update cookies (approve, junk, assign purposes)
- `consent_delete_cookies` — Permanently delete cookies by ID (MCP App only; hidden from agents)
- `consent_update_data_flows` — Update data flows
- `consent_delete_data_flows` — Permanently delete data flows by ID (MCP App only; hidden from agents)
- `consent_bulk_triage` — Bulk approve or junk cookies and data flows
- `consent_list_roc_records` - List record of consent records for a user
- `consent_preview_deploy` — Preview consent bundle changes before deploy (per-module diffs; read-only)
- `consent_deploy_bundle` — Deploy the consent manager bundle to `TEST` or `PRODUCTION` (requires `environment`; asks for human confirmation with change summary)
- `consent_list_sites` - List consent sites (hosts Airgap discovers) with owners, teams and attributes
- `consent_write_sites` - Create or update consent sites by host (like the `consent-sites` section of `transcend.yml`)
- `consent_write_consent_manager` — Create or update consent manager settings, experiences, UI variants and themes (the `consent-manager` section of `transcend.yml`)
- `consent_write_purposes` — Create or update consent purposes and their preference topics (the `purposes` section of `transcend.yml`)

Analytics tools require the **ViewConsentManager** scope (included in this server's OAuth scopes). See [Consent Analytics Using GraphQL API](https://docs.transcend.io/docs/articles/consent-management/configuration/consent-stats-with-gql-api). `consent_list_roc_records` requires the **ViewManagedConsentDatabaseAdminApi** scope. `consent_list_sites` requires **ViewConsentManager** and `consent_write_sites` requires **ManageConsentManager**.

## Triage loop

Use this loop to clear the backlog of new cookies and data flows. Triage saves changes. Visitors see them after you deploy.

1. **Count the backlog.** Call `consent_get_inventory_stats`.
2. **List what needs review.** Call `consent_list_data_flows` and `consent_list_cookies`. Both require `status: "NEEDS_REVIEW"`. Page with `limit` and `offset`. To sort by traffic, pass both `orderField` and `orderDirection`.
3. **Check your purposes.** Call `consent_list_purposes`. Use only the slugs it returns.
4. **Research each tracker.** Use the `consent-research-tracker` prompt. Use `consent-inspect-site` to see a tracker on a live site.
5. **Apply decisions.** Call `consent_bulk_triage` with one item per tracker:
   - `type`: `cookie` or `data_flow`
   - `id`: the data flow ID, or the cookie name
   - `action`: `APPROVE` or `JUNK`
   - `trackingPurposes` and `service`: optional. Set `trackingPurposes` when you approve.
6. **Preview the deploy.** Call `consent_preview_deploy` with `environment` set to `TEST` or `PRODUCTION`. It is read-only.
7. **Deploy.** Call `consent_deploy_bundle` with the same `environment`. Your client asks you to confirm. `PRODUCTION` is the bundle that site visitors load. Deploy `TEST` first.

For a guided version, use the `consent-triage` prompt.

## Direct tools or `transcend.yml`

Some changes have a direct tool. For the rest, edit a `transcend.yml` file with the [config server](../mcp-server-config/README.md), then push it.

| Change                                                             | How                                                                                                   |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Approve or junk trackers, set purposes and service                 | Direct: `consent_bulk_triage`, `consent_update_cookies`, `consent_update_data_flows`                  |
| Add consent sites, or change their owners, teams, and attributes   | Direct: `consent_write_sites`                                                                         |
| Change consent manager settings, experiences, UI variants, themes  | Direct: `consent_write_consent_manager`                                                               |
| Create or update purposes and preference topics                    | Direct: `consent_write_purposes`                                                                      |
| Add many data flows, or review changes in git before they go live  | `transcend.yml`: `data-flows` section, via `config_pull`, `config_diff`, `config_push`                |
| Keep one file in git, or move the same setup between organizations | `transcend.yml`: `consent-manager`, `consent-sites`, `data-flows`, `cookies`, and `purposes` sections |
| Anything without a direct tool, such as partitions or attributes   | `transcend.yml`                                                                                       |

Neither path deploys. Both write saved settings. Call `consent_deploy_bundle` to publish them.

`consent_write_consent_manager` replaces the whole `domains` list when you pass `domains`, like a push does. Pass every domain you want to keep.

See [Consent as code](../mcp-server-config/README.md#consent-as-code) for the full walkthrough.

## Prompts

Workflow templates discoverable via MCP `prompts/list` / `prompts/get`:

- `consent-triage` — End-to-end cookie/data-flow triage via `consent_cookie_triage_review_app` + classification push
- `consent-research-tracker` — Research methodology for classifying a single tracker
- `consent-inspect-site` — Live site investigation via browser DevTools / airgap console

## Related packages

Also available as part of the unified [`@transcend-io/mcp`](../mcp/README.md), which includes all domains. See the [root README](../../../README.md#mcp-servers) for the full list.
