#!/bin/bash
# Pre-load shell functions for all Cursor shell commands
# This hook intercepts shell commands and ensures our repo functions are available

# Read JSON input from stdin
input=$(cat)

# Extract the command from the tool input
command=$(echo "${input}" | jq -r '.tool_input.command // empty')

# If no command, allow through unchanged
if [[ -z "${command}" ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# Resolve from this hook's own directory, not workspace_roots[0]: in a
# multi-root workspace the first root can be another repo, and zsh aborts the
# whole command when the glob matches nothing.
functions_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/shell-functions"

if [[ ! -d "${functions_dir}" ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# Build the preload command - source all shell function files
preload="for f in \"${functions_dir}\"/*; do source \"\$f\" 2>/dev/null; done"

# Wrap the original command with our preload
wrapped_command="${preload}; ${command}"

# Return the modified command
jq -n \
  --arg cmd "${wrapped_command}" \
  '{
    "decision": "allow",
    "updated_input": {
      "command": $cmd
    }
  }'
