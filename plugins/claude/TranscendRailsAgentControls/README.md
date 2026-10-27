# Transcend Rails Agent Controls

Claude plugin for [Transcend Rails Agent Controls](https://www.withrails.ai). Install it from your organization's Claude plugin marketplace to reach governed MCP tools through Transcend's policy gateway.

## What it does

- Surfaces **Transcend Rails Agent Controls** inside Claude as an installable plugin
- Connects Claude to the Agent Governance MCP gateway over Streamable HTTP, at a **fixed** address (`https://mcp.withrails.ai/mcp/agent`)
- Ships **no** bundled credential, OAuth client, or `${user_config.*}` variable — there is nothing to configure at install time

This plugin does **not** bundle Transcend's separate DD&C MCP packages.

## v1 scope: org marketplace only

This plugin is distributed as a **private org marketplace** plugin (see [Install](#install)). It is **not** submitted to Anthropic's public plugin directory in this release. Directory submission is tracked separately and is blocked on [LINK-8760](https://linear.app/transcend/issue/LINK-8760/epic-claude-code-org-wide-myelin-mcp-and-hooks-governance): Claude Code installs plugins, and this plugin's MCP server cannot complete sign-in there today (see [Known gap: Claude Code sign-in](#known-gap-claude-code-sign-in)).

## Requirements

You need:

1. An active **Transcend Agent Governance** organization
2. Claude Desktop, claude.ai, or Claude Code with plugin / marketplace support
3. A deployed Agent Governance environment reachable at `https://mcp.withrails.ai/mcp/agent`

Ask your Agent Governance administrator if you are unsure whether your organization is provisioned.

## Install

Install from this repository as an org marketplace — no repo clone or `.mcp.json` editing needed for end users.

```bash
# Register the marketplace once per machine
claude plugin marketplace add transcend-io/tools

# Install the plugin from it
claude plugin install transcend-rails-agent-controls@transcend-plugins
```

In Claude Desktop / claude.ai, an organization admin can also add `transcend-io/tools` as an org plugin source so **Transcend Rails Agent Controls** appears under **Customize → Connectors**.

After install:

1. Open **Customize → Connectors** (Claude Desktop / claude.ai) and find **Transcend Rails Agent Controls**, or run `/mcp` in Claude Code.
2. Choose **Connect** if the gateway requires a sign-in step. See the known gap below for Claude Code.
3. Confirm tools appear (names follow the aggregator's `{slug}__{tool}` convention).

### After first connection

A successful connection auto-registers a **connected agent** for your user in the organization (empty MCP server assignment by default — fail-closed). An administrator must assign MCP servers / policy before tools appear.

## Known gap: Claude Code sign-in

This plugin's `.mcp.json` declares a fixed gateway URL and **no** auth block — by design, so nothing here hardcodes a credential or a half-finished OAuth flow. Whether that connection needs a browser sign-in, and whether sign-in succeeds, depends on the Claude surface:

- **Claude Desktop / claude.ai**: browser sign-in through **Customize → Connectors → Connect** is the expected path once your organization's gateway requires it.
- **Claude Code**: browser sign-in to this gateway does **not** work today. Claude Code installs plugins, but the sign-in flow this gateway needs is not yet supported there. This is tracked in [LINK-8760](https://linear.app/transcend/issue/LINK-8760/epic-claude-code-org-wide-myelin-mcp-and-hooks-governance), and submitting this plugin to Anthropic's public directory waits on that work.

If you hit a sign-in failure in Claude Code, that is this known gap, not a misconfiguration to work around with a pasted token.

## Troubleshooting

See the bundled skills for structured troubleshooting:

- [`verify-governed-connection`](./skills/verify-governed-connection/SKILL.md) — connection health, missing tools, the Claude Code sign-in gap
- [`troubleshoot-policy-denial`](./skills/troubleshoot-policy-denial/SKILL.md) — reading a policy deny or approval-required response

Your organization's Agent Governance gateway documents its own MCP tool-calling guidance; these skills cover plugin-level troubleshooting only.

## Versioning and releases

`version` in [`.claude-plugin/plugin.json`](./.claude-plugin/plugin.json) is bumped **by hand** on meaningful releases (starting at `0.1.0`). There is no automated version-bump tooling for this plugin yet.

Tagged releases use the pattern `claude-plugin-v*` (for example `claude-plugin-v0.1.0`). A future Anthropic directory submission pins a specific release tag, not `main`, so a tag marks a known-good snapshot of this plugin directory independent of unrelated monorepo changes.

| Version | Tag              | Notes                                |
| ------- | ---------------- | ------------------------------------ |
| 0.1.0   | _not yet tagged_ | Initial org-marketplace-only release |

## License

Apache-2.0 — see the repository [`LICENSE`](../../../LICENSE).
