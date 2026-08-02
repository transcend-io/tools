import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { restoreSandboxProxy } from './lib/mcp-app-dev.ts';

const VENDORED_PROXY = fileURLToPath(
  new URL('./lib/inspector-sandbox-proxy.html', import.meta.url),
);
const PROXY_PATH = join('clients', 'web', 'static', 'sandbox_proxy.html');

const temporaryDirs: string[] = [];

/** Creates a directory shaped like an Inspector install, minus the proxy. */
function fakeInstall({ withWebClient = true } = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'inspector-install-'));
  temporaryDirs.push(dir);
  if (withWebClient) mkdirSync(join(dir, 'clients', 'web', 'dist'), { recursive: true });
  return dir;
}

afterEach(() => {
  let dir = temporaryDirs.pop();
  while (dir !== undefined) {
    rmSync(dir, { force: true, recursive: true });
    dir = temporaryDirs.pop();
  }
});

describe('restoreSandboxProxy', () => {
  it('writes the proxy document when the published package omitted it', () => {
    const installDir = fakeInstall();

    expect(restoreSandboxProxy(installDir)).toBe('written');
    expect(readFileSync(join(installDir, PROXY_PATH), 'utf8')).toBe(
      readFileSync(VENDORED_PROXY, 'utf8'),
    );
  });

  it('leaves an existing document untouched', () => {
    // The whole point of the workaround is to fill a gap, so a release that
    // ships its own proxy — or a newer one than ours — must win.
    const installDir = fakeInstall();
    const target = join(installDir, PROXY_PATH);
    mkdirSync(join(installDir, 'clients', 'web', 'static'), { recursive: true });
    writeFileSync(target, '<!doctype html><p>upstream</p>');

    expect(restoreSandboxProxy(installDir)).toBe('present');
    expect(readFileSync(target, 'utf8')).toBe('<!doctype html><p>upstream</p>');
  });

  it('creates nothing when the directory is not an Inspector install', () => {
    const installDir = fakeInstall({ withWebClient: false });

    expect(restoreSandboxProxy(installDir)).toBe('unrecognized');
    expect(existsSync(join(installDir, 'clients'))).toBe(false);
  });
});

describe('the vendored proxy document', () => {
  // Nothing imports this file, so only a test notices if it is deleted as dead
  // weight or truncated. These are the two things it has to be: a participant in
  // the bridge protocol, whose method names are its contract with the
  // Inspector's web client, and the isolation boundary that makes restoring
  // upstream's document — rather than improvising a replacement — the right
  // call. The hash below pins the bytes; this case is what says which part
  // broke.
  it('is a document speaking the sandbox bridge protocol, and denying same-origin access', () => {
    const html = readFileSync(VENDORED_PROXY, 'utf8');

    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('ui/notifications/sandbox-proxy-ready');
    expect(html).toContain('ui/notifications/sandbox-resource-ready');
    expect(html).toContain('allow-scripts allow-forms');
    expect(html).toMatch(/toLowerCase\(\) !== "allow-same-origin"/);
  });

  it('is byte-identical to upstream', () => {
    // This document is a security boundary we did not write, so it should only
    // ever change by deliberately re-copying upstream's. Editing it in place —
    // to satisfy a linter, or to "just fix" something — would silently change
    // what isolates an untrusted view, so make that a failing test instead.
    // Update the hash when re-copying, from:
    //
    //   curl -s https://raw.githubusercontent.com/modelcontextprotocol/inspector/main/clients/web/static/sandbox_proxy.html \
    //     | shasum -a 256
    const digest = createHash('sha256').update(readFileSync(VENDORED_PROXY)).digest('hex');

    expect(digest).toBe('895cebc62dce32428350a77af0a433faf3fbba4943cef5f49a28b9ed223f9d99');
  });
});
