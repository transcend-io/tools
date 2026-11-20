/** MCP initialize instructions for the transcend.yml config server. */
export const CONFIG_SERVER_INSTRUCTIONS =
  'Before calling config_push, call config_diff with the same filePath and paste the returned ' +
  'diff into the chat for the user. config_push needs explicit approval in Cursor.';
