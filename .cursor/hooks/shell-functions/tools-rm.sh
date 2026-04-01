# Safe rm command that only operates on paths within the tools repo
# Prevents accidental deletion of files outside the repository
#
# Usage:
#   tools-rm dist                     # Remove dist/ in current directory
#   tools-rm packages/cli/dist        # Remove specific path
#   tools-rm node_modules .turbo      # Remove multiple paths
tools-rm() {
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

  if [[ $# -eq 0 ]]; then
    echo "❌ ERROR: tools-rm requires at least one path argument"
    echo "   Usage: tools-rm <path> [path...]"
    return 1
  fi

  local resolved_tools_dir
  resolved_tools_dir="$(cd "${tools_dir}" && pwd -P 2>/dev/null || echo "${tools_dir}")"

  for target in "$@"; do
    # Resolve to absolute path
    local abs_target
    if [[ "${target}" == /* ]]; then
      abs_target="${target}"
    else
      abs_target="${PWD}/${target}"
    fi

    # Resolve symlinks and normalize
    abs_target="$(realpath -m "${abs_target}" 2>/dev/null || echo "${abs_target}")"

    # Safety check: target must be within the tools repo
    if [[ "${abs_target}" != "${resolved_tools_dir}" && "${abs_target}" != "${resolved_tools_dir}/"* ]]; then
      echo "❌ ERROR: tools-rm can only remove paths within the tools repo"
      echo "   Target:     ${target}"
      echo "   Resolved:   ${abs_target}"
      echo "   Tools repo: ${tools_dir}"
      echo ""
      echo "   This command is blocked to protect files outside the repository."
      return 1
    fi

    # Prevent removing the repo root itself
    if [[ "${abs_target}" == "${resolved_tools_dir}" ]]; then
      echo "❌ ERROR: Cannot remove the tools repo root directory"
      return 1
    fi
  done

  # All paths validated — safe to remove
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
