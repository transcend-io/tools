---
name: merge-branch
description: Merge main into current branch and resolve conflicts. Triggers - "merge main", "update branch", "fix merge conflicts", "rebase from main"
---

# Merge Branch Skill

Created By: Michael Farrell
Last Edited: July 8, 2026

If you are asked to do this job "in the background" - follow this doc: .cursor/skills/background-task/SKILL.md. If the user asks you to work on a branch that is different than the current branch - you should assume the work is to be done in the background by default but you can clarify if needed.

## Overview

This skill handles merging the base branch (`main`) into the current working branch and resolving any merge conflicts intelligently.

## Trigger

- User types `/merge-branch`
- User says "merge main", "update branch from main", "fix merge conflicts"
- CI fails due to merge conflicts
- Agent detects branch is behind main with conflicts
- Reviewer reports dependency version conflicts (e.g. "main upgraded zod but this PR has a divergent lockfile — remove your changes"). **Always merge main** rather than manually editing `package.json`/`pnpm-lock.yaml` to approximate main's state; merging brings in the canonical lockfile resolution and avoids further divergence.

## Git Command Rules

| Context              | Use            | Never use                |
| -------------------- | -------------- | ------------------------ |
| Main workspace       | `tools-git`    | raw `git`                |
| Inside `.worktrees/` | `worktree-git` | `tools-git` or raw `git` |
| Cleanup in worktrees | `worktree-rm`  | raw `rm`                 |

Examples below use `tools-git` for the main workspace. In a worktree, substitute `worktree-git`.

## Workflow

### Step 1: Assess Current State

Get current branch and check merge state:

```bash
CURRENT_BRANCH=$(tools-git branch --show-current)
tools-git status
tools-git fetch origin main
tools-git log --oneline HEAD..origin/main | head -20
```

### Step 2: Check for Stacked PR Context

Before merging, determine if this is part of a PR stack:

```bash
PR_INFO=$(gh pr view --json number,title,body,baseRefName 2>/dev/null || echo "")
BASE_BRANCH=$(echo "$PR_INFO" | jq -r '.baseRefName // "main"')
```

**If this is a stacked PR** (base is not `main`):

1. Check the parent PR's recent commits
2. Understand the goal of the current PR vs parent PR
3. Use this context to resolve conflicts intelligently

#### If the parent PR was closed or never merged

Do **not** blindly retarget the PR or run `git rebase --onto` just because the base branch is gone. Reparent the branch onto `main` in a fresh worktree and verify that the rewritten branch preserves the original `base...head` change:

1. Create a fresh worktree from `origin/main` using [Background Task](.cursor/skills/background-task/SKILL.md).
2. Install the worktree dependencies **before** replaying commits. `git cherry-pick --continue` can trigger pre-commit hooks, and those hooks may fail until the worktree has been installed.
3. Cherry-pick only the commits that belong to the child PR.
4. Compare the rewritten branch with both `git diff` and `git range-diff` before force-pushing.

```bash
# From main workspace (worktree creation)
tools-git worktree add .worktrees/fix-{name} origin/main
cd .worktrees/fix-{name}
pnpm install --frozen-lockfile
worktree-git checkout -B {branch} origin/main
worktree-git cherry-pick <pr-specific-commit-sha>
worktree-git diff --stat origin/{old-base-branch}...origin/{old-branch}
worktree-git range-diff origin/{old-base-branch}...origin/{old-branch} origin/main...HEAD
```

Only force-push after the rewritten branch matches the intended PR-specific change.

### Step 3: Attempt the Merge

```bash
tools-git fetch origin main
tools-git merge origin/main
```

If no conflicts, the merge succeeds. Push and you're done:

```bash
tools-git push origin HEAD
```

In a worktree, always push with the explicit refspec:

```bash
worktree-git push origin HEAD:{branch}
```

### Step 4: Handle Conflicts

If conflicts exist, analyze each conflicted file:

```bash
tools-git diff --name-only --diff-filter=U
```

For each conflict, classify it:

| Conflict Type                       | Resolution Strategy                              |
| ----------------------------------- | ------------------------------------------------ |
| **Trivial/Obvious**                 | Auto-resolve (see below)                         |
| **Code Changes in Unrelated Areas** | Take incoming (main) for unrelated code          |
| **Same Code Modified**              | Analyze intent, may need user input              |
| **Package/Config Updates**          | Usually take incoming + re-apply local additions |

### Step 5: Auto-Resolve Obvious Conflicts

#### Obvious/Trivial Conflicts (auto-resolve)

1. **Lock files** (`pnpm-lock.yaml`):
   - `tools-git checkout --theirs pnpm-lock.yaml`
   - `pnpm install` to regenerate with both changes
   - `tools-git add pnpm-lock.yaml`

2. **Generated files** (CLI genfiles, compiled assets, GraphQL codegen):
   - `tools-git checkout --theirs path/to/generated/file`
   - Re-run generation command if needed (e.g. `pnpm --dir packages/cli genfiles`, `pnpm codegen`)
   - `tools-git add path/to/generated/file`

3. **Whitespace/formatting only**:
   - Accept theirs and re-run formatters
   - `pnpm run format`

4. **Added by both sides** (e.g., new entries in YAML/JSON config):
   - Keep both additions, remove conflict markers
   - Manually edit to include both sets of changes

5. **Deleted vs Modified** (file deleted on one side):
   - If main deleted it and your branch modified: Usually accept deletion unless your changes are critical
   - If your branch deleted it and main modified: Accept deletion (your intent was to remove it)

#### Stacked PR Conflicts

When resolving conflicts in a stacked PR:

1. **Identify the stack**:
   - Get parent branch from PR base
   - Check parent PR's recent changes vs main

2. **Understand context**:
   - What is the goal of THIS PR in the stack?
   - What did parent PRs change?
   - Conflicts in code unrelated to this PR's goal -> likely take incoming (main)

3. **Resolution strategy**:
   - Changes from earlier in the stack that got merged to main -> take incoming
   - Changes specific to this PR's feature -> keep ours
   - New changes from main unrelated to stack -> take incoming

### Step 6: Unclear Conflicts - Ask for Clarification

If a conflict is unclear, present it to the user with:

1. The file path
2. "Our" version (this branch's changes)
3. "Their" version (main's changes)
4. Context about what each side was trying to do
5. Options: keep ours, take theirs, or manual merge

Example format:

```
## Conflict Requiring Clarification

**File:** path/to/conflicted/file.ts

**Our change (this branch):** [describe]
**Their change (main):** [describe]

**Options:**
1. Keep our version
2. Take their version
3. Manual merge (combine both)
```

### Step 7: Complete the Merge

After resolving all conflicts:

```bash
tools-git add -A

# Verify no conflict markers remain
tools-git diff --cached | grep -E "^[+].*(<<<<<<<|=======|>>>>>>>)" && echo "WARNING: Conflict markers!" || echo "Clean"

tools-git commit -m "Merge origin/main into $CURRENT_BRANCH"
tools-git push origin HEAD
```

### Step 8: Document the Merge

After resolving conflicts:

1. **Add PR comment** if conflicts were non-trivial:

   ```markdown
   ## Merge Conflict Resolution

   Merged `main` into this branch and resolved {N} non-trivial conflicts.

   <details>
   <summary>Resolution details</summary>

   | File       | Resolution                           |
   | ---------- | ------------------------------------ |
   | `file1.ts` | Kept our changes (feature-specific)  |
   | `file2.ts` | Took incoming (unrelated to this PR) |

   </details>
   ```

2. **Update PR description** if significant changes were made, keeping the main PR body concise

## Conflict Resolution Quick Reference

| Scenario                               | Auto-Resolve? | Strategy                        |
| -------------------------------------- | ------------- | ------------------------------- |
| Lock files (`pnpm-lock.yaml`)          | Yes           | Checkout theirs + regenerate    |
| Generated code                         | Yes           | Checkout theirs + regenerate    |
| Config file (added entries both sides) | Yes           | Keep both additions             |
| Deleted vs modified                    | Usually       | Accept deletion unless critical |
| Same function modified                 | No            | Need context, may ask user      |
| Unrelated code in stacked PR           | Yes           | Take incoming (main)            |
| Feature code in this PR                | No            | Analyze carefully               |

## Error Handling

### Merge Aborted

If you need to abort and start over:

```bash
tools-git merge --abort
```

### Conflict Markers Left in File

If pre-commit hooks catch conflict markers:

1. Find files with markers: `tools-git diff --name-only | xargs grep -l "<<<<<<< HEAD"`
2. Edit those files to resolve remaining conflicts
3. Re-add and commit

## Related Skills/Rules

- [Fix CI](.cursor/skills/fix-ci/SKILL.md) - For CI issues after merge
- [Background Task](.cursor/skills/background-task/SKILL.md) - Worktree workflow and safety rules
- [Commit and Push](.cursor/rules/commit-and-push.mdc) - Safe git wrappers and hook requirements
