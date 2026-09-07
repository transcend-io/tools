export default `#### Validate before pushing

\`\`\`sh
transcend custom-functions check ./packages/transcend-functions
\`\`\`

\`check\` needs no API key. It validates unresolved manifest placeholders and every test fixture against the published authoring schemas, then asks Deno to inspect exports, type-check, lint, and check formatting without executing the modules.

In CI, use \`--noInteractive --json\`. Formatting differences fail unless \`--fix\` is explicitly passed; an interactive terminal may preview and confirm the same repair.
`;
