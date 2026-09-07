import { describe, expect, it } from 'vitest';

import {
  CUSTOM_FUNCTION_TEMPLATE_NAMES,
  deriveCustomFunctionSlug,
  generateCustomFunctionTemplate,
  validateCustomFunctionDisplayName,
  type CustomFunctionTemplateName,
} from '../scaffold-templates.js';

describe('Custom Function scaffold names', () => {
  it('normalizes safe display names and derives portable kebab-case slugs', () => {
    expect(validateCustomFunctionDisplayName('  Score   CRM Leads  ')).toBe('Score CRM Leads');
    expect(deriveCustomFunctionSlug('DSRLookup OAuth2')).toBe('dsr-lookup-oauth2');
    expect(deriveCustomFunctionSlug("Crème Customer's Data")).toBe('creme-customers-data');
  });

  it.each(['', '   ', '../escape', 'nested/name', 'line\nbreak', '🔒', 'CON'])(
    'rejects unsafe display name %j',
    (displayName) => {
      expect(() => validateCustomFunctionDisplayName(displayName)).toThrow();
    },
  );
});

describe('generateCustomFunctionTemplate', () => {
  it.each(CUSTOM_FUNCTION_TEMPLATE_NAMES)(
    'generates deterministic relative files for %s',
    (templateName) => {
      const first = generateCustomFunctionTemplate('Score Lead', templateName);
      const second = generateCustomFunctionTemplate('Score Lead', templateName);

      expect(second).toEqual(first);
      expect(first.sourceFile.path).toBe('functions/score-lead.ts');
      expect(first.sourceFile.path.startsWith('/')).toBe(false);
      expect(first.payloadFiles.every(({ path }) => !path.startsWith('/'))).toBe(true);
      expect(first.sourceFile.contents).toContain(
        "import type { CustomFunction } from '@transcend-io/custom-function-types';",
      );
      expect(first.sourceFile.contents.endsWith('\n')).toBe(true);
      expect(first.payloadFiles.every(({ contents }) => contents.endsWith('\n'))).toBe(true);
    },
  );

  it.each<{
    /** Scaffold template under test. */
    templateName: CustomFunctionTemplateName;
    /** Whether the source has a default export. */
    hasDefault: boolean;
    /** Whether the source has an enricher export. */
    hasEnricher: boolean;
  }>([
    { templateName: 'general', hasDefault: true, hasEnricher: false },
    { templateName: 'dsr-datapoint', hasDefault: true, hasEnricher: false },
    { templateName: 'dsr-enricher', hasDefault: false, hasEnricher: true },
    { templateName: 'dsr-both', hasDefault: true, hasEnricher: true },
  ])(
    'generates only the selected $templateName exports',
    ({ templateName, hasDefault, hasEnricher }) => {
      const { sourceFile } = generateCustomFunctionTemplate('DSR Lookup', templateName);

      expect(sourceFile.contents.includes('export default ')).toBe(hasDefault);
      expect(sourceFile.contents.includes('export async function enricher')).toBe(hasEnricher);
    },
  );

  it('generates the safe ACCESS completion callback for datapoint templates', () => {
    const { sourceFile } = generateCustomFunctionTemplate('DSR Lookup', 'dsr-datapoint');

    expect(sourceFile.contents).toContain("sdk.fetch('/v1/data-silo'");
    expect(sourceFile.contents).toContain("method: 'POST'");
    expect(sourceFile.contents).toContain('environment.TRANSCEND_API_KEY');
    expect(sourceFile.contents).toContain('if (!response.ok)');
    expect(sourceFile.contents).toContain('response.status');
    expect(sourceFile.contents).toContain('response.statusText');
    expect(sourceFile.contents).toContain('body=${body}');
    expect(sourceFile.contents).not.toContain('api.example.com');
    expect(sourceFile.contents).not.toContain('pokeapi');
  });

  it('matches General files to the single-payload manifest shorthand', () => {
    const generated = generateCustomFunctionTemplate('Score Lead', 'general');

    expect(generated.payloadFiles.map(({ path }) => path)).toEqual([
      'test-payloads/score-lead.json',
    ]);
    expect(generated.manifestEntry).toEqual({
      name: 'Score Lead',
      code: './functions/score-lead.ts',
      'test-payload': './test-payloads/score-lead.json',
    });
    expect(JSON.parse(generated.payloadFiles[0]!.contents)).toEqual({
      event: 'example',
    });
  });

  it.each([
    ['dsr-datapoint', 'test-payloads/dsr-lookup-datapoint.json', 'DATA_POINT'],
    ['dsr-enricher', 'test-payloads/dsr-lookup-enricher.json', 'REQUEST_ENRICHER'],
  ] as const)(
    'matches the %s payload to its manifest export type',
    (templateName, payloadPath, payloadType) => {
      const generated = generateCustomFunctionTemplate('DSR Lookup', templateName);

      expect(generated.payloadFiles.map(({ path }) => path)).toEqual([payloadPath]);
      expect(generated.manifestEntry).toEqual({
        name: 'DSR Lookup',
        code: './functions/dsr-lookup.ts',
        type: 'DSR',
        env: {
          TRANSCEND_API_KEY: '<<parameters.transcendApiKey>>',
        },
        'test-payload': `./${payloadPath}`,
        'test-payload-type': payloadType,
      });
    },
  );

  it('creates and registers both combined DSR payloads in a stable order', () => {
    const generated = generateCustomFunctionTemplate('DSR Lookup', 'dsr-both');

    expect(generated.payloadFiles.map(({ path }) => path)).toEqual([
      'test-payloads/dsr-lookup-datapoint.json',
      'test-payloads/dsr-lookup-enricher.json',
    ]);
    expect(generated.manifestEntry).toEqual({
      name: 'DSR Lookup',
      code: './functions/dsr-lookup.ts',
      type: 'DSR',
      env: {
        TRANSCEND_API_KEY: '<<parameters.transcendApiKey>>',
      },
      'test-payloads': [
        {
          payload: './test-payloads/dsr-lookup-datapoint.json',
          'payload-type': 'DATA_POINT',
        },
        {
          payload: './test-payloads/dsr-lookup-enricher.json',
          'payload-type': 'REQUEST_ENRICHER',
        },
      ],
    });
  });

  it('omits values supplied by Transcend from DSR payload files', () => {
    const generated = generateCustomFunctionTemplate('DSR Lookup', 'dsr-both');
    const [datapoint, enricher] = generated.payloadFiles.map(({ contents }) =>
      JSON.parse(contents),
    );

    expect(datapoint).not.toHaveProperty('coreIdentifier');
    expect(datapoint.extras).not.toHaveProperty('dataSilo');
    expect(datapoint.extras.profile).toMatchObject({
      identifier: 'person@example.com',
      type: 'email',
    });
    expect(enricher).not.toHaveProperty('coreIdentifier');
    expect(enricher.extras).not.toHaveProperty('dataSilo');
    expect(enricher.requestIdentifier).toEqual({
      name: 'email',
      value: 'person@example.com',
    });
    expect(enricher.extras.identifier).toMatchObject({
      name: 'email',
      type: 'email',
    });
  });
});
