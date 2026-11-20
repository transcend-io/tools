import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const MCP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Matches `import ... from 'node:fs'`, `'fs'`, and the `/promises` variants. */
const FS_IMPORT = /from\s+['"](?:node:)?fs(?:\/promises)?['"]/;

/** Matches the flag as it appears in a `defineTool` config. */
const FLAG = /requireLocalFilesystem:\s*true/;

/**
 * Tool files that reach the disk through a helper but are not flagged yet.
 * `policy_publish` accepts a local `dir`, so over HTTP it reads the shared
 * server's disk. Flagging it would also hide its `files` mode, so it needs a
 * separate fix. Do not add entries here without a tracked follow-up.
 */
const KNOWN_UNFLAGGED = new Set([
  'mcp-server-policy/src/tools/policy_publish.ts',
  'mcp-server-policy/src/tools/policy_set_live.ts',
  'mcp-server-policy/src/tools/policy_list_bundles.ts',
]);

function listTypeScript(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (entry === 'node_modules' || entry === 'dist') return [];
    return statSync(full).isDirectory() ? listTypeScript(full) : full.endsWith('.ts') ? [full] : [];
  });
}

/** Resolves a relative `./x.js` import to the `.ts` file next to it, if any. */
function relativeImports(file: string, source: string): string[] {
  return [...source.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)].map((match) =>
    path.resolve(path.dirname(file), match[1]!.replace(/\.js$/, '.ts')),
  );
}

describe('requireLocalFilesystem', () => {
  it('is set on every tool that reads or writes local files', () => {
    const packages = readdirSync(MCP_DIR).filter(
      (name) => name.startsWith('mcp-server-') && name !== 'mcp-server-base',
    );

    const offenders: string[] = [];
    for (const pkg of packages) {
      const srcDir = path.join(MCP_DIR, pkg, 'src');
      let files: string[];
      try {
        files = listTypeScript(srcDir);
      } catch {
        continue;
      }
      const sources = new Map(files.map((file) => [file, readFileSync(file, 'utf-8')]));
      const touchesDisk = new Set(
        [...sources].filter(([, source]) => FS_IMPORT.test(source)).map(([file]) => file),
      );

      for (const [file, source] of sources) {
        if (!path.relative(srcDir, file).startsWith(`tools${path.sep}`)) continue;
        const reachesDisk =
          touchesDisk.has(file) ||
          relativeImports(file, source).some((imported) => touchesDisk.has(imported));
        if (!reachesDisk || FLAG.test(source)) continue;

        const relative = path.relative(MCP_DIR, file).split(path.sep).join('/');
        if (!KNOWN_UNFLAGGED.has(relative)) offenders.push(relative);
      }
    }

    expect(
      offenders,
      'These tools touch the local filesystem but are not flagged with `requireLocalFilesystem: true`, ' +
        'so the hosted HTTP server would run them against its own disk.',
    ).toEqual([]);
  });

  it('keeps the known-unflagged list free of stale entries', () => {
    for (const relative of KNOWN_UNFLAGGED) {
      const source = readFileSync(path.join(MCP_DIR, relative), 'utf-8');
      expect(FLAG.test(source), `${relative} is flagged now. Remove it from KNOWN_UNFLAGGED.`).toBe(
        false,
      );
    }
  });
});
