# Safe git command that only runs within the tools repo
# Prevents accidental git operations in other repositories
#
# Usage:
#   tools-git status
#   tools-git add -A && tools-git commit -m "fix: message"
#   tools-git push origin branch-name
tools-git() {
  local repo_dir
  repo_dir="$(git rev-parse --show-toplevel 2>/dev/null || echo "")"
  if [[ -z "${repo_dir}" ]]; then
    if [[ -d "${HOME}/transcend/tools" ]]; then
      repo_dir="${HOME}/transcend/tools"
    else
      echo "❌ ERROR: Could not determine repo directory"
      echo "   Run from within the tools repo"
      return 1
    fi
  fi

  # Verify this is actually the tools repo (not some other repo)
  local repo_name
  repo_name="$(basename "${repo_dir}")"
  if [[ "${repo_name}" != "tools" ]]; then
    echo "❌ ERROR: tools-git can only be run within the tools repo"
    echo "   Current repo: ${repo_dir}"
    echo ""
    echo "   This command is blocked to protect other repositories."
    return 1
  fi

  # Block pushes to protected branches
  if [[ "$1" == "push" ]]; then
    local current_branch
    current_branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
    if [[ "${current_branch}" == "main" || "${current_branch}" == "dev" ]]; then
      echo "❌ ERROR: tools-git push is blocked on the '${current_branch}' branch"
      echo "   Push to a feature branch instead."
      return 1
    fi
  fi

  git "$@"
}
