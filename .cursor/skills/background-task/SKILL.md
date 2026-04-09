---
name: background-task
description: Workflow for making changes to git branches WITHOUT affecting the user's current working directory. Use when asked to do anything "in the background" or when modifying a branch you're not currently on.
---

# Background Task

Created By: Michael Farrell
Last Edited: April 9, 2026

## Quick Reference

| Command                                                  | Use For                                   |
| -------------------------------------------------------- | ----------------------------------------- |
| `git worktree add .worktrees/fix-{name} origin/{branch}` | Create worktree (safe in main workspace)  |
| `worktree-git {any git command}`                         | ALL git operations in worktrees           |
| `worktree-rm {name}`                                     | Remove worktree or files within worktrees |
| `pnpm install --frozen-lockfile`                         | Install deps (no lockfile changes)        |
| `pnpm install`                                           | Install deps (lockfile update needed)     |

## Critical Rules (NEVER Violate)

| Rule                                       | Why                         |
| ------------------------------------------ | --------------------------- |
| **Never `git checkout` in main workspace** | Breaks user's workflow      |
| **Always `worktree-git` in `.worktrees/`** | Auto-approved, safe         |
| **Always `worktree-rm` for cleanup**       | Auto-approved, safe         |
| **Never `rm` in worktrees**                | Requires approval, unsafe   |
| **Never `tools-git` in worktrees**         | Will fail (repo name check) |

## When to Use

- User says "in background", "fix branch X", "update branch without switching"
- You're about to run `git checkout` in the main workspace -- **STOP, use worktree instead**
- Any follow-up changes to a PR after worktree cleanup -- **Create NEW worktree**

## Workflow

### Step 1: Create Worktree

```bash
cd "$(git rev-parse --show-toplevel)" && \
  git fetch origin {branch} main && \
  mkdir -p .worktrees && \
  worktree-rm fix-{name} 2>/dev/null || true && \
  git worktree prune && \
  git worktree add .worktrees/fix-{name} origin/{branch}
```

### Step 2: Install Dependencies

```bash
cd .worktrees/fix-{name} && \
  pnpm install --frozen-lockfile
```

#### When Lockfile Updates Are Needed

If you're adding a **new package** or modifying `package.json` dependencies, the lockfile must be updated. You'll see this error with `--frozen-lockfile`:

```
ERR_PNPM_FROZEN_LOCKFILE  Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date
```

**Fix:** Drop the `--frozen-lockfile` flag:

```bash
pnpm install
```

| Scenario                                    | Command                          |
| ------------------------------------------- | -------------------------------- |
| Normal install (no new packages)            | `pnpm install --frozen-lockfile` |
| Adding new package / lockfile update needed | `pnpm install`                   |

### Step 3: Merge Main (REQUIRED)

```bash
cd .worktrees/fix-{name} && \
  worktree-git fetch origin main && \
  BEHIND=$(worktree-git rev-list --count HEAD..origin/main) && \
  if [ "$BEHIND" -gt 0 ]; then \
    echo "Branch is $BEHIND commits behind main. Merging..." && \
    worktree-git merge origin/main -m "Merge branch 'main'" --no-edit; \
  fi
```

### Step 4: Make Changes

```bash
cd .worktrees/fix-{name} && \
  worktree-git checkout -B {branch} origin/{branch}
  # ... edit files ...
```

### Step 5: Build (if cross-package changes)

When changes span multiple packages, build in dependency order:

```bash
cd .worktrees/fix-{name} && \
  pnpm run --dir packages/utils build && \
  pnpm run --dir packages/sdk build && \
  pnpm run --dir packages/cli build
```

Skip packages that aren't affected by your changes.

### Step 6: Commit and Push

**Important:** When a worktree is first created with `git worktree add`, it is checked out in a detached-HEAD state. Always use `HEAD:{branch}` refspec when pushing to avoid silently pushing stale commits from the main workspace. Step 4's `checkout -B` attaches HEAD to the branch, but the explicit `HEAD:{branch}` form is always safe.

```bash
cd .worktrees/fix-{name} && \
  pnpm run format && \
  worktree-git add -A && \
  worktree-git commit -m "fix: description" && \
  worktree-git push origin HEAD:{branch}
```

### Step 7: Create or Update PR

Use `gh pr create --draft` for AI-generated PRs.

### Step 8: Cleanup

```bash
worktree-rm fix-{name}
```

## Batched Workflow (Single Command)

```bash
# Setup + install + merge (one approval)
cd "$(git rev-parse --show-toplevel)" && \
  git fetch origin {branch} main && \
  mkdir -p .worktrees && \
  worktree-rm fix-{name} 2>/dev/null || true && \
  git worktree prune && \
  git worktree add .worktrees/fix-{name} origin/{branch} && \
  cd .worktrees/fix-{name} && \
  pnpm install --frozen-lockfile && \
  BEHIND=$(worktree-git rev-list --count HEAD..origin/main) && \
  if [ "$BEHIND" -gt 0 ]; then \
    worktree-git merge origin/main -m "Merge branch 'main'" --no-edit || \
    (worktree-git merge --abort && echo "Conflicts, continuing without merge"); \
  fi

# File edits (auto-approve in .worktrees/)

# Commit + push (one approval) — use HEAD:{branch} for detached worktrees
cd .worktrees/fix-{name} && \
  pnpm run format && \
  worktree-git add -A && \
  worktree-git commit -m "fix: message" && \
  worktree-git push origin HEAD:{branch}

# Create/update PR
# gh pr create --draft --title "fix: title" --body "description"

# Cleanup
worktree-rm fix-{name}
```

## Mandatory Functions

**`worktree-git` and `worktree-rm` are auto-loaded via the Cursor preToolUse hook** (`.cursor/hooks/preload-shell-functions.sh`). They are available in every Shell tool call automatically.

If they're not available, verify:

```bash
type worktree-git &>/dev/null || echo "ERROR: worktree-git not loaded - check hook"
type worktree-rm &>/dev/null || echo "ERROR: worktree-rm not loaded - check hook"
```

## Auto-Approval for Speed

**`worktree-git` and `worktree-rm` should be auto-approved in Cursor settings**, meaning they run without requiring user intervention. This is safe because they only work inside `.worktrees/` directories.

| Command           | User Approval Required | Why                                |
| ----------------- | ---------------------- | ---------------------------------- |
| `worktree-git`    | No (auto-approved)     | Safe - only works in `.worktrees/` |
| `worktree-rm`     | No (auto-approved)     | Safe - only works in `.worktrees/` |
| `tools-git`       | No (auto-approved)     | Safe - only works in tools repo    |
| `tools-rm`        | No (auto-approved)     | Safe - only works in tools repo    |
| `git`             | Yes                    | Could modify main workspace        |
| `rm`              | Yes                    | Could delete important files       |

**Always use `worktree-git` and `worktree-rm` in worktrees to maximize speed.**

## Important: `tools-git` vs `worktree-git`

- **`tools-git`** -- for git operations in the **main workspace**. Checks that `basename` of the repo root is `tools`. **Will NOT work in worktrees** because `git rev-parse --show-toplevel` returns the worktree path (e.g., `.worktrees/fix-foo`).
- **`worktree-git`** -- for git operations **inside `.worktrees/`** directories. Checks that `$PWD` contains `/.worktrees/`.

Never mix them up. Use `tools-git` in the main workspace, `worktree-git` in worktrees.

## Troubleshooting

### `worktree-git` fails

Functions are auto-loaded via the preToolUse hook. If not working:

```bash
source .cursor/hooks/shell-functions/worktree-git.sh
```

### pnpm install fails

```bash
cd .worktrees/fix-{name} && \
  worktree-rm node_modules && \
  pnpm install --frozen-lockfile
```

### Worktree already exists

```bash
worktree-rm fix-{name}
git worktree prune
git worktree add .worktrees/fix-{name} origin/{branch}
```

### Merge conflicts

```bash
cd .worktrees/fix-{name} && \
  worktree-git merge origin/main && \
  # resolve conflicts...
  worktree-git add -A && \
  worktree-git commit -m "fix: resolve merge conflicts"
```

### Push from detached worktree is stale

If `worktree-git push origin {branch}` pushes old commits, the worktree is detached and the push resolved the branch ref from the main workspace. Always use the `HEAD:` refspec:

```bash
worktree-git push origin HEAD:{branch}
```

### Build errors across packages

Never run `pnpm run build` at the root if you only changed one package. Build in dependency order:

```bash
pnpm run --dir packages/utils build    # if utils changed
pnpm run --dir packages/sdk build      # if sdk changed (depends on utils)
pnpm run --dir packages/cli build      # if cli changed (depends on sdk + utils)
```

### Pre-commit hook failures in worktree

The husky hooks may not be installed in worktrees. If `git commit` fails with hook errors, either:

1. Run `pnpm run format && pnpm run lint` manually before committing
2. Use `worktree-git commit --no-verify -m "message"` (only if you've already run quality checks)
