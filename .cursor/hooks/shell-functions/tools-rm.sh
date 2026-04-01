# Safe rm command that only operates on paths within the tools repo
# Prevents accidental deletion of files outside the repository
#
# Usage:
#   tools-rm dist                     # Remove dist/ in current directory
#   tools-rm packages/cli/dist        # Remove specific path
#   tools-rm node_modules .turbo      # Remove multiple paths
tools-rm() {
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

  # Verify this is actually the tools repo
  local repo_name
  repo_name="$(basename "${repo_dir}")"
  if [[ "${repo_name}" != "tools" ]]; then
    echo "❌ ERROR: tools-rm can only be run within the tools repo"
    echo "   Current repo: ${repo_dir}"
    echo ""
    echo "   This command is blocked to protect other repositories."
    return 1
  fi

  if [[ $# -eq 0 ]]; then
    echo "❌ ERROR: tools-rm requires at least one path argument"
    echo "   Usage: tools-rm <path> [path...]"
    return 1
  fi

  local resolved_repo_dir
  resolved_repo_dir="$(cd "${repo_dir}" && pwd -P 2>/dev/null || echo "${repo_dir}")"

  for target in "$@"; do
    local abs_target
    if [[ "${target}" == /* ]]; then
      abs_target="${target}"
    else
      abs_target="${PWD}/${target}"
    fi

    abs_target="$(realpath -m "${abs_target}" 2>/dev/null || echo "${abs_target}")"

    if [[ "${abs_target}" != "${resolved_repo_dir}" && "${abs_target}" != "${resolved_repo_dir}/"* ]]; then
      echo "❌ ERROR: tools-rm can only remove paths within the tools repo"
      echo "   Target:     ${target}"
      echo "   Resolved:   ${abs_target}"
      echo "   Tools repo: ${repo_dir}"
      echo ""
      echo "   This command is blocked to protect files outside the repository."
      return 1
    fi

    if [[ "${abs_target}" == "${resolved_repo_dir}" ]]; then
      echo "❌ ERROR: Cannot remove the tools repo root directory"
      return 1
    fi
  done

  for target in "$@"; do
    local abs_target
    if [[ "${target}" == /* ]]; then
      abs_target="${target}"
    else
      abs_target="${PWD}/${target}"
    fi
    abs_target="$(realpath -m "${abs_target}" 2>/dev/null || echo "${abs_target}")"

    if [[ ! -e "${abs_target}" ]]; then
      echo "⚠️  Path does not exist: ${abs_target}"
      continue
    fi

    echo "🧹 Removing: ${abs_target}"
    if rm -rf "${abs_target}"; then
      echo "✅ Removed successfully"
    else
      echo "❌ Failed to remove: ${abs_target}"
      return 1
    fi
  done
}
