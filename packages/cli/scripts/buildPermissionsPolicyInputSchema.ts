/**
 * Generate the Permissions API OPA input JSON Schema from the privacy-types codec.
 *
 * Output: packages/cli/schema/permissions-policy-input.json
 * Consumed by `policy new --template permissions` scaffolding.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildPermissionsPolicyInputJsonSchema } from '@transcend-io/privacy-types';

const packageRoot = join(import.meta.dirname, '..');
const schemaRoot = join(packageRoot, 'schema');
const schemaFilePath = join(schemaRoot, 'permissions-policy-input.json');

mkdirSync(schemaRoot, { recursive: true });

const jsonSchema = buildPermissionsPolicyInputJsonSchema();

writeFileSync(schemaFilePath, `${JSON.stringify(jsonSchema, null, 2)}\n`);
