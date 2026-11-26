---
name: transcend-consent-as-code
description: Triages and manages Transcend Consent Manager cookies, data flows, purposes, and consent sites as code in transcend.yml. Use for unknown tracker triage, NEEDS_REVIEW cookies or data flows, consent-manager domains, consent bundle deploys, or consent CI with transcend inventory push.
compatibility: Requires the Transcend CLI and, for the agent loop, the @transcend-io/mcp unified server (config and consent domains) or the standalone config and consent MCP servers.
---

# Transcend Consent as Code

Keep Consent Manager configuration in a `transcend.yml` file. Use MCP config and consent tools to pull it, edit it, push it, and deploy it, with a human approving every write.

## When to use

- Cookies or data flows sit in `NEEDS_REVIEW` and need a purpose and a decision.
- You change `consent-manager.domains`, `purposes`, `data-flows`, `cookies`, or `consent-sites`.
- You want pull request review and CI around Consent Manager changes.

## Workflow

1. For OAuth clients, MCP server entries, and the resource allowlist, read [references/setup.md](references/setup.md).
2. For the triage loop, the damage rules, and junk handling, read [references/triage-loop.md](references/triage-loop.md).
3. For pull request checks and merge pushes, read [references/ci.md](references/ci.md).
4. Run the loop in this order:
   1. `config_pull` the current state to an absolute `.yml` path. Pass `resources` for consent sections when the allowlist is unset.
   2. List unknowns with `consent_get_inventory_stats`, then `consent_list_data_flows` and `consent_list_cookies` with `status: NEEDS_REVIEW`.
   3. Edit the yml or use `consent_bulk_triage` for direct approvals.
   4. Run `transcend inventory check --rules '*'` on the file when you changed the yml.
   5. Preview with `config_diff` or `config_preview_push`.
   6. `config_push` after the user approves.
   7. `consent_preview_deploy`, then `consent_deploy_bundle` after the user approves.
   8. `config_pull` again and diff against the committed file to verify.

## Documentation

- Every Transcend CLI command and subcommand provides contextual help with `transcend <command> --help`.
- Use the [Transcend CLI README](https://github.com/transcend-io/tools/tree/main/packages/cli#readme) for command documentation and examples.
- Use the [Consent as code walkthrough](https://github.com/transcend-io/tools/tree/main/packages/mcp/mcp-server-config#consent-as-code) in the config server README.
- Use the [Triage loop and direct tools](https://github.com/transcend-io/tools/tree/main/packages/mcp/mcp-server-consent#triage-loop) in the consent server README.
- Use the [Transcend MCP servers README](https://github.com/transcend-io/tools/tree/main/packages/mcp#readme) for OAuth setup and scopes.
- Use the [Transcend documentation index](https://docs.transcend.io/llms.txt) to find current product documentation.

## Guardrails

- A push replaces the whole `consent-manager.domains` list. Pull first and keep every live host. The same rule applies to `consent_write_consent_manager` when you pass `domains`.
- A push does not deploy. Visitors see changes only after `consent_deploy_bundle`.
- Never deploy to `PRODUCTION` without showing `consent_preview_deploy` output and getting approval.
- Mark junk with `consent_bulk_triage`, not the yml.
- Never commit credentials. Keep OAuth secrets and API keys in the secret store.
- Do not invent purposes. Use the slugs from `consent_list_purposes`.
