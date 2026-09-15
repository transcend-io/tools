export default `#### Create the safe default policy project

\`\`\`sh
transcend policy init
\`\`\`

This creates a multi-bundle Policy Engine workspace under \`transcend/policy\`: shared Regal config and input schemas at the workspace root, plus a disposable \`example-bundle/\` publish directory (\`.manifest\`, Rego tree, and local input fixtures). The example policy is teaching material, not an application contract. Initialization checks local OPA and Regal versions and prints official installation guidance when they are missing or incompatible; it never installs tools or creates runtime-manager configuration.

The interactive checklist selects repository-level VS Code setup, the \`transcend-policy-engine\` Agent Skill, and credential-free validation-only GitHub Actions by default. VS Code setup recommends the official OPA extension, points \`opa.roots\` at the starter \`{root}-bundle/\` publish directory, wires input schemas, and configures a default \`policy: lint\` task with strict Rego v1 formatting.

To give an agent the same policy guidance before initialization, install the standalone skill directly from this repository:

\`\`\`sh
npx skills add transcend-io/tools --skill transcend-policy-engine
\`\`\`

#### Preview or choose another directory

\`\`\`sh
transcend policy init ./policies --dryRun --json
transcend policy init ./policies --editor --skill --ci --noInteractive --yes
\`\`\`

Non-interactive setup enables only the individual \`--editor\`, \`--skill\`, and \`--ci\` flags passed. There are no setup presets. The complete plan is applied transactionally. Existing or partially initialized policy targets are left unchanged with actionable warnings, including customized Rego, manifests, Regal configuration, README files, workflows, editor values and tasks, and managed skill content.

Generated CI pins OPA 1.13.1, Regal 0.42.0, immutable setup action commits, and the current Transcend CLI release. It runs only \`transcend policy lint --noInteractive --json\`; it never publishes or adds Transcend API credentials. After successful initialization, copyable one-line next steps and an AI handoff prompt identify the disposable example, repository-specific CI adaptation, and the final lint gate.
`;
