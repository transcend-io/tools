import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { planPush } from '@transcend-io/sdk';
import { describe, expect, it } from 'vitest';

import { readTranscendYaml } from '../readTranscendYaml.js';

const EXAMPLE_DIR = join(__dirname, '..', '..', '..', 'examples');

/** Examples handled in decodeExampleFiles.test.ts (invalid or multi-instance). */
const SKIPPED = new Set(['invalid.yml', 'multi-instance.yml']);

describe('planPush on example files', () => {
  readdirSync(EXAMPLE_DIR)
    .filter((name) => name.endsWith('.yml') && !SKIPPED.has(name))
    .forEach((name) => {
      it(`${name} planned against itself has no creates, updates, clears, or deletes`, () => {
        const input = readTranscendYaml(join(EXAMPLE_DIR, name));
        const plan = planPush(input, input, { deleteExtraAttributeValues: true });
        const changed = plan.resources.flatMap(({ resource, items }) =>
          items
            .filter(({ action }) => action === 'create' || action === 'update')
            .map(({ label, action, fields }) => ({
              resource,
              label,
              action,
              fields: fields.map(({ path }) => path),
            })),
        );
        expect(changed).toEqual([]);
        expect(plan.effects.filter(({ kind }) => kind !== 'create')).toEqual([]);
      });
    });
});
