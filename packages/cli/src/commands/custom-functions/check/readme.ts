export default `#### Validate before pushing

\`\`\`sh
transcend custom-functions check
\`\`\`

\`check\` defaults to \`transcend/custom-functions\` and needs no API key. If that manifest is missing, it reports any project manifest it discovers as an explicit suggestion. It validates unresolved manifest placeholders and every test fixture against the published authoring schemas, then asks Deno 2.4.5 to inspect exports, type-check, lint, and check formatting without executing the modules. Missing and unsupported Deno versions produce focused installation or version-switch guidance.

In CI, use \`--noInteractive --json\`. JSON diagnostics stay concise instead of embedding full format patches. Formatting differences fail unless \`--fix\` is explicitly passed; an interactive terminal may preview and confirm the same repair.
`;
