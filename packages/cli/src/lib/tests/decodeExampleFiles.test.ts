import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { readTranscendYaml } from '../readTranscendYaml.js';

const EXAMPLE_DIR = join(__dirname, '..', '..', '..', 'examples');

const MULTI_INSTANCE_VARS = {
  domain: 'acme.com',
  stage: 'Staging',
  CONSENT_DEPLOY_TOKEN: 'token-from-ci',
} as const;

describe('transcend.yml example files decode', () => {
  readdirSync(EXAMPLE_DIR)
    .filter((name) => name.endsWith('.yml'))
    .forEach((name) => {
      if (name === 'invalid.yml') {
        it(`${name} should fail codec validation`, () => {
          expect(() => readTranscendYaml(join(EXAMPLE_DIR, name))).to.throw();
        });
        return;
      }

      if (name === 'multi-instance.yml') {
        it(`${name} decodes when variables are provided`, () => {
          expect(() =>
            readTranscendYaml(join(EXAMPLE_DIR, name), { ...MULTI_INSTANCE_VARS }),
          ).not.to.throw();
        });
        it(`${name} fails when variables are missing`, () => {
          expect(() => readTranscendYaml(join(EXAMPLE_DIR, name))).to.throw(/variable/i);
        });
        return;
      }

      it(`${name} decodes`, () => {
        expect(() => readTranscendYaml(join(EXAMPLE_DIR, name))).not.to.throw();
      });
    });
});
