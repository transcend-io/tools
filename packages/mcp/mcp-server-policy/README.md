# @transcend-io/mcp-server-policy

> **Beta** — this package is under active development. APIs may change without notice.

Transcend MCP Server for Policy Engine (Seneca). Package scaffold, OAuth scopes, and Policy Engine HTTP client helpers. Tools (`policy_help`, `policy_status`, `policy_publish`, `policy_set_live`) land in follow-up PRs.

Requires **Node.js ≥ 22.12** (see `engines` in `package.json`).

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
