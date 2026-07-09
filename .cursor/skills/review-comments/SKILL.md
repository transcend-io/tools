---
name: review-comments
description: Workflow for efficiently finding and addressing PR review comments from human reviewers
---

# Review Comments

Created By: Michael Farrell
Last Edited: July 8, 2026

## When to Use This Skill

| Scenario                                 | Use review-comments?                   |
| ---------------------------------------- | -------------------------------------- |
| Only PR comments, CI is passing          | Yes - read this skill                  |
| CI is failing (with or without comments) | No - use `fix-ci` skill (handles both) |

**This skill** = standalone workflow for PR comments when CI is green
**fix-ci skill** = handles BOTH PR comments (first) AND CI failures

## Finding Unresolved Comments

### Issue Comments vs Review Comments

GitHub PR comments come in two different API shapes:

- **Issue comments** are top-level comments in the PR conversation tab. If the URL contains `#issuecomment-<id>`, fetch it with the issues endpoint: `gh api repos/transcend-io/tools/issues/comments/{id}`
- **Review comments** are inline diff comments. Use the PR review comments APIs or the GraphQL `reviewThreads` workflow below

Do not expect `gh api repos/.../pulls/{PR}/comments` to return a top-level `#issuecomment-...` comment. That endpoint only covers inline review comments.

### Use the GraphQL API (NOT the REST API)

The **REST API** (`gh api repos/.../pulls/{PR}/comments`) does NOT expose resolution status. However, the **GraphQL API** exposes `isResolved` on `PullRequestReviewThread`, which lets you list only unresolved threads.

**List all unresolved review threads on a PR:**

```bash
gh api graphql -f query='
query($owner: String!, $repo: String!, $pr: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      reviewThreads(first: 100) {
        nodes {
          id
          isResolved
          isOutdated
          path
          line
          startLine
          comments(first: 10) {
            nodes {
              body
              author { login }
              createdAt
            }
          }
        }
      }
    }
  }
}' -f owner=transcend-io -f repo=tools -F pr={PR_NUMBER}
```

Then filter the results to threads where `isResolved` is `false`.

### Fallback: Ask for Context

If the user says "address this comment" without specifics and you cannot determine the PR number, ask:

> "Which specific comment? Can you share a screenshot or paste the comment text?"

### Working with Comment Context

When you have the unresolved threads (from the API or user-provided context):

1. **Note the file path** (`path` field) and **line numbers** (`line`/`startLine` fields)
2. **Read the current state** of that file on the PR branch
3. **Make the requested change** in a worktree (see `background-task/SKILL.md`)
4. **Resolve the thread** after the fix is pushed (see below)

## Resolving Addressed Comments

**CRITICAL: After addressing a review comment and pushing the fix, always resolve the conversation thread.** This closes out the review thread in the GitHub UI so reviewers can see it's been handled.

### Resolve a Single Thread

```bash
gh api graphql -f query='
mutation($threadId: ID!) {
  resolveReviewThread(input: { threadId: $threadId }) {
    thread { isResolved }
  }
}' -f threadId={THREAD_NODE_ID}
```

The `threadId` is the `id` field from the `reviewThreads` query above (a GraphQL node ID like `PRRT_...`).

### Resolve All Unresolved Threads (Batch)

When you've addressed all outstanding comments, resolve them all at once:

```bash
# 1. Get all unresolved thread IDs
THREAD_IDS=$(gh api graphql -f query='
query($owner: String!, $repo: String!, $pr: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      reviewThreads(first: 100) {
        nodes { id isResolved }
      }
    }
  }
}' -f owner=transcend-io -f repo=tools -F pr={PR_NUMBER} \
  --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false) | .id')

# 2. Resolve each one
for THREAD_ID in $THREAD_IDS; do
  gh api graphql -f query='
  mutation($threadId: ID!) {
    resolveReviewThread(input: { threadId: $threadId }) {
      thread { isResolved }
    }
  }' -f threadId="$THREAD_ID"
done
```

### When to Resolve vs. Not Resolve

| Situation                                                    | Action                                  |
| ------------------------------------------------------------ | --------------------------------------- |
| You made the requested code change                           | Resolve the thread                      |
| Comment was a question — you replied with an explanation     | Resolve the thread                      |
| Comment requires discussion / you're unsure of the right fix | Do NOT resolve — leave for the reviewer |
| Comment is outdated (code no longer exists)                  | Resolve the thread                      |

## Full Workflow Summary

| Step                       | Action                                                    |
| -------------------------- | --------------------------------------------------------- |
| 1. List unresolved threads | Run the GraphQL query above                               |
| 2. For each thread         | Read the file, understand the comment, make the fix       |
| 3. Push the changes        | Commit and push to the PR branch                          |
| 4. Resolve the threads     | Run `resolveReviewThread` for each addressed comment      |
| 5. Confirm                 | Re-run the unresolved threads query to verify none remain |

### Quick Reference Table

| User Says                                   | Best Response                                     |
| ------------------------------------------- | ------------------------------------------------- |
| "Address this comment on PR X" (no details) | Run GraphQL query to list unresolved threads      |
| "Address this comment" + screenshot         | Extract file/line, make change, resolve thread    |
| "Address CI comments on PR X"               | Run `gh pr checks {PR}` to see failing checks     |
| "Address review comments"                   | List unresolved threads → fix → resolve → confirm |

## Related Skills/Rules

- [Background Task](.cursor/skills/background-task/SKILL.md) - Use when making changes without affecting user's work
- [Fix CI](.cursor/skills/fix-ci/SKILL.md) - Comprehensive workflow that handles PR comments (Step 0.5) then CI failures; use this if CI is also failing
- [Merge Branch](.cursor/skills/merge-branch/SKILL.md) - Merge main when branch is stale
- [Commit and Push](.cursor/rules/commit-and-push.mdc) - Safe git wrappers and hook requirements
