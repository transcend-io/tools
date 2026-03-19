/**
 * Convert io-ts codec for transcend.yml to a JSON Schema
 *
 * The resulting JSON schema is published in https://github.com/SchemaStore/schemastore
 * Most IDEs will thus autodetect `transcend.yml` and apply linting/autocomplete/intellisense.
 *
 * ... or, if the YAML file is differently named, users can add this comment to the top of the YAML file:
 * `# yaml-language-server: $schema=https://raw.githubusercontent.com/transcend-io/developer-tools/main/packages/cli/schema/transcend-yml-schema-latest.json`
 *
 * @see https://github.com/redhat-developer/yaml-language-server#using-inlined-schema
 * @see https://json-schema.org/understanding-json-schema/basics.html
 * @see https://github.com/SchemaStore/schemastore
 */

import { mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { toJsonSchema } from '@transcend-io/type-utils';

import * as packageJson from '../package.json';
import { TranscendInput } from '../src/codecs';

const packageRoot = join(import.meta.dirname, '..');
const schemaRoot = join(packageRoot, 'schema');
const rawSchemaBaseUrl =
  'https://raw.githubusercontent.com/transcend-io/developer-tools/main/packages/cli/schema';
const majorVersion = packageJson.version.split('.')[0];

// Create a major version JSON schema definition, and update the latest JSON schema definition.
mkdirSync(schemaRoot, { recursive: true });
for (const fileName of readdirSync(packageRoot)) {
  if (/^transcend-yml-schema-.*\.json$/u.test(fileName)) {
    renameSync(join(packageRoot, fileName), join(schemaRoot, fileName));
  }
}
for (const fileName of readdirSync(schemaRoot)) {
  if (/^transcend-yml-schema-.*\.json$/u.test(fileName)) {
    const schemaFilePath = join(schemaRoot, fileName);
    const jsonSchema = JSON.parse(readFileSync(schemaFilePath, 'utf8')) as {
      $id?: string;
    };

    jsonSchema.$id = `${rawSchemaBaseUrl}/${fileName}`;
    writeFileSync(schemaFilePath, `${JSON.stringify(jsonSchema, null, 2)}\n`);
  }
}
[`v${majorVersion}`, 'latest'].forEach((key) => {
  const fileName = `transcend-yml-schema-${key}.json`;

  const schemaDefaults = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: `${rawSchemaBaseUrl}/${fileName}`,
    title: 'transcend.yml',
    description: 'Define personal data schema and Transcend config as code with the Transcend CLI.',
  };

  // Build the JSON schema from io-ts codec
  const jsonSchema = { ...schemaDefaults, ...toJsonSchema(TranscendInput) };

  const schemaFilePath = join(schemaRoot, fileName);

  writeFileSync(schemaFilePath, `${JSON.stringify(jsonSchema, null, 2)}\n`);
});
