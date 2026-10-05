import { buildExamples } from '../../../lib/docgen/buildExamples.js';
import type { LintCommandFlags } from './impl.js';

const examples = buildExamples<LintCommandFlags>(
  ['policy', 'lint'],
  [
    {
      description: 'Lint every bundle under the default workspace',
      flags: {},
    },
    {
      description: 'Lint and format every bundle under the default workspace',
      flags: {
        fix: true,
      },
    },
    {
      description: 'Run lint in CI or an editor',
      flags: {
        noInteractive: true,
        json: true,
      },
    },
    {
      description: 'Lint a single local publish directory',
      positionals: ['transcend/policy/example-bundle'],
      flags: {
        fix: true,
      },
    },
  ],
);

export default `#### Examples

${examples}

With no directory argument, \`policy lint\` lints every immediate child under the default
workspace (\`transcend/policy\`) that contains a \`.manifest\`. Pass one bundle path to lint a
single unit. Use \`policy check\` for the full verification gate.
`;
