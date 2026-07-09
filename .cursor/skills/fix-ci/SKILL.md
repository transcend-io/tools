---
name: fix-ci
description: Workflow for analyzing and fixing ALL CI failures (lint, tests, typecheck, format, build, exports, etc). The default for any CI failure.
---

# Fix CI

Created By: Michael Farrell
Last Edited: July 8, 2026

## When to Use

| Scenario                             | Use fix-ci?                          |
| ------------------------------------ | ------------------------------------ |
| PR has red X (CI failing)            | Yes - read this skill                |
| PR has review comments + CI failures | Yes - read this skill                |
| Only have review comments, no CI     | Yes - or use `review-comments` skill |
| Need to fix CI in the background     | Yes - with `background-task` skill   |

## What You Handle

**ALL CI failure types** - this is the default for any CI issue:

| Failure Type / Step         | What You Do                                                             |
| --------------------------- | ----------------------------------------------------------------------- |
| `Lint` / `oxlint`           | Run `pnpm lint:fix`, then fix any remaining issues manually             |
| `Check formatting`          | Run `pnpm format`, stage formatted files                                |
| `Check dependency versions` | Fix syncpack / catalog mismatches (`pnpm check:deps`)                   |
| `Check package consistency` | Fix package convention failures (`pnpm check:packages`)                 |
| `Check changeset`           | Add/update changeset when package code changed (`pnpm check:changeset`) |
| `Typecheck` / `tsc`         | Fix TypeScript errors (`pnpm typecheck`)                                |
| `Test` / `vitest`           | Analyze failing tests, fix code or tests (`pnpm test`)                  |
| `Build`                     | Fix build errors; build affected packages in dependency order           |
| `Check package quality`     | Fix `pnpm quality` / `quality:fix` failures                             |
| `Check exports` / `publint` | Fix export map / publish compatibility issues                           |
| CLI genfiles drift          | Regenerate with `pnpm --dir packages/cli genfiles` and commit           |
| Multiple failures           | Handle ALL in one efficient pass                                        |

## Git Command Rules

| Context              | Use            | Never use                |
| -------------------- | -------------- | ------------------------ |
| Main workspace       | `tools-git`    | raw `git`                |
| Inside `.worktrees/` | `worktree-git` | `tools-git` or raw `git` |

## Workflow

### Step 0: Identify the PR & Quick CI Status Check

```bash
# Get current branch's PR number
BRANCH=$(tools-git branch --show-current)
PR_NUMBER=$(gh pr list --head "$BRANCH" --json number -q '.[0].number')

# Or if PR number is provided
PR_NUMBER=<provided>

# Get CI check status
gh pr checks $PR_NUMBER
```

**Present a summary like this:**

```markdown
## CI Status for PR #123

**Branch**: mike/fix-cli-flag
**Overall**: 🔴 Failing (2 of 8 checks failed)

### Failed Checks

| Check       | Status    | Link             |
| ----------- | --------- | ---------------- |
| CI / global | ❌ Failed | [View logs](url) |
| CI / cli    | ❌ Failed | [View logs](url) |

### Passing Checks

| Check | Status    |
| ----- | --------- |
| ...   | ✅ Passed |
```

If there are failures, **first check for outstanding PR comments** (Step 0.5), then investigate CI errors.

### Step 0.5: Address Outstanding PR Comments First

**Always address human review comments before investigating CI errors.** Comments often point to issues that cause CI failures, and fixing them first avoids duplicate work.

Follow the [Review Comments skill](.cursor/skills/review-comments/SKILL.md) to fetch, address, and resolve all unresolved threads. Then return here for CI investigation.

### Step 0.75: Merge Main (REQUIRED)

**Always merge `main` into the branch before investigating CI failures.** A stale branch is a common cause of CI failures — tests, types, or lint rules may have changed on `main` since the branch diverged.

Follow the [Merge Branch skill](.cursor/skills/merge-branch/SKILL.md) to merge main into the current branch (handles both direct and worktree workflows, conflict resolution, etc.).

**If the merge resolves all CI failures**, push and skip the remaining investigation steps.

### Step 0.9: Check for Pre-existing Failures on `main`

**Before attempting to fix any failing job, verify it is not already failing on `main`.** Fixing a CI failure that exists on `main` does not belong in this PR — it needs a separate fix against `main` first.

```bash
# Get the HEAD SHA of main
MAIN_SHA=$(tools-git rev-parse origin/main)

# Fetch check runs for main's HEAD
gh api "repos/transcend-io/tools/commits/$MAIN_SHA/check-runs" \
  --paginate \
  --jq '[.check_runs[] | select(.conclusion == "failure" or .conclusion == "timed_out") | .name]'
```

Compare the list of failing job names on `main` against the failing jobs on this PR:

- **Job failing on both this PR and `main`** → pre-existing failure. **Do not fix it here.** Alert the user:

  > **⚠️ Pre-existing CI failure — not introduced by this PR**
  >
  > `[job name]` is also failing on `main` @ `[MAIN_SHA short]`. This should be fixed in a separate PR against `main`, not here.
  >
  > To rule out flakiness, retry once: `gh run rerun [RUN_ID] --failed --repo transcend-io/tools`

- **Job failing only on this PR** → introduced by this PR. Proceed with investigation and fix.

### Step 1: Read CI Output

1. Navigate to the failing CI job in GitHub Actions
2. Expand the failing step to see the full error output
3. Look for:
   - The specific test file and test name that failed
   - The assertion error message
   - Stack traces pointing to the failure location
   - Package path from turbo / tsc output

### Step 1.5: Download CI Logs

```bash
gh run list --repo transcend-io/tools --branch your-branch-name --limit 5
gh run view <run-id> --log-failed --repo transcend-io/tools
```

### Step 1.75: Analyze PR Changes

Compare your branch against `origin/main` to correlate failing checks with files changed in the PR. Focus on packages touched by the PR.

```bash
tools-git diff --name-only origin/main...HEAD
```

### Step 2: Identify the Failure Type

#### TypeScript / Build

**Prefer targeted package builds over a full monorepo rebuild when iterating:**

```bash
pnpm run --dir packages/utils build    # if utils changed
pnpm run --dir packages/sdk build      # depends on utils
pnpm run --dir packages/cli build      # depends on sdk + utils
```

For type errors, run `pnpm typecheck` (or the package's typecheck script) and fix the reported packages.

#### Lint / Format

```bash
pnpm lint:fix
pnpm format
```

#### Tests

```bash
pnpm test
# Or targeted:
pnpm --dir packages/<pkg> test
```

#### Changeset / Package Conventions / Deps / Exports

```bash
pnpm check:changeset
pnpm check:packages
pnpm check:deps
pnpm check:exports
pnpm check:publint
pnpm quality
```

#### CLI Genfiles Drift (`CI / cli` job)

```bash
pnpm --dir packages/cli genfiles
tools-git diff --stat
# Commit regenerated files if dirty
```

### Step 3: Analyze the Failure

Ask yourself:

1. **Is the test flaky?** Does it pass locally but fail in CI?
   - Check for race conditions / timing
   - Check for environment differences
   - Check git history for recent changes

2. **Is the code wrong?** Did the PR introduce a bug?
   - Fix the application code, not the test

3. **Is the test wrong?** Does the test need updating?
   - Expectations outdated after intentional changes

4. **Is it an environment / tooling issue?**
   - Missing changeset for package changes
   - Lockfile / catalog drift
   - Generated files out of date

#### Investigating Flaky Tests with Git History

`tools-git log --oneline -20 -- path/to/flaky.test.ts`, `tools-git show COMMIT_HASH`, `gh pr view PR_NUMBER`.

### Step 4: Apply Fixes

#### Fix in Priority Order

1. Lint/formatting issues first (quick wins)
2. Changeset / package convention / depcheck issues
3. Type errors
4. Test failures
5. Build / exports / publint issues
6. CLI genfiles regeneration

#### Fix Guidelines

**DO:**

- Fix the root cause, not the symptom
- Handle ALL failures in one pass when possible
- Run format before committing (`pnpm run format`)
- Use `tools-git` / `worktree-git` (never raw `git`)

**DON'T:**

- Don't skip hooks (`--no-verify`) unless explicitly asked
- Don't disable or skip tests without a tracking ticket
- Don't weaken assertions just to make CI green
- Don't fix pre-existing `main` failures in this PR

#### Efficient Multi-Failure Handling

```bash
pnpm lint:fix
pnpm format
pnpm check:deps
# ... manual fixes for type/test/build ...
pnpm typecheck
pnpm test

# Single commit with all fixes
tools-git add -A
tools-git commit -m "$(cat <<'EOF'
fix: resolve CI failures

EOF
)"
```

When committing from Cursor, use `required_permissions: ["all"]` so husky / `npm pack` (attw) can run.

### Step 5: When to Rerun Flaky Tests vs. Re-run CI

#### CRITICAL: "Flaky" Tests Changed in the PR Are NOT Flaky

**Before classifying any failing test as flaky, check if the test file OR its related source files were changed in this PR:**

```bash
tools-git diff origin/main...HEAD --name-only | grep -i "FailingTestName"
tools-git diff origin/main...HEAD --name-only
```

**If the failing test file or related source files were modified in this PR**, treat it as a **real failure**.

#### How to Tell Flaky from Real

| Indicator                               | Likely Flaky | Likely Real |
| --------------------------------------- | ------------ | ----------- |
| Passes locally, fails in CI             | Yes          |             |
| Timing-related error message            | Yes          |             |
| Test failed before your PR changes      | Yes          |             |
| Same test fails on every run            |              | Yes         |
| Error matches code changes in PR        |              | Yes         |
| Test file was changed in this PR        |              | Yes         |
| Related source files changed in this PR |              | Yes         |

#### Decision Tree for Flaky Test Failures

| # of Flaky Test Files | Action                                          |
| --------------------- | ----------------------------------------------- |
| **1-2 flaky tests**   | Suggest user manually rerun those specific jobs |
| **3+ flaky tests**    | Suggest user re-run entire CI workflow          |
| **Any real failures** | Fix the issues first                            |

**Never suggest re-running CI when there are real failures.** Fix real issues first; CI will rerun flaky tests automatically when you push.

### Step 6: Fixing Without Affecting Current Branch

If you need to fix the branch without switching away from your current work, use the **`background-task`** skill. This provides a complete workflow using git worktrees with proper safety patterns (`worktree-git`, `worktree-rm`, automatic main merging, etc.).

### Step 6.5: Local Test Verification

**After applying a fix, run the relevant check locally to verify it passes** - unless you're 90%+ certain the fix is correct (typo, missing import, simple type annotation).

| Fix Type            | Action                         |
| ------------------- | ------------------------------ |
| Import/typo fix     | Skip local run - push directly |
| Type annotation fix | Skip local run - push directly |
| Logic change        | Run locally before pushing     |
| Flake fix           | Run 2-3 times to verify        |
| Format/lint only    | `pnpm format` + `pnpm lint`    |

**When in doubt, run locally.** It's faster than waiting for CI to fail again.

### Step 7: Push & Update PR

1. Push the fix with a concise commit message
2. Monitor CI: `gh pr checks $PR_NUMBER --watch` (or poll)
3. If tests still fail, repeat the analysis

#### Update PR Description with CI Analysis

After fixing, add a short note to the PR body or a comment:

```markdown
## CI Analysis

**Failing Job(s):** {job_names}

**Root Cause:** {analysis}

**Fix Applied:** {what_you_fixed}

**Status:** Fixed and pushed / Needs manual review
```

## Classification Quick Reference

| Pattern                        | Likely Cause         | Action                                    |
| ------------------------------ | -------------------- | ----------------------------------------- |
| Same test fails every run      | Real bug             | Fix the code                              |
| Test fails sometimes           | Flaky test           | Investigate; suggest rerun if truly flaky |
| Lint failures                  | Formatting/style     | `pnpm lint:fix`                           |
| Format check failures          | Unformatted files    | `pnpm format`                             |
| Changeset check failures       | Missing changeset    | `pnpm changeset` / add changeset file     |
| Depcheck / syncpack failures   | Version mismatch     | Align catalog / package.json              |
| Build / typecheck fails        | Compile error        | Fix TypeScript errors                     |
| Exports / publint fails        | Bad package exports  | Fix `package.json` exports                |
| CLI genfiles drift             | Stale generated CLI  | `pnpm --dir packages/cli genfiles`        |
| **Job also failing on `main`** | Pre-existing failure | Alert user — fix in a separate PR vs main |

## Related Skills/Rules

- [Review Comments](.cursor/skills/review-comments/SKILL.md) - Standalone skill for PR comments when CI is passing
- [Merge Branch](.cursor/skills/merge-branch/SKILL.md) - Merge main before investigating CI
- [Background Task](.cursor/skills/background-task/SKILL.md) - For making fixes without affecting your current branch
- [Commit and Push](.cursor/rules/commit-and-push.mdc) - Safe git wrappers, format-before-commit, hooks
