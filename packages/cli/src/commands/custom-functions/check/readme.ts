export default `#### Validate before pushing

\`\`\`sh
transcend custom-functions check
\`\`\`

\`check\` defaults to \`transcend/custom-functions\` and needs no API key. If that manifest is missing, it reports any project manifest it discovers as an explicit suggestion. It validates unresolved manifest placeholders and every test fixture against the published authoring schemas, then asks Deno to inspect exports, type-check, lint, and check formatting without executing the modules.

In CI, use \`--noInteractive --json\`. Formatting differences fail unless \`--fix\` is explicitly passed; an interactive terminal may preview and confirm the same repair.
`;
