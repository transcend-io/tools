# Transcend Agent Governance

Cursor plugin for [Transcend Agent Governance](https://transcend.io). Install it to give your IDE governed access to MCP tools through your organization's Agent Governance tenant.

This repository entry is the plugin skeleton and marketplace listing. MCP server wiring, skills, and rules ship in follow-up releases of the same plugin.

## What it does

- Surfaces **Transcend Agent Governance** inside Cursor as an installable plugin
- Prepares a governed MCP connection so agents in Cursor operate under your tenant's policies
- Keeps credentials and tool access tied to your Agent Governance organization (not ad-hoc local tokens pasted by hand)

## Requirements

You need an active **Transcend Agent Governance** tenant with:

1. Permission to create or use a connected-app credential for Cursor
2. Access to the tenant's MCP gateway endpoint and a short-lived or rotatable credential issued by your operators
3. Cursor Desktop with plugin / marketplace support enabled

Ask your Agent Governance administrator if you do not already have a Cursor connected-app credential.

## Install (local development)

Until the plugin is listed on the Cursor Marketplace, install from this repo:

1. Clone [`transcend-io/tools`](https://github.com/transcend-io/tools).
2. In Cursor, open the command palette and choose the local plugin / marketplace development install path.
3. Point it at this plugin directory:

   ```text
   plugins/cursor/TranscendAgentGovernance
   ```

4. Confirm the plugin appears as **Transcend Agent Governance** with the Transcend logo.

Marketplace install steps will replace this section once the listing is live.

## License

Apache-2.0 — see the repository [`LICENSE`](../../../LICENSE).
