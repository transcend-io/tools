export default `#### Add a generic example bundle

\`\`\`sh
transcend policy new --template generic --name example --yes
\`\`\`

#### Add a permissions bundle

\`\`\`sh
transcend policy new --template permissions --name permissions --yes
\`\`\`

#### Preview without writing

\`\`\`sh
transcend policy new --template generic --name myapp --dryRun --json
\`\`\`

Requires an initialized workspace (\`transcend policy init\` first).
`;
