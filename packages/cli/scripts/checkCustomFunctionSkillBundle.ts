import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const distributionDirectory = join(import.meta.dirname, '..', 'dist');
const bundle = readdirSync(distributionDirectory, { recursive: true })
  .filter((path): path is string => typeof path === 'string' && extname(path) === '.mjs')
  .map((path) => readFileSync(join(distributionDirectory, path), 'utf8'))
  .join('\n');
const requiredSkillContents = [
  'name: transcend-custom-functions',
  'references/setup.md',
  'references/writing-custom-functions.md',
  'https://docs.transcend.io/llms.txt',
];
const missing = requiredSkillContents.filter((content) => !bundle.includes(content));
if (missing.length > 0) {
  throw new Error(`The built CLI is missing Custom Function skill content: ${missing.join(', ')}`);
}
