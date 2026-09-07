export default `#### Scaffold without prompts

\`\`\`sh
transcend custom-functions new ./packages/transcend-functions \\
  --name="Customer CRM access" \\
  --template=dsr-both \\
  --setup=recommended \\
  --noInteractive \\
  --yes
\`\`\`

The four templates are \`general\`, \`dsr-datapoint\`, \`dsr-enricher\`, and \`dsr-both\`. If the manifest does not exist, \`new\` composes initialization into the same preview and transaction.

Generated code contains only the selected handler exports and focused TODOs. Customer-specific API and mapping choices remain for the developer or the installed \`transcend-custom-functions\` skill.
`;
