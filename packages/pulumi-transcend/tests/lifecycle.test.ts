import { describe, expect, it, vi } from 'vitest';

import type { ConfigDeps } from '../src/plugin/configResource/deps.js';
import {
  applyConfig,
  checkConfig,
  diffConfig,
  parseImportId,
  pullConfigInputs,
} from '../src/plugin/configResource/lifecycle.js';

const SECRET_KEY = '4dabf18193072939515e22adb298388d';
const SECRET_SIG = '1b47061264138c4ac30d75fd1eb44270';
const UNKNOWN = '04da6b54-80e4-46f7-96ec-b56ff0331ba9';

const PLAN_CLEAN = { summary: { create: 0, update: 0, unchanged: 1, skipped: 0, effects: 0 } };
const PLAN_DRIFT = { summary: { create: 0, update: 1, unchanged: 0, skipped: 0, effects: 0 } };

const YAML = 'data-subjects:\n  - type: customer\n    title: Customer\n';

function buildDeps(overrides: Partial<ConfigDeps> = {}): ConfigDeps {
  return {
    buildClient: vi.fn(() => ({}) as ReturnType<ConfigDeps['buildClient']>),
    previewPush: vi.fn().mockResolvedValue(PLAN_CLEAN),
    sync: vi.fn().mockResolvedValue({ success: true, errors: [] }),
    pull: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

describe('checkConfig', () => {
  it('accepts valid yaml', () => {
    expect(checkConfig({ yaml: YAML })).toEqual([]);
  });

  it('requires exactly one of yaml and content', () => {
    expect(checkConfig({})[0]?.reason).toMatch(/exactly one/);
    expect(checkConfig({ yaml: YAML, content: {} })[0]?.reason).toMatch(/exactly one/);
  });

  it('rejects variables with content', () => {
    expect(checkConfig({ content: {}, variables: { a: 'b' } })[0]?.reason).toMatch(/variables/);
  });

  it('reports a yaml problem against yaml', () => {
    const [failure] = checkConfig({ yaml: 'data-subjects: not-a-list' });
    expect(failure?.property).toBe('yaml');
  });

  it('skips validation while values are unknown', () => {
    expect(checkConfig({ yaml: UNKNOWN })).toEqual([]);
  });

  it('reads yaml wrapped as a secret', () => {
    expect(checkConfig({ yaml: { [SECRET_KEY]: SECRET_SIG, value: YAML } })).toEqual([]);
  });

  it('does not echo substituted variable values in yaml parse failures', () => {
    const secret = 'super-secret-webhook-header-value';
    const [failure] = checkConfig({
      yaml: 'data-subjects: [<<parameters.TOKEN>>\n',
      variables: { TOKEN: secret },
    });
    expect(failure?.property).toBe('yaml');
    expect(failure?.reason).not.toContain(secret);
  });
});

describe('diffConfig', () => {
  it('reports no change when the organization matches', async () => {
    const deps = buildDeps();
    expect(await diffConfig(deps, { yaml: YAML }, { yaml: YAML })).toBe(false);
  });

  it('reports a change when the organization drifted', async () => {
    const deps = buildDeps({ previewPush: vi.fn().mockResolvedValue(PLAN_DRIFT) });
    expect(await diffConfig(deps, { yaml: YAML }, { yaml: YAML })).toBe(true);
  });

  it('reports a change when a push option changed', async () => {
    const deps = buildDeps();
    expect(
      await diffConfig(deps, { yaml: YAML }, { yaml: YAML, publishToPrivacyCenter: true }),
    ).toBe(true);
  });

  it('assumes a change without calling the API when inputs are unknown', async () => {
    const deps = buildDeps();
    expect(await diffConfig(deps, { yaml: YAML }, { yaml: UNKNOWN })).toBe(true);
    expect(deps.previewPush).not.toHaveBeenCalled();
  });
});

describe('applyConfig', () => {
  it('pushes with publish and classify off by default', async () => {
    const deps = buildDeps();
    const outs = await applyConfig(deps, { yaml: YAML });
    expect(deps.sync).toHaveBeenCalledWith(
      expect.objectContaining({ 'data-subjects': expect.any(Array) }),
      expect.anything(),
      expect.objectContaining({ publishToPrivacyCenter: false, classifyService: false }),
    );
    expect(outs).toMatchObject({ yaml: YAML, sections: ['dataSubjects'], warnings: [] });
  });

  it('throws with per-item errors when the push fails', async () => {
    const deps = buildDeps({
      sync: vi.fn().mockResolvedValue({
        success: false,
        errors: [{ resource: 'data-subjects', item: 'customer', message: 'nope' }],
      }),
    });
    await expect(applyConfig(deps, { yaml: YAML })).rejects.toThrow('data-subjects/customer: nope');
  });

  it('does not echo warn or error logs when the push fails', async () => {
    const secret = 'super-secret-webhook-header-value';
    const deps = buildDeps({
      sync: vi.fn().mockResolvedValue({
        success: false,
        errors: [{ resource: 'data-silos', message: 'rejected' }],
        logs: [{ level: 'warn', message: `GraphQL failed with variables ${secret}` }],
      }),
    });
    const error = await applyConfig(deps, { yaml: YAML }).catch((caught) => caught);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/rejected/);
    expect((error as Error).message).not.toContain(secret);
  });

  it('keeps secret inputs secret in the outputs', async () => {
    const deps = buildDeps();
    const outs = await applyConfig(deps, { yaml: { [SECRET_KEY]: SECRET_SIG, value: YAML } });
    expect(outs.yaml).toEqual({ [SECRET_KEY]: SECRET_SIG, value: YAML });
  });
});

describe('import', () => {
  it('parses section names', () => {
    expect(parseImportId('dataSilos, purposes')).toEqual(['dataSilos', 'purposes']);
  });

  it('rejects unknown sections', () => {
    expect(() => parseImportId('dataSilos,nope')).toThrow(/Unknown: nope/);
  });

  it('pulls sections as yaml inputs', async () => {
    const deps = buildDeps({
      pull: vi
        .fn()
        .mockResolvedValue({ 'data-subjects': [{ type: 'customer', title: 'Customer' }] }),
    });
    const props = await pullConfigInputs(deps, parseImportId('dataSubjects'));
    expect(props.sections).toEqual(['dataSubjects']);
    expect(props.yaml).toContain('customer');
  });
});
