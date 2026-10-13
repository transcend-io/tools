/**
 * Environment variable row from `custom_functions_upsert`.
 */
export interface CustomFunctionEnvironmentVariableInput {
  /** Variable name */
  key: string;
  /** Plaintext value; omit on update to keep the stored value; never pass for secrets */
  value?: string;
  /** When true, encrypt at sign time; values are set in the dashboard only */
  isSecret: boolean;
}
