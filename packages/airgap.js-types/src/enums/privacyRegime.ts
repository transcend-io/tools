/**
 * Potentially applicable data privacy legal regimes
 * NOTE: Please make sure that new entries are compatible with GraphQL Enums
 */
export enum PrivacyRegimeEnum {
  /** Unable to determine any applicable regimes */
  Unknown = 'Unknown',
  /** California Privacy Rights Act (and CCPA: California Consumer Privacy Act) */
  CPRA = 'CPRA',
  /** EU General Data Protection Regulation */
  GDPR = 'GDPR',
  /** Brazil Lei Geral de Proteção de Dados (General Personal Data Protection Law) */
  LGPD = 'LGPD',
  /** Virginia Consumer Data Protection Act */
  CDPA = 'CDPA',
  /** Colorado Privacy Act */
  CPA = 'CPA',
  /** Nevada Senate Bill 220 */
  'NEVADA_SB220' = 'NEVADA_SB220',
}
