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

/** Shared reason for the dead SDK `ai` module operations. */
const REMOVED_AI_OPERATION =
  'The backend dropped the agents, large language models, and prompt threads tables, so the schema no longer exposes this operation. Delete the SDK ai module in a major release.';

/**
 * Documents known to be invalid today. Each entry needs a reason.
 * Remove the entry when the document is fixed. The test fails if an entry
 * becomes valid, so this list cannot go stale.
 */
const KNOWN_INVALID: Record<string, string> = {
  'packages/sdk/src/ai/gqls/agent.ts#AGENTS': REMOVED_AI_OPERATION,
  'packages/sdk/src/ai/gqls/agent.ts#CREATE_AGENT': REMOVED_AI_OPERATION,
  'packages/sdk/src/ai/gqls/agent.ts#UPDATE_AGENTS': REMOVED_AI_OPERATION,
  'packages/sdk/src/ai/gqls/agentFile.ts#AGENT_FILES': REMOVED_AI_OPERATION,
  'packages/sdk/src/ai/gqls/agentFile.ts#CREATE_AGENT_FILE': REMOVED_AI_OPERATION,
  'packages/sdk/src/ai/gqls/agentFile.ts#UPDATE_AGENT_FILES': REMOVED_AI_OPERATION,
  'packages/sdk/src/ai/gqls/agentFunction.ts#AGENT_FUNCTIONS': REMOVED_AI_OPERATION,
  'packages/sdk/src/ai/gqls/agentFunction.ts#CREATE_AGENT_FUNCTION': REMOVED_AI_OPERATION,
  'packages/sdk/src/ai/gqls/agentFunction.ts#UPDATE_AGENT_FUNCTIONS': REMOVED_AI_OPERATION,
  'packages/sdk/src/ai/gqls/largeLanguageModel.ts#LARGE_LANGUAGE_MODELS': REMOVED_AI_OPERATION,
  'packages/sdk/src/ai/gqls/promptRun.ts#ADD_MESSAGES_TO_PROMPT_RUN': REMOVED_AI_OPERATION,
  'packages/sdk/src/ai/gqls/promptThread.ts#PROMPT_THREADS': REMOVED_AI_OPERATION,
};

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
      const errors = errorsFor(source);
      if (id in KNOWN_INVALID) {
        expect(
          errors,
          `${id} is allowlisted but now valid. Remove it from KNOWN_INVALID.`,
        ).not.toEqual([]);
        return;
      }
      expect(errors).toEqual([]);
    });
  }
});
