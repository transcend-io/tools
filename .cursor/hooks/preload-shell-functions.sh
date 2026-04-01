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

# Get the workspace root
workspace_root=$(echo "${input}" | jq -r '.workspace_roots[0] // empty')

# Build the preload command - source all shell function files
preload="export TOOLS_DIR=\"${workspace_root}\"; for f in \"${workspace_root}\"/.cursor/hooks/shell-functions/*; do source \"\$f\" 2>/dev/null; done"

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
