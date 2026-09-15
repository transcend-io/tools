export default `#### Create an empty multi-bundle workspace

\`\`\`sh
transcend policy init
\`\`\`

This creates a multi-bundle Policy Engine workspace under \`transcend/policy\` with shared Regal config (\`project.roots: []\`) and a README. No bundles or Rego are created — add them with \`transcend policy new\`.

The interactive checklist selects repository-level VS Code setup, the \`transcend-policy-engine\` Agent Skill, and credential-free validation-only GitHub Actions by default. VS Code setup recommends the official OPA extension, configures strict Rego v1 formatting, and sets \`opa.schema\` to the workspace schemas directory.

To give an agent the same policy guidance before initialization, install the standalone skill directly from this repository:

\`\`\`sh
npx skills add transcend-io/tools --skill transcend-policy-engine
\`\`\`

#### Preview or choose another directory

\`\`\`sh
transcend policy init ./policies --dryRun --json
transcend policy init ./policies --editor --skill --ci --noInteractive --yes
\`\`\`

Non-interactive setup enables only the individual \`--editor\`, \`--skill\`, and \`--ci\` flags passed. There are no setup presets. The complete plan is applied transactionally. Existing or partially initialized policy targets are left unchanged with actionable warnings.

Generated CI pins OPA 1.13.1, Regal 0.42.0, immutable setup action commits, and the current Transcend CLI release. After initialization, the next step is \`transcend policy new\` to add a bundle from a template.
`;
