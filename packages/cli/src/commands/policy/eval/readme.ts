import { buildExampleCommand, buildExamples } from '../../../lib/docgen/buildExamples.js';
import type { EvalCommandFlags } from './impl.js';

const examples = buildExamples<EvalCommandFlags>(
  ['policy', 'eval'],
  [
    {
      description: 'Evaluate a generic decision query with a local envelope',
      positionals: ['transcend/policy/example-bundle'],
      flags: {
        package: 'data.example.result',
        input: 'transcend/policy/example-bundle/input.json',
      },
    },
    {
      description: 'Simulate the Permissions API (query + envelope + input schema)',
      positionals: ['transcend/policy/permissions-bundle'],
      flags: {
        package: 'data.permissions.purposes',
        input: 'transcend/policy/permissions-bundle/input.json',
        schema: 'transcend/policy/permissions-bundle/input.schema.json',
      },
    },
  ],
);

const stdinExample = buildExampleCommand<EvalCommandFlags>(
  ['policy', 'eval'],
  {
    package: 'data.example.result',
    'stdin-input': true,
  },
  { positionals: ['transcend/policy/example-bundle'] },
);

export default `#### Examples

${examples}

**Pipe an envelope on stdin**

\`\`\`sh
cat transcend/policy/example-bundle/input.json | ${stdinExample}
\`\`\`

The \`<bundle>\` positional is required (one local publish directory with a \`.manifest\` per
invocation). Pass \`--schema\` with the bundle's \`input.schema.json\` when you want OPA to
type-check \`input\` (e.g. \`transcend/policy/permissions-bundle/input.schema.json\`).
`;
