# @transcend-io/mcp-server-policy

> **Beta** — this package is under active development. APIs may change without notice.

Transcend MCP Server for Policy Engine. Provides tools to author OPA Rego policies and inspect bundle versions. Publish / set-live tools land in a follow-up PR.

Requires **Node.js ≥ 22.12** (see `engines` in `package.json`).

## Tools

| Tool            | Description                                            |
| --------------- | ------------------------------------------------------ |
| `policy_help`   | Embedded starter templates for policy bundles (no network) |
| `policy_status` | List bundles, version history, presigned download URLs |

Operations mirror `transcend policy` CLI commands. Use a single credential with **Activate Policy** scope — it includes Manage and View.

## Install

```bash
npm install -g @transcend-io/mcp-server-policy
```

## Usage

```bash
TRANSCEND_OAUTH_CLIENT_ID=your-client-id \
TRANSCEND_OAUTH_CLIENT_SECRET=your-client-secret \
TRANSCEND_OAUTH_REDIRECT_PORT=your-client-redirect-port \
transcend-mcp-policy
```

**OAuth scopes:** `ActivatePolicyEngineBundles` (covers all policy tools). See [`src/scopes.ts`](./src/scopes.ts).

Full setup: [MCP root README](../README.md#oauth-client-setup).
