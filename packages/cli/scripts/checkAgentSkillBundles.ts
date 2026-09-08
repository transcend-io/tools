import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';

/** One literal Agent Skill expected in the built CLI. */
interface BundledSkillExpectation {
  /** Human-readable skill name. */
  name: string;
  /** Literal strings that prove every skill asset was bundled. */
  requiredContents: readonly string[];
}

const distributionDirectory = join(import.meta.dirname, '..', 'dist');
const bundle = readdirSync(distributionDirectory, { recursive: true })
  .filter((path): path is string => typeof path === 'string' && extname(path) === '.mjs')
  .map((path) => readFileSync(join(distributionDirectory, path), 'utf8'))
  .join('\n');

const expectations: readonly BundledSkillExpectation[] = [
  {
    name: 'Custom Function',
    requiredContents: [
      'name: transcend-custom-functions',
      'references/setup.md',
      'references/writing-custom-functions.md',
      'https://docs.transcend.io/llms.txt',
    ],
  },
  {
    name: 'Policy Engine',
    requiredContents: [
      'name: transcend-policy-engine',
      'references/setup-tooling.md',
      'references/authoring.md',
      'references/testing-debugging.md',
      'references/publishing.md',
      'https://docs.transcend.io/llms.txt',
    ],
  },
];

const failures = expectations.flatMap(({ name, requiredContents }) => {
  const missing = requiredContents.filter((content) => !bundle.includes(content));
  return missing.length === 0 ? [] : [`${name}: ${missing.join(', ')}`];
});
if (failures.length > 0) {
  throw new Error(`The built CLI is missing Agent Skill content:\n${failures.join('\n')}`);
}
