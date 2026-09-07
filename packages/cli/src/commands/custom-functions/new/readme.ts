export default `#### Scaffold without prompts

\`\`\`sh
transcend custom-functions new ./transcend/custom-functions \\
  --name="Customer CRM access" \\
  --template=dsr-both \\
  --noInteractive \\
  --yes
\`\`\`

Run \`transcend custom-functions init\` once before adding functions. The four templates are \`general\`, \`dsr-datapoint\`, \`dsr-enricher\`, and \`dsr-both\`. Without a directory argument, \`new\` uses the initialized project at \`transcend/custom-functions\`. If that manifest is missing, it reports any other project manifest it discovers as an explicit suggestion.

Generated code contains only the selected handler exports and focused TODOs. Customer-specific API and mapping choices remain for the developer or the installed \`transcend-io-custom-functions\` skill. The final output includes a short, copyable AI handoff naming the generated source and validation command.
`;
