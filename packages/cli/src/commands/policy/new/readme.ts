export default `#### Add a generic example bundle

\`\`\`sh
transcend policy new --template generic --name example --yes
\`\`\`

#### Add a permissions bundle

\`\`\`sh
transcend policy new --template permissions --name permissions --yes
\`\`\`

#### Custom local folder, same package root

\`\`\`sh
transcend policy new --template permissions --name permissions --bundle-dir my-bundle --yes
\`\`\`

Creates \`transcend/policy/my-bundle/\` with Rego under \`permissions/\`. Remote publish still uses
\`--bundle-name\` (not the local folder name).

#### Preview without writing

\`\`\`sh
transcend policy new --template generic --name myapp --dryRun --json
\`\`\`

Requires an initialized workspace (\`transcend policy init\` first). The positional argument is the
**workspace** (default \`transcend/policy\`); \`--bundle-dir\` is only the basename created under it.
`;
