import type fs from 'node:fs';

import { describe, expect, it } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { check, type InventoryCheckCommandFlags, type InventoryCheckResult } from '../impl.js';

const YAML_PATH = './transcend.yml';

const VALID_YAML = `consent-manager:
  domains:
    - example.com
consent-sites:
  - host: www.example.com
    owners:
      - dev@example.com
`;

const BAD_SITES_YAML = `consent-manager:
  domains:
    - example.com
consent-sites:
  - host: example.com
  - host: example.com
    owners:
      - TBD
  - host: other.example.org
    teams:
      - Platform
`;

const flags = (
  overrides: Partial<InventoryCheckCommandFlags> = {},
): InventoryCheckCommandFlags => ({
  file: YAML_PATH,
  rules: '',
  variables: '',
  json: false,
  ...overrides,
});

/**
 * Build a test context backed by a fake file
 *
 * @param contents - File contents, or undefined for a missing file
 * @returns Context
 */
function buildContext(contents?: string): ReturnType<typeof buildContextForTest> {
  return buildContextForTest({
    fs: {
      existsSync: (path: string) => contents !== undefined && path === YAML_PATH,
      readFileSync: () => contents,
    } as unknown as typeof fs,
  });
}

describe('inventory check', () => {
  it('passes a valid file with the schema check only', async () => {
    const context = buildContext(BAD_SITES_YAML);
    await check.call(context, flags({ json: true }));

    const result: InventoryCheckResult = JSON.parse(context.stdout);
    expect(result).toMatchObject({ status: 'passed', rules: [], findings: [] });
    expect(context.process.exitCode).toBeUndefined();
  });

  it('prints a success line without --json', async () => {
    const context = buildContext(VALID_YAML);
    await check.call(context, flags({ rules: 'consentSitesHaveOwners,consentSitesInDomains' }));

    expect(context.stderr).toBe('');
    expect(context.process.exitCode).toBeUndefined();
  });

  it('exits non-zero and reports findings as JSON', async () => {
    const context = buildContext(BAD_SITES_YAML);
    await check.call(
      context,
      flags({
        rules: 'consentSitesHaveOwners,consentSitesInDomains,uniqueConsentSiteHosts',
        json: true,
      }),
    );

    const result: InventoryCheckResult = JSON.parse(context.stdout);
    expect(result.status).toBe('failed');
    expect(result.rules).toEqual([
      'consentSitesHaveOwners',
      'consentSitesInDomains',
      'uniqueConsentSiteHosts',
    ]);
    expect(result.findings.map(({ rule, path }) => `${rule} ${path}`)).toEqual([
      'consentSitesHaveOwners consent-sites[0]',
      'consentSitesHaveOwners consent-sites[1]',
      'consentSitesInDomains consent-sites[2].host',
      'uniqueConsentSiteHosts consent-sites[1].host',
    ]);
    expect(context.process.exitCode).toBe(1);
  });

  it('prints findings to stderr without --json', async () => {
    const context = buildContext(BAD_SITES_YAML);
    await check.call(context, flags({ rules: 'consentSitesHaveOwners' }));

    expect(context.stderr).toContain('consentSitesHaveOwners');
    expect(context.stderr).toContain('consent-sites[0]');
    expect(context.process.exitCode).toBe(1);
  });

  it('fails when the file does not match the schema', async () => {
    const context = buildContext('consent-sites: not-a-list\n');
    await check.call(context, flags({ json: true }));

    const result: InventoryCheckResult = JSON.parse(context.stdout);
    expect(result.status).toBe('failed');
    expect(result.findings[0]).toMatchObject({ rule: 'schema', severity: 'error' });
    expect(result.findings[0]!.message).toContain('consent-sites');
    expect(context.process.exitCode).toBe(1);
  });

  it('fails when the file is missing', async () => {
    const context = buildContext();
    await check.call(context, flags({ json: true }));

    const result: InventoryCheckResult = JSON.parse(context.stdout);
    expect(result.findings[0]).toMatchObject({ rule: 'schema', severity: 'error' });
    expect(result.findings[0]!.message).toContain('does not exist');
    expect(context.process.exitCode).toBe(1);
  });

  it('fills template variables like inventory push', async () => {
    const yaml = 'consent-manager:\n  domains:\n    - <<parameters.domain>>\n';
    const ok = buildContext(yaml);
    await check.call(ok, flags({ variables: 'domain:example.com', json: true }));
    expect(JSON.parse(ok.stdout).status).toBe('passed');

    const missing = buildContext(yaml);
    await check.call(missing, flags({ json: true }));
    const result: InventoryCheckResult = JSON.parse(missing.stdout);
    expect(result.status).toBe('failed');
    expect(result.findings[0]!.message).toContain('Found variable that was not set: domain');
  });

  it('throws for an unknown rule', async () => {
    const context = buildContext(VALID_YAML);
    await expect(check.call(context, flags({ rules: 'nope' }))).rejects.toThrow(/Unknown rule/);
  });
});
