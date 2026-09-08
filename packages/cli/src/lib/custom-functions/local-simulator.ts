import { Buffer } from 'node:buffer';
import { isIP } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import {
  DSR_DATAPOINT_CUSTOM_FUNCTION_PAYLOAD_SCHEMA,
  DSR_REQUEST_ENRICHER_CUSTOM_FUNCTION_PAYLOAD_SCHEMA,
  GENERAL_CUSTOM_FUNCTION_PAYLOAD_SCHEMA,
} from '@transcend-io/custom-function-types';
import { CustomFunctionPayloadType, CustomFunctionType } from '@transcend-io/privacy-types';
import Ajv from 'ajv';

import type { CustomFunctionManifestConfig, CustomFunctionsManifest } from './manifest.js';

/** Value injected when production-only identifiers are absent from a fixture. */
export const LOCAL_SIMULATOR_IDENTIFIER = 'example-identifier';

/** Synthetic data silo used by local DSR simulations. */
export const LOCAL_SIMULATOR_DATA_SILO_ID = '00000000-0000-4000-8000-000000000000';

/** Default local execution timeout. */
export const LOCAL_SIMULATOR_TIMEOUT_MS = 30_000;

/** Maximum stdout and stderr retained from one local invocation. */
export const LOCAL_SIMULATOR_MAX_OUTPUT_BYTES = 1024 * 1024;

/** Maximum environment value size supported by the local process. */
export const LOCAL_SIMULATOR_MAX_ENV_VALUE_BYTES = 64 * 1024;

/** Isolated dependency cache readable by simulated functions. */
export const LOCAL_SIMULATOR_DENO_DIR = join(tmpdir(), 'transcend-custom-functions-deno');

/** Prefix for synthetic values assigned to unresolved local-only parameters. */
export const LOCAL_SIMULATOR_PARAMETER_PREFIX = 'local-placeholder-';

const RESERVED_ENV_NAMES = new Set([
  'DENO_CERT',
  'DENO_DIR',
  'DENO_TLS_CA_STORE',
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'NO_COLOR',
  'NO_PROXY',
  'NPM_CONFIG_REGISTRY',
]);

const ajv = new Ajv({ allErrors: true, strict: false });
const payloadValidators = {
  general: ajv.compile(GENERAL_CUSTOM_FUNCTION_PAYLOAD_SCHEMA),
  datapoint: ajv.compile(DSR_DATAPOINT_CUSTOM_FUNCTION_PAYLOAD_SCHEMA),
  enricher: ajv.compile(DSR_REQUEST_ENRICHER_CUSTOM_FUNCTION_PAYLOAD_SCHEMA),
};

/**
 * Find parameter placeholders in a manifest value.
 *
 * @param value - Manifest value
 * @returns Unique parameter names
 */
function parameterNames(value: unknown): string[] {
  const serialized = JSON.stringify(value) ?? '';
  return [
    ...new Set(Array.from(serialized.matchAll(/<<parameters\.([^>]+)>>/gu), (match) => match[1]!)),
  ];
}

/**
 * Add harmless defaults for unresolved environment-only parameters.
 *
 * Defaults are disabled whenever native networking is enabled. Parameters
 * referenced by source or payload paths remain required because substituting
 * those would change which files execute.
 *
 * @param manifest - Parsed manifest
 * @param provided - Explicit CLI parameters
 * @param allowNetwork - Whether native network calls are enabled
 * @returns Complete values and the names that received local defaults
 */
export function prepareLocalSimulatorParameters(
  manifest: Pick<CustomFunctionsManifest, 'functions'>,
  provided: Record<string, string>,
  allowNetwork: boolean,
): { parameters: Record<string, string>; defaulted: string[] } {
  const parameters = { ...provided };
  if (allowNetwork) {
    return { parameters, defaulted: [] };
  }
  const pathParameterNames = new Set(
    parameterNames(
      manifest.functions.flatMap((entry) => [
        entry.code,
        entry['test-payload'],
        ...(entry['test-payloads'] ?? []).map(({ payload }) => payload),
      ]),
    ),
  );
  const environmentParameterNames = parameterNames(manifest.functions.map(({ env }) => env));
  const defaulted = environmentParameterNames.filter(
    (name) => !Object.hasOwn(parameters, name) && !pathParameterNames.has(name),
  );
  defaulted.forEach((name) => {
    parameters[name] = `${LOCAL_SIMULATOR_PARAMETER_PREFIX}${name}`;
  });
  return { parameters, defaulted };
}

/** Complete local Deno process invocation. */
export interface LocalSimulatorInvocation {
  /** Deno CLI arguments. */
  args: string[];
  /** JSON sent privately over stdin. */
  input: string;
  /** Minimal environment exposed to the process. */
  env: NodeJS.ProcessEnv;
  /** Maximum execution time. */
  timeoutMs: number;
}

/**
 * Runtime wrapper modeled after Sombra's Deno executor.
 *
 * The local SDK intentionally simulates customer-ingress calls rather than
 * sending authenticated requests. Native fetch remains governed by Deno's
 * allow-net permissions.
 */
const LOCAL_SIMULATOR_SOURCE = `
const input = JSON.parse(await new Response(Deno.stdin.readable).text());
for (const [name, value] of Object.entries(input.functionArgs.environment)) {
  Deno.env.set(name, value);
}

class KV {
  constructor() {
    this.store = {};
  }

  get(key) {
    return Promise.resolve(key in this.store ? this.store[key] : null);
  }

  async set(key, value) {
    if (typeof value !== 'string') throw new Error('Value must be of type string');
    if (value.length > 2048) throw new Error('Cannot store value greater than 2048 bytes');
    if (key.length > 128) throw new Error('Key length cannot be greater than 128 bytes');
    if (!(key in this.store) && Object.keys(this.store).length >= 128) {
      throw new Error('Maximum number of keys allowed is 128');
    }
    this.store[key] = value;
  }

  keys() {
    return Promise.resolve(Object.keys(this.store));
  }

  has(key) {
    return Promise.resolve(key in this.store);
  }

  async del(key) {
    if (!(key in this.store)) return false;
    delete this.store[key];
    return true;
  }
}

class SDK {
  constructor(nonce) {
    this.transcendNonce = nonce;
    this.customerIngressBaseUrl = 'local://customer-ingress';
  }

  nonce() {
    return this.transcendNonce;
  }

  setCustomerIngressUrl(newUrl) {
    this.customerIngressBaseUrl = newUrl;
  }

  async ping() {
    await this.fetch('/test', { method: 'GET' });
  }

  fetch(path, options = {}) {
    const method = options.method ?? 'GET';
    console.warn(
      \`[simulator] sdk.fetch \${method} \${path} -> HTTP 200 (request not sent)\`,
    );
    return Promise.resolve(new Response(null, { status: 200, statusText: 'OK' }));
  }
}

try {
  const custom = await import(
    \`data:application/typescript;base64,\${input.base64Function}\`
  );
  if (!(input.functionToRun in custom)) {
    throw new Error(
      \`Custom Function does not export "\${input.functionToRun}" for this payload\`,
    );
  }
  await custom[input.functionToRun]({
    ...input.functionArgs,
    sdk: new SDK(input.functionArgs.nonce),
    kv: new KV(),
  });
  Deno.exit(0);
} catch (error) {
  console.error(error);
  Deno.exit(1);
}
`;

/**
 * Add values that Sombra normally injects into test payloads.
 *
 * @param config - Selected manifest function
 * @param payload - Parsed test fixture
 * @param payloadType - Optional DSR export selector
 * @returns Prepared local handler payload
 */
export function prepareLocalSimulatorPayload(
  config: Pick<CustomFunctionManifestConfig, 'dataSiloId' | 'name' | 'type'>,
  payload: object,
  payloadType?: CustomFunctionPayloadType,
): object {
  const record = payload as {
    /** Runtime core identifier. */
    coreIdentifier?: { value: string };
    /** DSR metadata. */
    extras?: Record<string, unknown>;
  };
  const extras = record.extras ?? {};
  const profile = extras['profile'] as { identifier?: unknown } | undefined;
  const type = config.type ?? CustomFunctionType.General;
  const isDataPoint =
    type === CustomFunctionType.Dsr && payloadType !== CustomFunctionPayloadType.RequestEnricher;
  const preparedProfile =
    isDataPoint && profile?.identifier === '{{identifier}}'
      ? { ...profile, identifier: LOCAL_SIMULATOR_IDENTIFIER }
      : profile;
  const dataSilo = extras['dataSilo'] as Record<string, unknown> | undefined;
  const preparedExtras =
    type === CustomFunctionType.Dsr
      ? {
          ...extras,
          ...(preparedProfile ? { profile: preparedProfile } : {}),
          dataSilo: {
            title: config.name,
            description: '',
            link: '',
            ...dataSilo,
            id: config.dataSiloId ?? dataSilo?.['id'] ?? LOCAL_SIMULATOR_DATA_SILO_ID,
          },
        }
      : preparedProfile
        ? { ...extras, profile: preparedProfile }
        : extras;
  return {
    ...record,
    ...(Object.keys(preparedExtras).length > 0 ? { extras: preparedExtras } : {}),
    coreIdentifier: record.coreIdentifier ?? { value: LOCAL_SIMULATOR_IDENTIFIER },
  };
}

/**
 * Validate a fixture with the same published schemas used by `check`.
 *
 * @param config - Selected manifest function
 * @param testPayload - Fixture and optional DSR export selector
 */
function validateLocalSimulatorPayload(
  config: CustomFunctionManifestConfig,
  testPayload: NonNullable<CustomFunctionManifestConfig['testPayloads']>[number],
): void {
  const type = config.type ?? CustomFunctionType.General;
  const validate =
    type !== CustomFunctionType.Dsr
      ? payloadValidators.general
      : testPayload.payloadType === CustomFunctionPayloadType.RequestEnricher
        ? payloadValidators.enricher
        : payloadValidators.datapoint;
  if (!validate(testPayload.payload)) {
    const details = (validate.errors ?? [])
      .map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`)
      .join('; ');
    throw new Error(`Invalid test payload for "${config.name}": ${details}`);
  }
}

/**
 * Check whether a value matches Sombra's hostname/IP contract.
 *
 * @param host - Manifest allowed-host value
 * @returns Whether the host is valid
 */
function isValidAllowedHost(host: string): boolean {
  const bracketedIp = /^\[([^\]]+)\](?::(\d+))?$/u.exec(host);
  if (bracketedIp) {
    const port = bracketedIp[2];
    return isIP(bracketedIp[1]!) === 6 && (!port || (Number(port) > 0 && Number(port) <= 65_535));
  }
  if (isIP(host) > 0) {
    return true;
  }
  const hostWithPort = /^([^:]+):(\d+)$/u.exec(host);
  const hostname = hostWithPort?.[1] ?? host;
  const port = hostWithPort?.[2];
  return (
    (!port || (Number(port) > 0 && Number(port) <= 65_535)) &&
    hostname.length <= 253 &&
    hostname
      .split('.')
      .every(
        (label) =>
          label.length > 0 &&
          label.length <= 63 &&
          /^[A-Za-z\d](?:[A-Za-z\d-]*[A-Za-z\d])?$/u.test(label),
      )
  );
}

/**
 * Build one constrained Deno invocation for a test fixture.
 *
 * @param config - Selected manifest function
 * @param testPayload - Fixture and optional DSR export selector
 * @param options - Discovered Deno configuration
 * @returns Process arguments, input, environment, and timeout
 */
export function buildLocalSimulatorInvocation(
  config: CustomFunctionManifestConfig,
  testPayload: NonNullable<CustomFunctionManifestConfig['testPayloads']>[number],
  options: {
    /** Existing deno.json or deno.jsonc path. */
    denoConfigPath?: string;
    /** Permit real native fetch calls to manifest allowed hosts. */
    allowNetwork?: boolean;
  } = {},
): LocalSimulatorInvocation {
  validateLocalSimulatorPayload(config, testPayload);
  const environment = config.env ?? {};
  const envNames = Object.keys(environment);
  const allowedHosts = config.allowedHosts ?? [];
  const malformedEnvNames = envNames.filter((name) => !/^[A-Za-z][A-Za-z\d_]*$/u.test(name));
  const reservedEnvNames = envNames.filter(
    (name) => RESERVED_ENV_NAMES.has(name) || name.startsWith('DENO_'),
  );
  if (malformedEnvNames.length > 0 || reservedEnvNames.length > 0) {
    throw new Error(
      [
        malformedEnvNames.length > 0
          ? `Invalid environment variable names: ${malformedEnvNames.join(', ')}`
          : undefined,
        reservedEnvNames.length > 0
          ? `Reserved environment variable names: ${reservedEnvNames.join(', ')}`
          : undefined,
      ]
        .filter(Boolean)
        .join('. '),
    );
  }
  const oversizedEnvNames = envNames.filter(
    (name) => Buffer.byteLength(environment[name]!) > LOCAL_SIMULATOR_MAX_ENV_VALUE_BYTES,
  );
  if (oversizedEnvNames.length > 0) {
    throw new Error(
      `Environment values exceed ${LOCAL_SIMULATOR_MAX_ENV_VALUE_BYTES} bytes: ${oversizedEnvNames.join(', ')}`,
    );
  }
  if (allowedHosts.length > 1 && allowedHosts.includes('*')) {
    throw new Error('allowed-hosts cannot combine "*" with specific hosts.');
  }
  const invalidHosts = allowedHosts.filter((host) => host !== '*' && !isValidAllowedHost(host));
  if (invalidHosts.length > 0) {
    throw new Error(`Invalid allowed-hosts: ${invalidHosts.join(', ')}`);
  }
  const allowNetArgs = options.allowNetwork
    ? allowedHosts.length === 0
      ? ['--allow-net=localhost']
      : allowedHosts[0] === '*'
        ? ['--allow-net']
        : [`--allow-net=${allowedHosts.join(',')}`]
    : [];
  const type = config.type ?? CustomFunctionType.General;
  const functionToRun =
    type === CustomFunctionType.Dsr &&
    testPayload.payloadType === CustomFunctionPayloadType.RequestEnricher
      ? 'enricher'
      : 'default';
  const runnerUrl = `data:application/javascript;base64,${Buffer.from(
    LOCAL_SIMULATOR_SOURCE,
  ).toString('base64')}`;
  const args = [
    'run',
    '--no-check',
    '--no-prompt',
    '--no-lock',
    '--node-modules-dir=none',
    '--vendor=false',
    `--allow-read=${LOCAL_SIMULATOR_DENO_DIR}`,
    ...(envNames.length > 0 ? [`--allow-env=${envNames.join(',')}`] : []),
    ...(options.denoConfigPath ? [`--config=${options.denoConfigPath}`] : ['--no-config']),
    ...allowNetArgs,
    ...(config.allowThirdPartyImports ? [] : ['--no-remote', '--no-npm']),
    runnerUrl,
  ];
  return {
    args,
    input: JSON.stringify({
      base64Function: Buffer.from(config.code).toString('base64'),
      functionToRun,
      functionArgs: {
        environment,
        payload: prepareLocalSimulatorPayload(config, testPayload.payload, testPayload.payloadType),
        nonce: 'local-simulator',
      },
    }),
    env: {
      ...environment,
      DENO_DIR: LOCAL_SIMULATOR_DENO_DIR,
      DENO_TLS_CA_STORE: 'system',
      NO_COLOR: '1',
    },
    timeoutMs:
      config.timeoutMs && config.timeoutMs > 0
        ? Math.min(config.timeoutMs, LOCAL_SIMULATOR_TIMEOUT_MS)
        : LOCAL_SIMULATOR_TIMEOUT_MS,
  };
}

/**
 * Remove terminal controls and opaque data URLs from local output.
 *
 * @param value - Untrusted terminal text
 * @returns Plain printable text
 */
function sanitizeLocalSimulatorText(value: string): string {
  return Array.from(
    stripVTControlCharacters(
      value.replace(
        /data:application\/(?:javascript|typescript);base64,[A-Za-z\d+/=]+/gu,
        '<local-module>',
      ),
    ).replace(/\r(?!\n)/gu, '\n'),
  )
    .filter((character) => {
      const code = character.codePointAt(0)!;
      return (
        code === 9 || code === 10 || (code >= 32 && code !== 127 && !(code >= 128 && code <= 159))
      );
    })
    .join('');
}

/**
 * Redact configured environment values from captured local output.
 *
 * @param output - Captured stdout or stderr
 * @param environment - User-defined environment
 * @returns Redacted output
 */
export function redactLocalSimulatorOutput(
  output: string,
  environment: Record<string, string> = {},
): string {
  const sanitized = sanitizeLocalSimulatorText(output);
  return Object.values(environment)
    .filter((value) => value.length > 0)
    .map(sanitizeLocalSimulatorText)
    .sort((left, right) => right.length - left.length)
    .reduce((redacted, value) => redacted.split(value).join('[REDACTED]'), sanitized);
}

/**
 * Truncate sanitized output without splitting a UTF-8 code point.
 *
 * @param output - Sanitized and redacted output
 * @param maxBytes - Maximum output size
 * @returns Bounded output and whether truncation occurred
 */
export function truncateLocalSimulatorOutput(
  output: string,
  maxBytes = LOCAL_SIMULATOR_MAX_OUTPUT_BYTES,
): { output: string; truncated: boolean } {
  const bytes = Buffer.from(output);
  if (bytes.length <= maxBytes) {
    return { output, truncated: false };
  }
  let end = maxBytes;
  while (end > 0 && (bytes[end]! & 0b1100_0000) === 0b1000_0000) {
    end -= 1;
  }
  return {
    output: bytes.subarray(0, end).toString('utf8'),
    truncated: true,
  };
}
