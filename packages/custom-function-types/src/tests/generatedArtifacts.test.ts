import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { CustomFunctionSchemaType, getCustomFunctionPayloadSchema } from '../index.js';

/**
 * Read a generated package artifact for contract assertions.
 *
 * @param relativePath - Path beneath the generated output directory
 * @returns Generated artifact contents
 */
const readGeneratedArtifact = (relativePath: string): string =>
  readFileSync(new URL(`../__generated__/${relativePath}`, import.meta.url), 'utf8');
const packageRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

describe('generated Custom Function artifacts', () => {
  it('keeps checked-in output synchronized with the TypeScript contract', () => {
    // Why: published artifacts must not drift from their TypeScript source.
    // Given: the checked-in generated output.
    // When: the generator runs in comparison mode.
    // Then: no stale files are reported.
    expect(() =>
      execFileSync(process.execPath, ['scripts/generateArtifacts.mjs', '--check'], {
        cwd: packageRoot,
        stdio: 'pipe',
      }),
    ).not.toThrow();
  });

  it.each([
    [
      'general-payload.json',
      'General Custom Function payload',
      'file:///general-custom-function-payload.schema.json',
    ],
    [
      'dsr-datapoint-payload.json',
      'Data subject request (DSR) datapoint Custom Function payload',
      'file:///dsr-datapoint-custom-function-payload.schema.json',
    ],
    [
      'dsr-request-enricher-payload.json',
      'Data subject request (DSR) request enricher Custom Function payload',
      'file:///dsr-request-enricher-custom-function-payload.schema.json',
    ],
  ])('publishes %s as a named draft-07 schema', (filename, title, id) => {
    // Why: consumers need independently addressable standards-compatible schemas.
    // Given: a generated payload schema and its expected metadata.
    // When: the schema is loaded from package output.
    // Then: it has the expected draft, title, identifier, and object shape.
    const schema = JSON.parse(readGeneratedArtifact(`schemas/${filename}`));

    expect(schema).toMatchObject({
      $schema: 'http://json-schema.org/draft-07/schema#',
      title,
      type: 'object',
    });
    expect(schema.$id).toBe(id);
  });

  it('publishes a self-contained Monaco ambient declaration', () => {
    // Why: the editor loads this declaration without module resolution.
    // Given: the generated Monaco declaration.
    // When: its compatibility surface is inspected.
    // Then: legacy globals and runtime services are present without imports.
    const declaration = readGeneratedArtifact('monaco/lib.custom-function.d.ts.txt');

    expect(declaration).toContain(
      'type CommonPayloadProperties = CustomFunction.CommonPayloadProperties',
    );
    expect(declaration).toContain('type CommonsExtraProperties = CustomFunction.CommonExtras');
    expect(declaration).toContain('declare namespace CustomFunction');
    expect(declaration).toContain('declare namespace EnvironmentGlobals');
    expect(declaration).toContain('interface Argument<');
    expect(declaration).toContain('environment: EnvironmentGlobals.Environment');
    expect(declaration).not.toContain('nonce: string');
    expect(declaration).toContain('class SDK');
    expect(declaration).toContain('interface KV');
    expect(declaration).not.toContain('import ');
  });

  it('exports the same schemas through the JavaScript API', () => {
    // Why: programmatic and raw JSON consumers must validate against one contract.
    // Given: the generated datapoint schema.
    // When: the typed selector returns that schema variant.
    // Then: both representations are identical.
    const schema = JSON.parse(readGeneratedArtifact('schemas/dsr-datapoint-payload.json'));

    expect(getCustomFunctionPayloadSchema(CustomFunctionSchemaType.DsrDataPoint)).toEqual(schema);
  });

  it('models fields added by Transcend separately from test input', () => {
    // Why: customers should not provide values that Transcend adds during execution.
    // Given: General and datapoint test-input schemas.
    // When: generated required fields and profile types are inspected.
    // Then: runtime-provided values remain optional in test input.
    const generalSchema = JSON.parse(readGeneratedArtifact('schemas/general-payload.json'));
    const datapointSchema = JSON.parse(readGeneratedArtifact('schemas/dsr-datapoint-payload.json'));
    const profileSchema = datapointSchema.properties.extras.properties.profile;

    expect(generalSchema.required ?? []).not.toContain('coreIdentifier');
    expect(datapointSchema.required ?? []).not.toContain('coreIdentifier');
    expect(profileSchema.required).not.toContain('type');
    expect(profileSchema.properties.type.type).toEqual(['string', 'null']);
  });

  it('accepts data-system routing metadata in enricher test payloads', () => {
    // Why: unsaved enricher tests need an integration routing target.
    // Given: the request-enricher test-input schema.
    // When: its integration metadata is inspected.
    // Then: an optional data-system field is available.
    const schema = JSON.parse(readGeneratedArtifact('schemas/dsr-request-enricher-payload.json'));

    expect(schema.properties.extras.properties).toHaveProperty('dataSilo');
    expect(schema.properties.extras.required).not.toContain('dataSilo');
  });
});
