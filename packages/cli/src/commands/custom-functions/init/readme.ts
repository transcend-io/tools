export default `#### Start with the isolated default layout

\`\`\`sh
transcend custom-functions init
\`\`\`

This creates the manifest, Deno configuration, functions, and fixtures under \`transcend/custom-functions\`, leaving room for files such as \`transcend/transcend.yml\`. Pass a directory explicitly to use another layout.

The interactive setup presents one checklist and one complete filesystem preview. The recommended selection adds strict, target-scoped Deno configuration and offers the portable authoring skill when a project skill directory exists. One existing skill directory receives a managed file directly. With multiple existing directories, \`.agents/skills\` holds the canonical copy and only directories whose agents cannot read that portable location receive links. Home-directory agent configuration is ignored.

#### Add support to an existing repository

\`\`\`sh
transcend custom-functions init ./packages/transcend-functions \\
  --setup=none \\
  --deno \\
  --editor \\
  --skill
\`\`\`

Existing JSONC and YAML comments are retained. A collision or unsafe merge stops before any file is written. Use \`--dryRun\` to review the same transactional plan without applying it.
`;
