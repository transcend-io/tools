import { buildExamples } from '../../../lib/docgen/buildExamples.js';
import type { LintCommandFlags } from './impl.js';

const examples = buildExamples<LintCommandFlags>(
  ['policy', 'lint'],
  [
    {
      description: 'Verify the default local policy project',
      flags: {},
    },
    {
      description: 'Verify and format the default policy project',
      flags: {
        fix: true,
      },
    },
    {
      description: 'Run the verification gate in CI or an editor',
      flags: {
        noInteractive: true,
        json: true,
      },
    },
  ],
);

export default `#### Examples

${examples}

With no directory argument, \`policy lint\` verifies every immediate child under the default workspace (\`transcend/policy\`) that contains a \`.manifest\`. Pass one bundle path to verify a single unit:

\`\`\`sh
transcend policy lint ./policies/example-bundle --fix
\`\`\`
`;
