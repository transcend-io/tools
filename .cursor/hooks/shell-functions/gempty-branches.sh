# Re-trigger CI on multiple branches by pushing empty commits
# Uses temporary worktrees so it NEVER changes your active branch or touches local files
#
# Usage: gempty-branches branch1 branch2 branch3 ...
gempty-branches() {
  if [[ $# -eq 0 ]]; then
    echo "Usage: gempty-branches branch1 branch2 branch3 ..."
    echo "Re-triggers CI on specified branches by pushing empty commits"
    echo "Note: This does NOT change your current branch - uses temporary worktrees"
    return 1
  fi

  local start_dir="${PWD}"

  for branch in "$@"; do
    echo "=== 🔄 Re-triggering CI for ${branch} ==="

    git fetch origin "${branch}" 2>/dev/null || {
      echo "⚠️  Could not fetch ${branch}, skipping"
      continue
    }

    local tmpdir
    tmpdir="/tmp/gempty-$$-$(echo "${branch}" | tr '/' '-')"
    git worktree add "${tmpdir}" "origin/${branch}" --detach 2>/dev/null || {
      echo "⚠️  Could not create worktree for ${branch}, skipping"
      continue
    }

    (
      cd "${tmpdir}" &&
        git checkout -B "${branch}" &&
        git commit --allow-empty -m "empty commit to re-run all CI jobs" &&
        git push origin "${branch}"
    ) || echo "⚠️  Failed to push empty commit for ${branch}"

    cd "${start_dir}" || exit
    git worktree remove "${tmpdir}" --force 2>/dev/null
  done

  echo "✅ Done! CI re-triggered on all branches (your branch unchanged)"
}
