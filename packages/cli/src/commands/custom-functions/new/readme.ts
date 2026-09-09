export default `#### Scaffold without prompts

\`\`\`sh
transcend custom-functions new ./transcend/custom-functions \\
  --name="Customer CRM access" \\
  --template=dsr-both \\
  --noInteractive \\
  --yes
\`\`\`

Run \`transcend custom-functions init\` once before adding functions. There are two Custom Function types: General functions, which are triggered by Rules Automation, and DSR functions. Choose \`general\` for a General function. For a DSR function, choose \`dsr-datapoint\` for a data point resolver, \`dsr-enricher\` for a preflight check, or \`dsr-both\` to support both. The \`dsr-enricher\` flag retains the API's technical export name, but the user-facing workflow is called preflight. Without a directory argument, \`new\` uses the initialized project at \`transcend/custom-functions\`. If that manifest is missing, it reports any other project manifest it discovers as an explicit suggestion.

Generated code contains only the selected handler exports and focused TODOs. Customer-specific API and mapping choices remain for the developer or the installed \`transcend-custom-functions\` skill. The final output includes a short, copyable AI handoff naming the generated source and validation command.
`;
