# Setup

The agent loop uses the unified MCP server with both `config` and `consent` domains over stdio and OAuth.

| Domain    | Package (standalone)               | What it does                                                                |
| --------- | ---------------------------------- | --------------------------------------------------------------------------- |
| `config`  | `@transcend-io/mcp-server-config`  | Pulls, previews, and pushes `transcend.yml`.                                |
| `consent` | `@transcend-io/mcp-server-consent` | Lists unknown trackers, triages them, previews and deploys consent bundles. |

Prefer one [`@transcend-io/mcp`](https://github.com/transcend-io/tools/tree/main/packages/mcp/mcp#unified-server) entry per organization with `TRANSCEND_MCP_SERVERS=config,consent`. Use separate domain packages only when your client cannot run the unified server.

## OAuth client

Create the OAuth client per the [MCP README OAuth client setup](https://github.com/transcend-io/tools/tree/main/packages/mcp#oauth-client-setup). An organization admin creates the client, registers `http://127.0.0.1:{port}/callback` for a port you choose, and sets `TRANSCEND_OAUTH_REDIRECT_PORT` to that same port. Use `127.0.0.1`, not `localhost`.

The first tool call opens a browser to sign in. Tokens live in memory only. Restarting the server means signing in again.

## One org, one entry

OAuth tokens belong to one organization. Add one MCP server entry per organization. Name each entry after the organization, such as `transcend-staging` and `transcend-production`.

Never point one entry at several organizations. A push goes to whichever organization signed in.

## Resource allowlist

Set `TRANSCEND_CONFIG_RESOURCES` to narrow OAuth sign-in and reject pull and push for other sections. Unknown names fail at startup.

For consent work, use:

```text
consentManager,purposes,dataFlows,cookies,consentSites
```

With the allowlist set, `config_pull` pulls only these sections by default. A yml with any other section fails on push.

## Example MCP client config

```json
{
  "mcpServers": {
    "transcend-staging": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp"],
      "env": {
        "TRANSCEND_OAUTH_CLIENT_ID": "staging-client-id",
        "TRANSCEND_OAUTH_CLIENT_SECRET": "staging-client-secret",
        "TRANSCEND_OAUTH_REDIRECT_PORT": "4601",
        "TRANSCEND_MCP_SERVERS": "config,consent",
        "TRANSCEND_CONFIG_RESOURCES": "consentManager,purposes,dataFlows,cookies,consentSites"
      }
    },
    "transcend-production": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp"],
      "env": {
        "TRANSCEND_OAUTH_CLIENT_ID": "production-client-id",
        "TRANSCEND_OAUTH_CLIENT_SECRET": "production-client-secret",
        "TRANSCEND_OAUTH_REDIRECT_PORT": "4602",
        "TRANSCEND_MCP_SERVERS": "config,consent",
        "TRANSCEND_CONFIG_RESOURCES": "consentManager,purposes,dataFlows,cookies,consentSites"
      }
    }
  }
}
```

Read secrets from the environment or a gitignored file. Do not paste real values into a committed config.

Give each organization one entry. Tell the agent which organization to use by server name. Use a separate `filePath` per organization. See [One server entry per organization](https://github.com/transcend-io/tools/tree/main/packages/mcp/mcp-server-config#one-server-entry-per-organization) in the config server README.

## Approvals

Set your MCP client to approve every call to these tools by hand:

- `config_push`
- `consent_deploy_bundle`
- `consent_bulk_triage`
- `consent_update_cookies`
- `consent_update_data_flows`
- `consent_delete_cookies`
- `consent_delete_data_flows`
- `consent_write_consent_manager`
- `consent_write_purposes`
- `consent_write_sites`

Auto-approving reads is safe: `config_pull`, `config_diff`, `config_preview_push`, `config_get_schema`, and the `consent_list_*` and `consent_get_*` tools.

Run `config_get_schema` with `resources` set to a section name to see the file format for that section.
