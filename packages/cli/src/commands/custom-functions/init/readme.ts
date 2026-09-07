export default `#### Start with the isolated default layout

\`\`\`sh
transcend custom-functions init
\`\`\`

This creates the manifest under \`transcend/custom-functions\`, leaving room for files such as \`transcend/transcend.yml\`. Selected setup options can add Deno configuration and repository integrations; use \`transcend custom-functions new\` to create functions and fixtures. Pass a directory explicitly to use another layout.

The interactive checklist selects Deno configuration, VS Code settings, the Agent Skill, and GitHub Actions by default, followed by one complete filesystem preview. One existing skill directory receives a managed file directly. With multiple existing directories, \`.agents/skills\` holds the canonical copy and only directories whose agents cannot read that portable location receive links. Home-directory agent configuration is ignored.

#### Add support to an existing repository

\`\`\`sh
transcend custom-functions init ./packages/transcend-functions \\
  --deno \\
  --editor \\
  --skill \\
  --noInteractive \\
  --yes
\`\`\`

Existing JSONC and YAML comments are retained. A collision or unsafe merge stops before any file is written. Use \`--dryRun\` to review the same transactional plan without applying it.
`;
