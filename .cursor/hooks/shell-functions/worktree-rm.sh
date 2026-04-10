# Safely remove worktrees or files/directories within worktrees
# Only operates on paths containing /.worktrees/ to protect main workspace
#
# Usage:
#   worktree-rm fix-branch                    # Remove .worktrees/fix-branch worktree
#   worktree-rm .worktrees/fix-branch         # Remove specific worktree
#   worktree-rm                               # Remove current worktree (if in .worktrees/)
#   worktree-rm node_modules                  # Remove node_modules in current worktree
#   worktree-rm fix-branch/node_modules       # Remove path in specific worktree
worktree-rm() {
  local repo_dir
  repo_dir="$(git rev-parse --show-toplevel 2>/dev/null || echo "")"

  # In a worktree, --show-toplevel returns the worktree root; walk up to find the real repo
  if [[ -n "${repo_dir}" && "${repo_dir}" == *"/.worktrees/"* ]]; then
    repo_dir="${repo_dir%%/.worktrees/*}"
  fi

  if [[ -z "${repo_dir}" || ! -d "${repo_dir}/.git" ]]; then
    if [[ -d "${HOME}/transcend/tools" ]]; then
      repo_dir="${HOME}/transcend/tools"
    else
      echo "❌ ERROR: Could not determine repo directory"
      echo "   Run from within the tools repo or a worktree"
      return 1
    fi
  fi

  local worktrees_dir="${repo_dir}/.worktrees"
  local target="${1:-${PWD}}"

  # If no argument and we're in a worktree, use the worktree root
  if [[ -z "$1" && "${PWD}" == *"/.worktrees/"* ]]; then
    local after_worktrees="${PWD#*/.worktrees/}"
    local wt_name="${after_worktrees%%/*}"
    target="${worktrees_dir}/${wt_name}"
  fi

  # If the path is just a name (no slashes, doesn't start with . or /), prepend .worktrees/
  if [[ "${target}" != /* && "${target}" != .* && "${target}" != */* ]]; then
    target="${worktrees_dir}/${target}"
  fi

  # Handle relative paths starting with .worktrees/
  if [[ "${target}" == .worktrees/* ]]; then
    target="${repo_dir}/${target}"
  fi

  # If we're in a worktree and path is relative, resolve from current directory
  if [[ "${PWD}" == *"/.worktrees/"* && "${target}" != /* ]]; then
    target="${PWD}/${target}"
  fi

  # If path looks like worktree-name/subpath, check if first component is a worktree
  if [[ "${target}" != /* && "${target}" == */* ]]; then
    local first_component="${target%%/*}"
    if [[ -d "${worktrees_dir}/${first_component}" ]]; then
      target="${worktrees_dir}/${target}"
    fi
  fi

  # Resolve to absolute path
  if [[ "${target}" != /* ]]; then
    target="$(cd "${repo_dir}" && realpath -m "${target}" 2>/dev/null || echo "${repo_dir}/${target}")"
  fi

  # Safety check: ONLY operate on paths containing /.worktrees/
  if [[ "${target}" != *"/.worktrees/"* && "${target}" != *"/.worktrees" ]]; then
    echo "❌ ERROR: worktree-rm can only operate on paths within .worktrees/"
    echo "   Target: ${target}"
    echo "   Expected: */.worktrees/*"
    echo ""
    echo "   This command is blocked to protect your working directory."
    return 1
  fi

  if [[ ! -e "${target}" ]]; then
    echo "⚠️  Path does not exist: ${target}"
    return 0
  fi

  # Determine if this is a worktree root or a path within a worktree
  local worktree_name="${target#*/.worktrees/}"
  worktree_name="${worktree_name%%/*}"
  local worktree_path="${worktrees_dir}/${worktree_name}"
  local is_worktree_root=false

  if [[ "${target}" == "${worktree_path}" ]]; then
    is_worktree_root=true
  fi

  # If we're currently in the directory we're trying to remove, cd out first
  if [[ "${PWD}" == "${target}"* ]]; then
    echo "📂 Moving out of target directory..."
    cd "${repo_dir}" 2>/dev/null || cd ~ || return 1
  fi

  if [[ "${is_worktree_root}" == true ]]; then
    echo "🧹 Removing worktree: ${target}"
    if git -C "${repo_dir}" worktree remove "${target}" --force 2>/dev/null; then
      echo "✅ Worktree removed successfully"
    else
      echo "📁 Not a registered git worktree, removing directory..."
      rm -rf "${target}"
      echo "✅ Directory removed"
    fi
    git -C "${repo_dir}" worktree prune 2>/dev/null
  else
    echo "🧹 Removing: ${target}"
    if rm -rf "${target}"; then
      echo "✅ Removed successfully"
    else
      echo "❌ Failed to remove: ${target}"
      return 1
    fi
  fi

  echo "🎉 Cleanup complete"
}
