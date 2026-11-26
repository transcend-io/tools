/**
 * The Pulumi wire protocol marks unknown and secret values with fixed sentinels.
 * They are part of the public protocol, so we hold copies here instead of
 * importing them from Pulumi's internal runtime modules.
 */
const UNKNOWN_VALUE = '04da6b54-80e4-46f7-96ec-b56ff0331ba9';
const SPECIAL_SIG_KEY = '4dabf18193072939515e22adb298388d';
const SECRET_SIG = '1b47061264138c4ac30d75fd1eb44270';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSecretEnvelope(value: unknown): value is JsonRecord & {
  /** The wrapped value */
  value: unknown;
} {
  return isRecord(value) && value[SPECIAL_SIG_KEY] === SECRET_SIG;
}

/** Whether a value, or anything nested in it, is not known until apply time. */
export function containsUnknown(value: unknown): boolean {
  if (value === UNKNOWN_VALUE) return true;
  if (Array.isArray(value)) return value.some(containsUnknown);
  if (isSecretEnvelope(value)) return containsUnknown(value.value);
  if (isRecord(value)) return Object.values(value).some(containsUnknown);
  return false;
}

function unwrapDeep(value: unknown, found: { secret: boolean }): unknown {
  if (isSecretEnvelope(value)) {
    found.secret = true;
    return unwrapDeep(value.value, found);
  }
  if (Array.isArray(value)) return value.map((entry) => unwrapDeep(entry, found));
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, unwrapDeep(entry, found)]),
    );
  }
  return value;
}

/** A property bag with secret envelopes removed and the secret keys remembered. */
export interface PlainProperties {
  /** Properties with every secret envelope removed */
  values: JsonRecord;
  /** Top-level keys that held a secret anywhere inside them */
  secretKeys: ReadonlySet<string>;
}

/**
 * Remove secret envelopes from engine properties so SDK code sees plain values.
 *
 * @param properties - Properties as the engine sent them
 * @returns Plain values and which top-level keys were secret
 */
export function unwrapSecrets(properties: JsonRecord): PlainProperties {
  const secretKeys = new Set<string>();
  const values = Object.fromEntries(
    Object.entries(properties).map(([key, value]) => {
      const found = { secret: false };
      const plain = unwrapDeep(value, found);
      if (found.secret) secretKeys.add(key);
      return [key, plain];
    }),
  );
  return { values, secretKeys };
}

/**
 * Wrap the named top-level properties as secrets so state never stores them in
 * plaintext.
 *
 * @param properties - Plain properties to return to the engine
 * @param secretKeys - Keys to mark as secret
 * @returns Properties with the named keys wrapped
 */
export function wrapSecrets(properties: JsonRecord, secretKeys: ReadonlySet<string>): JsonRecord {
  return Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [
      key,
      secretKeys.has(key) && value !== undefined ? { [SPECIAL_SIG_KEY]: SECRET_SIG, value } : value,
    ]),
  );
}
