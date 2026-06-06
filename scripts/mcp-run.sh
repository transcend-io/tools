#!/bin/bash
# Wrapper for local MCP server startup.
# Sources secret.env (gitignored) for credentials, then execs node.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [[ -f "${REPO_ROOT}/secret.env" ]]; then
  set -a
  source "${REPO_ROOT}/secret.env"
  set +a
fi

exec node "$@"
