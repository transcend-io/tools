# Triage loop

Run these steps in order. Stop and ask the user at every approval step.

## 1. Pull

Call `config_pull` with an absolute path ending in `.yml` and `overwrite: true` if the file exists. Commit or stash local edits first so the diff stays readable.

Check that the pulled organization is the one you mean to change before you edit.

## 2. List unknowns

- `consent_list_data_flows` with `status: NEEDS_REVIEW`.
- `consent_list_cookies` with `status: NEEDS_REVIEW`.
- `consent_list_purposes` for the purpose slugs you may assign.

Sort by occurrences to handle the busiest trackers first. Note the hosts and pages where each tracker appears.

## 3. Research

For each unknown host or cookie:

1. Find the vendor and what the tracker does.
2. Pick the purpose with the least tracking that still fits.
3. Prefer essential for first-party infrastructure and content delivery.
4. Use functional for sign-in and embedded UI.
5. Use analytics or advertising only when the tracker measures or targets.

Do not guess. Leave an unclear item in `NEEDS_REVIEW` and tell the user.

## 4. Edit the yml

Edit `data-flows` and `cookies` entries to set `trackingPurposes`, `service`, `description`, and `status: LIVE` to approve. Leave junk out of the yml (see below).

```yaml
data-flows:
  - value: cdn.example.com
    type: HOST
    description: Static assets for the marketing site
    trackingPurposes:
      - Essential
    service: exampleCdn
    status: LIVE
```

## 5. Preview

Call `config_diff` for a fenced diff to show in chat. Call `config_preview_push` for a structured summary. Both are read-only. Show the output to the user.

## 6. Push

Call `config_push` on the absolute yml path after the user approves. Read the result for errors and warnings. Do not retry blindly on failure. Fix the yml first.

A push saves the configuration. It does not publish it to visitors.

## 7. Deploy

1. Call `consent_preview_deploy` with `environment: TEST`. Show the module diffs.
2. Call `consent_deploy_bundle` with `environment: TEST` after approval. Check `/cm-test` on a real page.
3. Call `consent_preview_deploy` with `environment: PRODUCTION`. Show the diffs.
4. Call `consent_deploy_bundle` with `environment: PRODUCTION` after approval. Visitors load this bundle right away.

Use `consent_list_airgap_bundles` to see what each environment serves.

## 8. Verify

Call `config_pull` again to a temporary path. Diff it against the committed file. They must match. Commit the yml.

## Rules that prevent damage

| Rule                                                      | Why                                                                                                             |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| A push replaces the whole `consent-manager.domains` list. | A short list removes live hosts. Pull first. Keep every live host. Add new hosts to the existing list.          |
| A push does not deploy.                                   | Run the deploy steps. Otherwise visitors keep the old bundle.                                                   |
| `default-consent` on `purposes` is ignored by push.       | Pull may show it. Editing it in the yml changes nothing. Do not rely on it.                                     |
| The yml has no junk field.                                | Use `consent_bulk_triage` with `action: JUNK` for bot or noise traffic. Use `APPROVE` with purposes to approve. |
| Keep `consent-sites` in sync with domains.                | Each host in `consent-manager.domains` should have a `consent-sites` entry with the same `host`.                |
| Hosts in `consent-sites` must be unique.                  | A duplicate host fails the push.                                                                                |

## Junk

Call `consent_bulk_triage` with a list of items. Each item has a `type` of `cookie` or `data_flow`, an `id`, and an `action` of `APPROVE` or `JUNK`. For cookies the `id` is the cookie name. For data flows it is the data flow ID.

Junk is not in the yml. A later pull will not show it. Do not add the item back to the yml.

## Consent sites

`consent-sites` entries take `host`, optional `site`, `description`, `owners` (emails of users in the organization), `teams` (team names), and `attributes`. Use `consent_list_sites` to read them and `config_get_schema` to see the format.

## Deploying from the CLI

`transcend consent update-consent-manager --deploy` also upgrades airgap.js to the latest version before it deploys. The MCP `consent_deploy_bundle` tool deploys the saved configuration and does not upgrade. Use the CLI path only when you want the upgrade, and check the result on `TEST` first.
