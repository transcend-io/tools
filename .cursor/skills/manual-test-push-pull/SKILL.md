---
name: manual-test-push-pull
description: Interactive manual QA of `transcend inventory pull` / `inventory push` against a live test org. Triggers - "manual test push/pull", "manually test pull", "QA inventory sync", "test push for {resource}"
---

# Manual Test Push/Pull Skill

Created By: Michael Farrell
Last Edited: July 9, 2026

## Overview

Drives an interactive, human-in-the-loop QA session for `transcend inventory pull` and `transcend inventory push`. The agent runs commands and opens artifacts; the **user visually verifies** each step in the Admin Dashboard and signs off before proceeding.

## Trigger

- User types `/manual-test-push-pull`
- User says "manually test pull/push", "QA the inventory sync", "test push for business entities", etc.

## Source of Truth (read these, don't hardcode)

| What                                 | Where                                                              |
| ------------------------------------ | ------------------------------------------------------------------ |
| Resource enum (`--resources` values) | `TranscendPullResource` in `packages/cli/src/enums.ts`             |
| Resource → YAML key mapping          | `TR_YML_RESOURCE_TO_FIELD_NAME` in `packages/cli/src/constants.ts` |
| Resource → Admin UI URL + scopes     | `packages/cli/src/lib/docgen/createPullResourceScopesTable.ts`     |
| YAML schema / writable fields        | Codecs in `packages/cli/src/codecs.ts`                             |
| Example values per resource          | `packages/cli/examples/*.yml`                                      |
| Pull/push flags and sync semantics   | `packages/cli/src/commands/inventory/{pull,push}/readme.ts`        |

## Safety Rules

- **Never commit, log, or echo the API key** — env var only.
- **Test/sandbox org only** — push overwrites Admin Dashboard values.
- **Work in a scratch dir** (e.g. `/tmp/tr-manual-test`), never a `transcend.yml` in the repo. Keep an untouched `baseline.yml` copy of the first pull for diffs/restores.
- **Push only trimmed YAML** containing the resource(s) under test — never a full `--resources=all` pull.
- Push creates/updates but **never deletes** — test resources must be deleted manually in the UI during cleanup.

## Workflow

### Step 1: Collect Inputs

Ask the user for:

1. **Test API key** (create at the API keys page in the Admin Dashboard if needed, with scopes per the docgen table). Export as `TRANSCEND_API_KEY` without echoing.
2. **Backend URL** if non-default (`--transcendUrl`, see `packages/cli/src/constants.ts`).
3. **Resources to test** — values from `TranscendPullResource`. Default to one small, low-risk resource.

### Step 2: Baseline Pull + Visual Sign-Off

```bash
mkdir -p /tmp/tr-manual-test
pnpm -F cli start inventory pull --auth="$TRANSCEND_API_KEY" \
  --resources={resources} --file=/tmp/tr-manual-test/transcend.yml
cp /tmp/tr-manual-test/transcend.yml /tmp/tr-manual-test/baseline.yml
```

(Build the CLI first if needed — see build order in `.cursor/rules/commit-and-push.mdc`.)

Open the YAML in the editor and the resource's Admin UI page (URL from the docgen table) in the browser. Instruct the user to compare them and reply "signed off" or report discrepancies. **Do not proceed without sign-off.**

### Step 3: Build the Test Plan

From the resource's codec in `codecs.ts` and its example YAML, enumerate writable fields and propose a test plan table:

- One **create** case — new resource named `[CLI-QA] Test <date>` so it's easy to find and delete.
- One **update** case per field, mutating the created test resource (not pre-existing org data), so failures are attributable to a single field. Batch fields only if the user asks.

Show the plan and get user approval before starting.

### Step 4: Mutation Loop (one sign-off per case)

For each case:

1. Edit the scratch YAML with the single change (trimmed to the resources under test).
2. Push: `pnpm -F cli start inventory push --auth="$TRANSCEND_API_KEY" --file=/tmp/tr-manual-test/transcend.yml`
3. Re-pull to `verify.yml` and diff — the change should round-trip; nothing else should churn.
4. Refresh the Admin UI page and tell the user exactly what changed (`field: old → new`). Get sign-off or a failure description.
5. Record pass/fail + notes; only then move on.

### Step 5: Cleanup

- Restore modified pre-existing resources by pushing the relevant sections of `baseline.yml`.
- Remind the user to manually delete `[CLI-QA]` resources in the UI.
- `rm -rf /tmp/tr-manual-test && unset TRANSCEND_API_KEY`

### Step 6: Report

Summarize results in a pass/fail table. For failures, capture the YAML diff, push output, UI observation, and re-pull diff — enough to file a bug. Offer to fix CLI bugs via [Background Task](.cursor/skills/background-task/SKILL.md).

## Error Handling

| Symptom                            | Likely cause / fix                                            |
| ---------------------------------- | ------------------------------------------------------------- |
| 401/403                            | Key missing a scope — check the docgen scopes table           |
| Push succeeds but UI unchanged     | Wrong org or backend URL, or stale UI — hard-refresh first    |
| Re-pull diff shows unrelated churn | Server-side normalization — note it, judge if it's a real bug |
| Field-specific push error          | Check sync semantics in `push/readme.ts`                      |
| YAML validation failure            | Compare against the codec and `packages/cli/examples/`        |

## Related Skills/Rules

- [Background Task](.cursor/skills/background-task/SKILL.md) - Fix discovered CLI bugs on a branch
- [Commit and Push](.cursor/rules/commit-and-push.mdc) - Safe git wrappers and build order
