# Share one Turborepo cache across Cursor agent shells.
#
# Cursor sets TURBO_CACHE_DIR to a temp folder inside its sandbox cache. That
# folder differs between agent shells and does not survive a reboot, so every
# agent rebuilds what another checkout already built. This file points turbo at
# ~/.cache/turbo instead. A sandboxed shell cannot write there and keeps
# Cursor's folder. The test creates a file, because `[ -w ]` and `mkdir -p` can
# pass on a folder the sandbox blocks.
#
# The preToolUse hook sources this file before every agent shell command, which
# is also when Cursor re-injects the variable.
case "${TURBO_CACHE_DIR:-}" in *cursor-sandbox-cache*)
  _turbo_cache_dir="${HOME}/.cache/turbo"
  if mkdir -p "${_turbo_cache_dir}" 2>/dev/null &&
    _turbo_cache_probe="$(mktemp "${_turbo_cache_dir}/.probe.XXXXXX" 2>/dev/null)"; then
    rm -f "${_turbo_cache_probe}"
    export TURBO_CACHE_DIR="${_turbo_cache_dir}"
  fi
  unset _turbo_cache_dir _turbo_cache_probe
  ;;
esac
