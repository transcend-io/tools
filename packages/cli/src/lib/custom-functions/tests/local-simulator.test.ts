import { Buffer } from 'node:buffer';

import { CustomFunctionPayloadType, CustomFunctionType } from '@transcend-io/privacy-types';
import { describe, expect, it } from 'vitest';

import {
  buildLocalSimulatorInvocation,
  LOCAL_SIMULATOR_DATA_SILO_ID,
  LOCAL_SIMULATOR_DENO_DIR,
  LOCAL_SIMULATOR_IDENTIFIER,
  LOCAL_SIMULATOR_TIMEOUT_MS,
  prepareLocalSimulatorPayload,
  redactLocalSimulatorOutput,
  truncateLocalSimulatorOutput,
} from '../local-simulator.js';
import { generateCustomFunctionTemplate } from '../scaffold-templates.js';

const ENRICHER_PAYLOAD = JSON.parse(
  generateCustomFunctionTemplate('Enricher', 'dsr-enricher').payloadFiles[0]!.contents,
) as object;

describe('prepareLocalSimulatorPayload', () => {
  it('adds production-style DSR defaults without mutating the fixture', () => {
    const fixture = {
      type: 'ACCESS',
      extras: {
        profile: {
          identifier: '{{identifier}}',
        },
      },
    };

    const payload = prepareLocalSimulatorPayload(
      { name: 'DSR lookup', type: CustomFunctionType.Dsr },
      fixture,
      CustomFunctionPayloadType.DataPoint,
    ) as {
      coreIdentifier: { value: string };
      extras: {
        profile: { identifier: string };
        dataSilo: { id: string; title: string };
      };
    };

    expect(payload.coreIdentifier.value).toBe(LOCAL_SIMULATOR_IDENTIFIER);
    expect(payload.extras.profile.identifier).toBe(LOCAL_SIMULATOR_IDENTIFIER);
    expect(payload.extras.dataSilo).toMatchObject({
      id: LOCAL_SIMULATOR_DATA_SILO_ID,
      title: 'DSR lookup',
    });
    expect(fixture.extras.profile.identifier).toBe('{{identifier}}');
  });

  it('prefers the manifest data silo ID over fixture metadata', () => {
    const payload = prepareLocalSimulatorPayload(
      {
        name: 'DSR lookup',
        type: CustomFunctionType.Dsr,
        dataSiloId: 'manifest-data-silo',
      },
      { extras: { dataSilo: { id: 'fixture-data-silo' } } },
      CustomFunctionPayloadType.DataPoint,
    ) as { extras: { dataSilo: { id: string } } };

    expect(payload.extras.dataSilo.id).toBe('manifest-data-silo');
  });

  it('only substitutes profile identifiers for datapoint payloads', () => {
    const payload = prepareLocalSimulatorPayload(
      { name: 'Enricher', type: CustomFunctionType.Dsr },
      { extras: { profile: { identifier: '{{identifier}}' } } },
      CustomFunctionPayloadType.RequestEnricher,
    ) as { extras: { profile: { identifier: string } } };

    expect(payload.extras.profile.identifier).toBe('{{identifier}}');
  });
});

describe('buildLocalSimulatorInvocation', () => {
  it('matches manifest permissions and selects the enricher export', () => {
    const invocation = buildLocalSimulatorInvocation(
      {
        name: 'Enricher',
        code: 'export function enricher() {}',
        type: CustomFunctionType.Dsr,
        env: { API_TOKEN: 'secret' },
        allowedHosts: ['api.example.com'],
        timeoutMs: 1234,
        testPayloads: [],
      },
      {
        payload: ENRICHER_PAYLOAD,
        payloadType: CustomFunctionPayloadType.RequestEnricher,
      },
      { denoConfigPath: '/repo/deno.json', allowNetwork: true },
    );

    expect(invocation.args).toEqual(
      expect.arrayContaining([
        '--no-check',
        '--no-prompt',
        '--allow-env=API_TOKEN',
        '--config=/repo/deno.json',
        '--allow-net=api.example.com',
        '--no-remote',
        '--no-npm',
        '--no-lock',
        '--node-modules-dir=none',
        '--vendor=false',
        `--allow-read=${LOCAL_SIMULATOR_DENO_DIR}`,
      ]),
    );
    expect(invocation.env).toEqual({
      API_TOKEN: 'secret',
      DENO_DIR: LOCAL_SIMULATOR_DENO_DIR,
      DENO_TLS_CA_STORE: 'system',
      NO_COLOR: '1',
    });
    expect(invocation.timeoutMs).toBe(1234);
    const input = JSON.parse(invocation.input);
    expect(input.functionToRun).toBe('enricher');
    expect(Buffer.from(input.base64Function, 'base64').toString()).toBe(
      'export function enricher() {}',
    );
  });

  it('allows declared third-party imports while denying native network access by default', () => {
    const invocation = buildLocalSimulatorInvocation(
      {
        name: 'General',
        code: 'export default function () {}',
        allowThirdPartyImports: true,
      },
      { payload: {} },
    );

    expect(invocation.args).not.toContain('--no-remote');
    expect(invocation.args).not.toContain('--no-npm');
    expect(invocation.args.some((argument) => argument.startsWith('--allow-net'))).toBe(false);
    expect(JSON.parse(invocation.input).functionToRun).toBe('default');
  });

  it('matches wildcard network access and rejects permission injection through env names', () => {
    const wildcard = buildLocalSimulatorInvocation(
      {
        name: 'General',
        code: 'export default function () {}',
        allowedHosts: ['*'],
      },
      { payload: {} },
      { allowNetwork: true },
    );

    expect(wildcard.args).toContain('--allow-net');
    expect(
      buildLocalSimulatorInvocation(
        {
          name: 'General',
          code: 'export default function () {}',
          allowedHosts: ['api.example.com:8443'],
        },
        { payload: {} },
        { allowNetwork: true },
      ).args,
    ).toContain('--allow-net=api.example.com:8443');
    expect(() =>
      buildLocalSimulatorInvocation(
        {
          name: 'General',
          code: 'export default function () {}',
          env: { 'TOKEN,PATH': 'secret' },
        },
        { payload: {} },
      ),
    ).toThrow('Invalid environment variable names: TOKEN,PATH');
    expect(
      buildLocalSimulatorInvocation(
        {
          name: 'General',
          code: 'export default function () {}',
          env: { PATH: '/custom/bin' },
        },
        { payload: {} },
      ).args,
    ).toContain('--allow-env=PATH');
    expect(() =>
      buildLocalSimulatorInvocation(
        {
          name: 'General',
          code: 'export default function () {}',
          allowedHosts: ['api.example.com,evil.example.com'],
        },
        { payload: {} },
        { allowNetwork: true },
      ),
    ).toThrow('Invalid allowed-hosts: api.example.com,evil.example.com');
  });

  it('caps manifest timeouts at the local runtime maximum', () => {
    const invocation = buildLocalSimulatorInvocation(
      {
        name: 'General',
        code: 'export default function () {}',
        timeoutMs: LOCAL_SIMULATOR_TIMEOUT_MS * 10,
      },
      { payload: {} },
    );

    expect(invocation.timeoutMs).toBe(LOCAL_SIMULATOR_TIMEOUT_MS);
  });
});

describe('redactLocalSimulatorOutput', () => {
  it('redacts every configured value, longest first', () => {
    expect(
      redactLocalSimulatorOutput(
        'token=secret-long and secret at data:application/typescript;base64,ZXJyb3I= ' +
          '\u001b[31mred\u001b[0m\rrewritten',
        {
          SHORT: 'secret',
          LONG: 'secret-long',
        },
      ),
    ).toBe('token=[REDACTED] and [REDACTED] at <local-module> red\nrewritten');
  });

  it('sanitizes terminal escapes before redacting secrets', () => {
    expect(
      redactLocalSimulatorOutput('sec\u001b[31mret', {
        TOKEN: 'secret',
      }),
    ).toBe('[REDACTED]');
  });
});

describe('truncateLocalSimulatorOutput', () => {
  it('does not split UTF-8 code points', () => {
    expect(truncateLocalSimulatorOutput('aéz', 2)).toEqual({
      output: 'a',
      truncated: true,
    });
    expect(truncateLocalSimulatorOutput('aéz', 3)).toEqual({
      output: 'aé',
      truncated: true,
    });
  });
});
