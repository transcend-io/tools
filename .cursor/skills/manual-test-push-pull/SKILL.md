---
name: manual-test-push-pull
description: Interactive manual QA of `transcend inventory pull` / `inventory push` against a live test org. Triggers - "manual test push/pull", "manually test pull", "QA inventory sync", "test push for {resource}"
---

# Manual Test Push/Pull Skill

Created By: Michael Farrell
Last Edited: July 9, 2026

## Overview

This skill drives an interactive, human-in-the-loop QA session for the CLI's config sync commands (`transcend inventory pull` and `transcend inventory push`). The agent runs commands and opens artifacts; the **user visually verifies** each step in the Admin Dashboard and signs off before proceeding.

High-level flow:

1. Collect a test API key and scope (which resources to test)
2. Baseline pull to YAML; open the YAML and the matching Admin UI page side-by-side
3. User visually compares and signs off on the baseline
4. Field-by-field mutation loop: for every field a resource supports, apply an update (or create a new resource), push it, verify in the UI and via re-pull, and get user sign-off on each
5. Summarize results and clean up

## Trigger

- User types `/manual-test-push-pull`
- User says "manually test pull/push", "QA the inventory sync", "test push for business entities", etc.

## Safety Rules

| Rule                                                              | Why                                         |
| ----------------------------------------------------------------- | ------------------------------------------- |
| **Never commit, log, or echo the API key**                        | Secret. Keep it in an env var only          |
| **Only run against a test/sandbox organization**                  | Push overwrites Admin Dashboard values      |
| **Write test YAML to a scratch dir (e.g. `/tmp/tr-manual-test`)** | Never leave `transcend.yml` in the repo     |
| **Keep an untouched baseline copy of the first pull**             | Needed to diff and to restore field values  |
| **Never push `--resources=all` pulls blindly**                    | Limits blast radius to resources under test |

Remember: push **creates and updates** resources but never deletes them. Any resources created during testing must be deleted manually in the Admin Dashboard during cleanup.

## Prerequisites

Build the CLI (dependency order matters):

```bash
pnpm run --dir packages/utils build && \
  pnpm run --dir packages/sdk build && \
  pnpm run --dir packages/cli build
```

Run the local build via `pnpm -F cli start ...` (equivalent to the published `transcend` binary).

## Workflow

### Step 1: Collect Test Inputs

Ask the user for:

1. **Test API key** — instruct them to paste it or export it themselves. Store it only as an env var for the session:

```bash
# User pastes key; agent sets it without echoing
export TRANSCEND_API_KEY='<pasted-key>'
```

If the key needs to be created first, point the user at https://app.transcend.io/infrastructure/api-keys (it needs scopes for the resources under test — see the scopes table in `packages/cli/README.md`).

2. **Backend URL** — default `https://api.transcend.io`; US hosting is `https://api.us.transcend.io` (pass via `--transcendUrl`).
3. **Resources to test** — one or a few values from `TranscendPullResource` (`packages/cli/src/enums.ts`). Default to a small, low-risk set if the user has no preference (e.g. `businessEntities` or `customFields`). Testing one resource at a time keeps sign-offs manageable.

### Step 2: Baseline Pull

```bash
mkdir -p /tmp/tr-manual-test
pnpm -F cli start inventory pull \
  --auth="$TRANSCEND_API_KEY" \
  --resources={resources} \
  --file=/tmp/tr-manual-test/transcend.yml

# Preserve an untouched baseline for later diffs/restores
cp /tmp/tr-manual-test/transcend.yml /tmp/tr-manual-test/baseline.yml
```

Verify the command exited 0 and the YAML contains the expected top-level keys (see the resource → YAML key table below).

### Step 3: Open YAML and Admin UI for Visual Comparison

1. Open the pulled YAML in the editor (use the `open_resource` tool from `cursor-app-control`, or `open /tmp/tr-manual-test/transcend.yml`).
2. Open the Admin Dashboard page for each resource under test in the browser (use `browser_navigate` or `open {url}`). URL mapping:

| `--resources` value    | YAML key                | Admin UI URL                                                                   |
| ---------------------- | ----------------------- | ------------------------------------------------------------------------------ |
| `apiKeys`              | `api-keys`              | https://app.transcend.io/infrastructure/api-keys                               |
| `customFields`         | `attributes`            | https://app.transcend.io/infrastructure/attributes                             |
| `templates`            | `templates`             | https://app.transcend.io/privacy-requests/email-settings/templates             |
| `dataSilos`            | `data-silos`            | https://app.transcend.io/data-map/data-inventory/data-silos                    |
| `enrichers`            | `enrichers`             | https://app.transcend.io/privacy-requests/identifiers                          |
| `dataFlows`            | `data-flows`            | https://app.transcend.io/consent-manager/data-flows/approved                   |
| `cookies`              | `cookies`               | https://app.transcend.io/consent-manager/cookies/approved                      |
| `consentManager`       | `consent-manager`       | https://app.transcend.io/consent-manager/developer-settings                    |
| `partitions`           | `partitions`            | https://app.transcend.io/consent-manager/developer-settings/advanced-settings  |
| `businessEntities`     | `business-entities`     | https://app.transcend.io/data-map/data-inventory/business-entities             |
| `processingActivities` | `processing-activities` | https://app.transcend.io/data-map/data-inventory/processing-activities         |
| `vendors`              | `vendors`               | https://app.transcend.io/data-map/data-inventory/vendors                       |
| `dataCategories`       | `data-categories`       | https://app.transcend.io/data-map/data-inventory/data-categories               |
| `processingPurposes`   | `processing-purposes`   | https://app.transcend.io/data-map/data-inventory/purposes                      |
| `actions`              | `actions`               | https://app.transcend.io/privacy-requests/settings/data-actions                |
| `dataSubjects`         | `data-subjects`         | https://app.transcend.io/privacy-requests/settings/data-subjects               |
| `identifiers`          | `identifiers`           | https://app.transcend.io/privacy-requests/identifiers                          |
| `prompts`              | `prompts`               | https://app.transcend.io/prompts/browse                                        |
| `promptPartials`       | `prompt-partials`       | https://app.transcend.io/prompts/partials                                      |
| `promptGroups`         | `prompt-groups`         | https://app.transcend.io/prompts/groups                                        |
| `agents`               | `agents`                | https://app.transcend.io/pathfinder/agents                                     |
| `actionItems`          | `action-items`          | https://app.transcend.io/action-items/all                                      |
| `teams`                | `teams`                 | https://app.transcend.io/admin/teams                                           |
| `privacyCenters`       | `privacy-center`        | https://app.transcend.io/privacy-center/general-settings                       |
| `policies`             | `policies`              | https://app.transcend.io/privacy-center/policies                               |
| `messages`             | `messages`              | https://app.transcend.io/privacy-center/messages-internationalization          |
| `assessments`          | `assessments`           | https://app.transcend.io/assessments/groups                                    |
| `assessmentTemplates`  | `assessment-templates`  | https://app.transcend.io/assessments/form-templates                            |
| `purposes`             | `purposes`              | https://app.transcend.io/consent-manager/regional-experiences/purposes         |
| `preferenceOptions`    | `preference-options`    | https://app.transcend.io/preference-store/preference-topics/preference-options |
| `systemDiscovery`      | `system-discovery`      | https://app.transcend.io/data-map/data-inventory/silo-discovery                |
| `workflowConfigs`      | `workflow-configs`      | https://app.transcend.io/privacy-requests/workflows                            |

The full canonical mapping lives in `packages/cli/src/lib/docgen/createPullResourceScopesTable.ts` and `TR_YML_RESOURCE_TO_FIELD_NAME` in `packages/cli/src/constants.ts`.

### Step 4: Baseline Sign-Off

Instruct the user:

> Compare the YAML against the Admin UI. Check that every resource in the UI appears in the YAML, and that names, descriptions, and field values match. Reply "signed off" (or report discrepancies).

**Do not proceed until the user signs off.** If they report a discrepancy, record it as a pull bug in the results table and ask whether to continue.

### Step 5: Enumerate Fields to Test

Read the codec for the resource under test in `packages/cli/src/codecs.ts` (e.g. `BusinessEntityInput`, `AttributeInput`) and list every writable field. Also consult `packages/cli/examples/*.yml` for realistic example values. Build a test plan table and show it to the user before starting, e.g.:

| #   | Test case                   | Field(s)     | Type   |
| --- | --------------------------- | ------------ | ------ |
| 1   | Create new `Test QA Entity` | all required | create |
| 2   | Update `title`              | title        | update |
| 3   | Update `description`        | description  | update |
| 4   | Set optional field X        | X            | update |
| 5   | Clear optional field X      | X            | update |

Include both **create** cases (a brand-new resource with a clearly-marked name like `[CLI-QA] Test Entity <date>`) and **update** cases (one field at a time on that test resource, so failures are attributable to a single field). Prefer mutating the created test resource over pre-existing org data.

### Step 6: Mutation Loop (one sign-off per case)

For each test case:

1. **Edit** `/tmp/tr-manual-test/transcend.yml` with the single change. Trim the YAML down to only the resource(s) under test so push touches nothing else.
2. **Push**:

```bash
pnpm -F cli start inventory push \
  --auth="$TRANSCEND_API_KEY" \
  --file=/tmp/tr-manual-test/transcend.yml
```

3. **Verify round-trip** — re-pull to a separate file and diff:

```bash
pnpm -F cli start inventory pull \
  --auth="$TRANSCEND_API_KEY" \
  --resources={resources} \
  --file=/tmp/tr-manual-test/verify.yml
diff /tmp/tr-manual-test/transcend.yml /tmp/tr-manual-test/verify.yml
```

The pushed change should appear in the re-pulled YAML; unrelated fields should be unchanged.

4. **Open/refresh the Admin UI page** and instruct the user:

> Case {N}: I changed `{field}` from `{old}` to `{new}` and pushed. Please confirm the Admin UI shows the new value and nothing else changed. Sign off or describe what's wrong.

5. **Record the result** (pass/fail + notes) and move to the next case only after sign-off.

Batch small related fields into one case if the user asks to speed up, but default to one field per case.

### Step 7: Cleanup

1. Restore any modified pre-existing resources by pushing the relevant sections of `baseline.yml`.
2. Remind the user to **manually delete** any `[CLI-QA]` test resources in the Admin UI (the CLI cannot delete).
3. Remove scratch files and unset the key:

```bash
rm -rf /tmp/tr-manual-test
unset TRANSCEND_API_KEY
```

### Step 8: Report Results

Summarize the session in chat:

| #   | Test case     | Field | Result | Notes                               |
| --- | ------------- | ----- | ------ | ----------------------------------- |
| 1   | Create entity | —     | pass   | —                                   |
| 2   | Update title  | title | fail   | UI showed stale value until refresh |

For any failures, capture: exact YAML diff, push command output, UI observation, and re-pull diff — enough to file a bug. Offer to file follow-up issues or fix the CLI bug (via [Background Task](.cursor/skills/background-task/SKILL.md) if on another branch).

## Command Quick Reference

| Action              | Command                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------- |
| Pull (scoped)       | `pnpm -F cli start inventory pull --auth="$TRANSCEND_API_KEY" --resources={r} --file={f}` |
| Pull everything     | `pnpm -F cli start inventory pull --auth="$TRANSCEND_API_KEY" --resources=all --file={f}` |
| Push                | `pnpm -F cli start inventory push --auth="$TRANSCEND_API_KEY" --file={f}`                 |
| Non-default backend | add `--transcendUrl=https://api.us.transcend.io`                                          |
| Debug errors        | add `--debug` (pull)                                                                      |

## Error Handling

| Symptom                            | Likely cause / fix                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| 401/403 on pull or push            | API key missing a scope — check the scopes table in `packages/cli/README.md`       |
| Push succeeds but UI unchanged     | Wrong org (key vs UI login), wrong backend URL, or stale UI — hard-refresh first   |
| Re-pull diff shows unrelated churn | Server normalizes values (ordering, defaults) — note it, judge if it's a real bug  |
| Push error on a specific field     | Check push semantics in `packages/cli/src/commands/inventory/push/readme.ts`       |
| YAML fails validation before push  | Compare against codec in `packages/cli/src/codecs.ts` and `packages/cli/examples/` |

## Related Skills/Rules

- [Background Task](.cursor/skills/background-task/SKILL.md) - For fixing any CLI bugs found, on a branch, without touching the working directory
- [Fix CI](.cursor/skills/fix-ci/SKILL.md) - If fixes are pushed and CI fails
- [Commit and Push](.cursor/rules/commit-and-push.mdc) - Safe git wrappers
