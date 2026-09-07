import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  CUSTOM_FUNCTION_TYPES_VERSION,
  CustomFunctionSchemaType,
  getCustomFunctionPayloadSchema,
} from '@transcend-io/custom-function-types';
import Ajv from 'ajv';
import { afterEach, describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { mergeDenoConfiguration } from '../scaffold-config.js';
import {
  CUSTOM_FUNCTION_SKILL_MD,
  CUSTOM_FUNCTION_TEMPLATE_NAMES,
  generateCustomFunctionTemplate,
} from '../scaffold-templates.js';

const temporaryRoots: string[] = [];

afterEach(() => {
  temporaryRoots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true }));
});

/**
 * Select a published schema from generated manifest metadata.
 *
 * @param functionType - Manifest function type
 * @param payloadType - Manifest payload type
 * @returns Published schema variant
 */
function schemaType(
  functionType: string | undefined,
  payloadType: string | undefined,
): CustomFunctionSchemaType {
  if (functionType !== 'DSR') {
    return CustomFunctionSchemaType.General;
  }
  return payloadType === 'REQUEST_ENRICHER'
    ? CustomFunctionSchemaType.DsrRequestEnricher
    : CustomFunctionSchemaType.DsrDataPoint;
}

describe('generated Custom Function artifacts', () => {
  it.each(CUSTOM_FUNCTION_TEMPLATE_NAMES)(
    'Deno-checks the %s source against the exact authoring contract',
    (template) => {
      const root = mkdtempSync(join(tmpdir(), 'custom-function-contract-'));
      temporaryRoots.push(root);
      const generated = generateCustomFunctionTemplate('Contract Check', template);
      const sourcePath = join(root, 'function.ts');
      const configPath = join(root, 'deno.json');
      writeFileSync(sourcePath, generated.sourceFile.contents);
      writeFileSync(configPath, mergeDenoConfiguration(null, CUSTOM_FUNCTION_TYPES_VERSION));

      expect(() =>
        execFileSync('deno', ['check', `--config=${configPath}`, sourcePath], {
          cwd: root,
          env: { ...process.env, NO_COLOR: '1' },
          stdio: 'pipe',
        }),
      ).not.toThrow();
    },
  );

  it.each(CUSTOM_FUNCTION_TEMPLATE_NAMES)(
    'validates every %s fixture with the published schema',
    (template) => {
      const generated = generateCustomFunctionTemplate('Schema Check', template);
      const ajv = new Ajv({ allErrors: true, strict: false });
      const manifestPayloads = generated.manifestEntry['test-payloads'] ?? [
        {
          payload: generated.manifestEntry['test-payload']!,
          'payload-type': generated.manifestEntry['test-payload-type'],
        },
      ];

      manifestPayloads.forEach((payloadReference) => {
        const payloadFile = generated.payloadFiles.find(
          ({ path }) => `./${path}` === payloadReference.payload,
        )!;
        const validate = ajv.compile(
          getCustomFunctionPayloadSchema(
            schemaType(generated.manifestEntry.type, payloadReference['payload-type']),
          ),
        );
        expect(
          validate(JSON.parse(payloadFile.contents)),
          JSON.stringify(validate.errors ?? []),
        ).toBe(true);
      });
    },
  );

  it('conforms to the portable Agent Skills frontmatter contract', () => {
    const frontmatter = CUSTOM_FUNCTION_SKILL_MD.match(/^---\n([\s\S]*?)\n---\n/u);
    expect(frontmatter).not.toBeNull();
    const metadata = parse(frontmatter![1]!) as Record<string, unknown>;

    expect(Object.keys(metadata).sort()).toEqual(['description', 'name']);
    expect(metadata.name).toBe('transcend-custom-functions');
    expect(metadata.name).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
    expect((metadata.name as string).length).toBeLessThanOrEqual(64);
    expect(typeof metadata.description).toBe('string');
    expect((metadata.description as string).length).toBeGreaterThan(0);
    expect((metadata.description as string).length).toBeLessThanOrEqual(1024);
    expect(CUSTOM_FUNCTION_SKILL_MD.slice(frontmatter![0].length).trim().length).toBeGreaterThan(0);
    expect(CUSTOM_FUNCTION_SKILL_MD.split('\n').length).toBeLessThanOrEqual(500);
  });
});
