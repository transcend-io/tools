export default `#### Start in an empty directory

\`\`\`sh
mkdir transcend-functions
transcend custom-functions init ./transcend-functions
\`\`\`

The interactive setup presents one checklist and one complete filesystem preview. The recommended selection adds strict, target-scoped Deno configuration and offers the portable authoring skill when a supported coding agent is detected.

#### Add support to an existing repository

\`\`\`sh
transcend custom-functions init ./packages/transcend-functions \\
  --setup=none \\
  --deno \\
  --tasks \\
  --editor \\
  --skill
\`\`\`

Existing JSONC and YAML comments are retained. A collision or unsafe merge stops before any file is written. Use \`--dryRun\` to review the same transactional plan without applying it.
`;
