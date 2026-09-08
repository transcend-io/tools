export default `#### Run locally

\`\`\`sh
transcend custom-functions run ./transcend/custom-functions \\
  --function="Customer CRM access"
\`\`\`

The command runs every test payload configured for the selected function and prints its stdout and stderr, including \`console.log\` output. When \`--function\` is omitted, a single manifest entry is selected automatically; an interactive terminal prompts when the manifest contains several functions.

This is a credential-free development simulator, not an exact Sombra runtime. It mirrors production export selection, payload defaults, environment isolation, network permissions, timeout behavior, and KV limits. Each payload receives a fresh in-memory KV store. Calls to \`sdk.fetch\` are logged and return a simulated HTTP 200 without sending a request.

Native \`fetch\` is denied by default. Pass \`--allowNetwork\` to permit real requests only to the manifest's \`allowed-hosts\`; like Sombra, an empty list then permits localhost. Real requests can have side effects.

With networking disabled, unresolved parameters used only in \`env\` receive clearly labeled local placeholder values. Use \`--parameters\` to override them; parameters used in source or payload paths always remain required. Configured environment values are redacted from captured output. Before deployment, run \`transcend custom-functions check\` and use the authenticated \`push\` test run for production-runtime validation.
`;
