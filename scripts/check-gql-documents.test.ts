/**
 * Repo-wide audit that every GraphQL document in the SDK and CLI is valid
 * against the committed `schema.graphql` snapshot.
 *
 * The MCP servers get this check from codegen at compile time. The SDK and CLI
 * write operations with the untyped `gql` tag, so schema drift (a removed
 * mutation, a renamed field, a newly required argument) only fails at runtime.
 * This test catches that drift in CI instead.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildSchema, parse, validate } from 'graphql';
import { describe, expect, test } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_ROOTS = ['packages/sdk/src', 'packages/cli/src'];

/** Recursively list non-test TypeScript files that use the `gql` tag. */
function findGqlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      return entry === 'node_modules' || entry === 'dist' || entry === 'tests'
        ? []
        : findGqlFiles(full);
    }
    if (!full.endsWith('.ts') || full.endsWith('.test.ts')) return [];
    return /\bgql`/.test(readFileSync(full, 'utf8')) ? [full] : [];
  });
}

/** Collect `file#ExportName -> document string` for every GraphQL export. */
async function collectDocuments(): Promise<Record<string, string>> {
  const files = SCAN_ROOTS.flatMap((root) => findGqlFiles(path.join(repoRoot, root)));
  const documents: Record<string, string> = {};
  for (const file of files) {
    const mod = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
    for (const [name, value] of Object.entries(mod)) {
      if (typeof value === 'string' && /^\s*(query|mutation|subscription|fragment)\b/.test(value)) {
        documents[`${path.relative(repoRoot, file)}#${name}`] = value;
      }
    }
  }
  return documents;
}

describe('SDK and CLI GraphQL documents', async () => {
  const schema = buildSchema(readFileSync(path.join(repoRoot, 'schema.graphql'), 'utf8'));
  const documents = await collectDocuments();

  /** Return the validation error messages for one document. */
  const errorsFor = (source: string): string[] => {
    try {
      return validate(schema, parse(source)).map((err) => err.message);
    } catch (err) {
      return [(err as Error).message];
    }
  };

  test('finds documents to validate', () => {
    expect(Object.keys(documents).length).toBeGreaterThan(100);
  });

  for (const [id, source] of Object.entries(documents)) {
    test(id, () => {
      expect(errorsFor(source)).toEqual([]);
    });
  }
});
