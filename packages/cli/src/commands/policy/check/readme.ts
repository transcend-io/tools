import { buildExamples } from '../../../lib/docgen/buildExamples.js';
import type { CheckCommandFlags } from './impl.js';

const examples = buildExamples<CheckCommandFlags>(
  ['policy', 'check'],
  [
    {
      description: 'Verify every bundle under the default workspace',
      flags: {},
    },
    {
      description: 'Verify and format every bundle under the default workspace',
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
    {
      description: 'Verify a single local publish directory',
      positionals: ['transcend/policy/example-bundle'],
      flags: {
        fix: true,
      },
    },
  ],
);

export default `#### Examples

${examples}

With no directory argument, \`policy check\` verifies every immediate child under the default
workspace (\`transcend/policy\`) that contains a \`.manifest\`. Pass one bundle path to verify a
single unit.
`;
