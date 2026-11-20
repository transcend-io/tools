#!/bin/bash
# Block `gh pr create|edit|comment|review` when the text names customers or links internal
# systems. transcend-io/tools is public, so PR text is visible to everyone.
# The scan lives in scripts/check-pr-content.ts so CI uses the same rules.

# Resolve from this hook's own directory, not workspace_roots[0], so multi-root
# workspaces still find this repo's scripts.
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

exec node "${repo_root}/scripts/check-pr-content.ts" --hook
