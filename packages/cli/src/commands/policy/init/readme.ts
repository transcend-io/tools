export default `#### Create the safe default policy project

\`\`\`sh
transcend policy init
\`\`\`

This creates a publishable, fail-closed Rego v1 starter under \`transcend/policy\`. The example policy is disposable teaching material, not an application contract. Initialization always checks local OPA and Regal versions and prints official installation guidance when they are missing or incompatible; it never installs tools or creates runtime-manager configuration.

#### Preview or choose another directory

\`\`\`sh
transcend policy init ./policies --dryRun --json
transcend policy init ./policies --noInteractive --yes
\`\`\`

The complete plan is applied transactionally. Existing or partially initialized targets are left unchanged with actionable warnings, including customized Rego, manifests, Regal configuration, README files, and other content.
`;
