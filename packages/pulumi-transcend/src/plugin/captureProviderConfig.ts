import * as grpc from '@grpc/grpc-js';

import type { CredentialStore } from './credentials.js';

/** Minimal shape of the engine's `ConfigureRequest` that we read. */
interface ConfigureRequestLike {
  /** Stack config as `package:config:key` to JSON-encoded value */
  getVariablesMap(): { forEach(callback: (value: string, key: string) => void): void };
}

type UnaryHandler = (
  call: { request: unknown },
  callback: (error: unknown, response?: unknown) => void,
) => void;

/**
 * Read `apiKey` and `url` out of the engine's `Configure` variables.
 *
 * @param request - The engine's configure request
 * @returns Settings found in the request
 */
export function readProviderSettings(request: ConfigureRequestLike): {
  /** Transcend API key */
  apiKey?: string;
  /** Transcend API base URL */
  url?: string;
} {
  const settings: { apiKey?: string; url?: string } = {};
  request.getVariablesMap().forEach((raw, key) => {
    const name = key.replace(/^transcend:(config:)?/, '');
    if (name !== 'apiKey' && name !== 'url') return;
    const value = decodeConfigValue(raw);
    if (value !== '') settings[name] = value;
  });
  return settings;
}

/**
 * The engine sends a string setting as the bare string, and other types as JSON.
 * Both of our settings are strings, so a JSON string literal is unquoted and
 * anything that is not JSON is used as is.
 */
function decodeConfigValue(raw: string): string {
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : raw;
  } catch {
    return raw;
  }
}

/**
 * Make the Pulumi Node provider host forward `Configure` values to us.
 *
 * `pulumi.provider.main` answers `Configure` with a stub that drops the stack
 * configuration, and it exposes no hook for resource handlers to read it. This
 * wraps the `configure` handler when the host registers its gRPC service. Call
 * it once before `pulumi.provider.main`. Pin exact `@pulumi/pulumi` and
 * `@grpc/grpc-js` versions in the packed plugin so host internals stay stable.
 */
export function captureProviderConfig(credentials: CredentialStore): void {
  const originalAddService = grpc.Server.prototype.addService;
  grpc.Server.prototype.addService = function addServiceWithConfigure(
    service: grpc.ServiceDefinition,
    implementation: grpc.UntypedServiceImplementation,
  ): void {
    const configure = implementation.configure as UnaryHandler | undefined;
    if (configure) {
      implementation.configure = ((call, callback) => {
        credentials.setSettings(readProviderSettings(call.request as ConfigureRequestLike));
        configure.call(implementation, call, callback);
      }) as UnaryHandler as grpc.handleUnaryCall<unknown, unknown>;
    }
    originalAddService.call(this, service, implementation);
  };
}
