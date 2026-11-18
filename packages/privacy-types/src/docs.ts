/**
 * Product titles used in docs.transcend.io page frontmatter and dashboard-routes.json.
 * `Platform` covers workspace routes.
 */
export const DocsProduct = {
  Assessments: 'Assessments',
  Classification: 'Classification',
  ConsentManagement: 'Consent Management',
  DataInventory: 'Data Inventory',
  DsrAutomation: 'DSR Automation',
  Platform: 'Platform',
  PreferenceManagement: 'Preference Management',
  PrivacyCenter: 'Privacy Center',
  SystemDiscovery: 'System Discovery',
  WebAuditor: 'Web Auditor',
} as const;

/** Allowed docs product title. */
export type DocsProduct = (typeof DocsProduct)[keyof typeof DocsProduct];
