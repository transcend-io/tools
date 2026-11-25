# Setup

The agent loop uses two MCP servers. Both run locally over stdio with OAuth.

| Server                             | What it does                                                                |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `@transcend-io/mcp-server-config`  | Pulls, previews, and pushes `transcend.yml`.                                |
| `@transcend-io/mcp-server-consent` | Lists unknown trackers, triages them, previews and deploys consent bundles. |

## OAuth client

An organization admin creates the client.

1. Open the OAuth clients page in the Transcend admin dashboard.
2. Create a client and copy the client ID and secret.
3. Pick two free local ports, one per server.
4. Register `http://127.0.0.1:{port}/callback` for each port on the client. Use `127.0.0.1`, not `localhost`.
5. Set `TRANSCEND_OAUTH_REDIRECT_PORT` on each server to its own port.

One OAuth client can hold many redirect URIs. Each server needs its own port.

The first tool call opens a browser to sign in. Tokens live in memory only. Restarting the server means signing in again. The signed-in user needs the Consent Manager and data flow permissions listed in the [MCP README](https://github.com/transcend-io/tools/tree/main/packages/mcp#readme).

## One org, one entry

OAuth tokens belong to one organization. Add a separate pair of server entries for each organization. Name them by organization, such as `transcend-config-example` and `transcend-consent-example`. Give each entry its own OAuth client and its own ports.

Never point one entry at several organizations. A push would go to whichever organization signed in.

## Resource allowlist

Set `TRANSCEND_CONFIG_RESOURCES` on the config server. It narrows OAuth sign-in and rejects pull and push for other sections. Unknown names fail at startup.

For consent work, use:

```text
consentManager,purposes,dataFlows,cookies,consentSites
```

With the allowlist set, `config_pull` pulls only these sections by default. A yml with any other section fails on push.

## Example MCP client config

```json
{
  "mcpServers": {
    "transcend-config-example": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server-config"],
      "env": {
        "TRANSCEND_OAUTH_CLIENT_ID": "your-client-id",
        "TRANSCEND_OAUTH_CLIENT_SECRET": "your-client-secret",
        "TRANSCEND_OAUTH_REDIRECT_PORT": "5591",
        "TRANSCEND_CONFIG_RESOURCES": "consentManager,purposes,dataFlows,cookies,consentSites"
      }
    },
    "transcend-consent-example": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server-consent"],
      "env": {
        "TRANSCEND_OAUTH_CLIENT_ID": "your-client-id",
        "TRANSCEND_OAUTH_CLIENT_SECRET": "your-client-secret",
        "TRANSCEND_OAUTH_REDIRECT_PORT": "5592"
      }
    }
  }
}
```

Read secrets from the environment or a gitignored file. Do not paste real values into a committed config.

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
