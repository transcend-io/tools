# Safe git command that only runs in .worktrees/ directories
# Prevents accidental git operations in main working directory
#
# Usage:
#   cd .worktrees/fix-branch && worktree-git checkout -B branch origin/branch
#   cd .worktrees/fix-branch && worktree-git add -A && worktree-git commit -m "fix: message"
#   cd .worktrees/fix-branch && worktree-git push origin branch-name
worktree-git() {
  if [[ "${PWD}" != *"/.worktrees/"* && "${PWD}" != *"/.worktrees" ]]; then
    echo "❌ ERROR: worktree-git can only be run in .worktrees/ directories"
    echo "   Current directory: ${PWD}"
    echo "   Expected: */.worktrees/*"
    echo ""
    echo "   This command is blocked to protect your working directory."
    echo "   Create a worktree first: git worktree add .worktrees/fix-{name} origin/{branch}"
    return 1
  fi
  git "$@"
}
