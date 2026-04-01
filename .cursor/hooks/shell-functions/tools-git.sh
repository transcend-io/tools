# Safe git command that only runs within the tools repo
# Prevents accidental git operations in other repositories
#
# Usage:
#   tools-git status
#   tools-git add -A && tools-git commit -m "fix: message"
#   tools-git push origin branch-name
tools-git() {
  local tools_dir="${TOOLS_DIR:-}"
  if [[ -z "${tools_dir}" ]]; then
    tools_dir="$(git rev-parse --show-toplevel 2>/dev/null || echo "")"
  fi
  if [[ -z "${tools_dir}" ]]; then
    if [[ -d "${HOME}/transcend/tools" ]]; then
      tools_dir="${HOME}/transcend/tools"
    else
      echo "❌ ERROR: Could not determine tools repo directory"
      echo "   Set TOOLS_DIR environment variable or run from within the repo"
      return 1
    fi
  fi

  # Resolve to real path for reliable comparison
  local resolved_tools_dir
  resolved_tools_dir="$(cd "${tools_dir}" && pwd -P 2>/dev/null || echo "${tools_dir}")"
  local resolved_pwd
  resolved_pwd="$(pwd -P 2>/dev/null || echo "${PWD}")"

  if [[ "${resolved_pwd}" != "${resolved_tools_dir}" && "${resolved_pwd}" != "${resolved_tools_dir}/"* ]]; then
    echo "❌ ERROR: tools-git can only be run within the tools repo"
    echo "   Current directory: ${PWD}"
    echo "   Tools repo:        ${tools_dir}"
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
