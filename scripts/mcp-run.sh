#!/bin/bash
# Wrapper for local MCP server startup.
# Sources secret.env (gitignored) for credentials, then execs node.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SECRET_ENV="${REPO_ROOT}/secret.env"

if [[ -f "${SECRET_ENV}" ]]; then
  # JSON object dumps are a common mistake; bash `source` cannot load them and
  # previously continued with no credentials, which looks like an auth bug.
  if [[ "$(head -c 1 "${SECRET_ENV}")" == "{" ]] || grep -qE '^[[:space:]]*"[A-Za-z_][A-Za-z0-9_]*"[[:space:]]*:' "${SECRET_ENV}"; then
    echo "error: ${SECRET_ENV} looks like JSON." >&2
    echo "Use dotenv KEY=VALUE lines (see secret.env.example), e.g.:" >&2
    echo "  TRANSCEND_API_KEY=..." >&2
    exit 1
  fi

  set -a
  # shellcheck disable=SC1090
  if ! source "${SECRET_ENV}"; then
    echo "error: failed to source ${SECRET_ENV}." >&2
    echo "Use dotenv KEY=VALUE lines (see secret.env.example)." >&2
    exit 1
  fi
  set +a
fi

exec node "$@"
