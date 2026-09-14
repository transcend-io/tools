import { buildExamples } from '../../../lib/docgen/buildExamples.js';
import type { TestCommandFlags } from './impl.js';

const examples = buildExamples<TestCommandFlags>(
  ['policy', 'test'],
  [
    {
      description: 'Run tests in the default local policy project',
      flags: {},
    },
  ],
);

export default `#### Examples

${examples}

**Run tests in another local policy project**

\`\`\`sh
transcend policy test ./policies
\`\`\`
`;
