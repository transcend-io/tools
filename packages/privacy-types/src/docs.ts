/** Allowed `guideType` frontmatter values on docs.transcend.io pages. */
export const DocsGuideType = {
  OverviewsAndConcepts: 'Overviews & Concepts',
  UseCaseGuides: 'Use Case Guides',
  DeveloperDocs: 'Developer Docs',
  IntegrationGuides: 'Integration Guides',
  Troubleshooting: 'Troubleshooting',
} as const;
export type DocsGuideType = (typeof DocsGuideType)[keyof typeof DocsGuideType];

/** Who reads a docs page. */
export const DocsPersona = {
  Compliance: 'Compliance',
  Development: 'Development',
  Operations: 'Operations',
  Legal: 'Legal',
  Security: 'Security',
  Marketing: 'Marketing',
} as const;
export type DocsPersona = (typeof DocsPersona)[keyof typeof DocsPersona];

/** Customer goals a docs page serves. */
export const DocsUseCase = {
  PrivacyImpactAssessments: 'Privacy Impact Assessments',
  KnowYourData: 'Know Your Data',
  FullStackConsent: 'Full Stack Consent',
  LegacyMigrations: 'Legacy Migrations',
  DoNotSellOrShare: 'Do Not Sell or Share',
  DataMinimization: 'Data Minimization',
  InAppDeletion: 'In-App Deletion',
} as const;
export type DocsUseCase = (typeof DocsUseCase)[keyof typeof DocsUseCase];

/**
 * Who may read a docs page.
 * Omit `access` in frontmatter for signed-in only. Set `public` to opt in.
 */
export const DocsAccess = {
  Public: 'public',
  SignedIn: 'signedIn',
} as const;
export type DocsAccess = (typeof DocsAccess)[keyof typeof DocsAccess];

/** Lookup API content source filter. */
export const DocsLookupSource = {
  Guides: 'guides',
  ApiReference: 'api-reference',
  Graphql: 'graphql',
  Marketing: 'marketing',
} as const;
export type DocsLookupSource = (typeof DocsLookupSource)[keyof typeof DocsLookupSource];

/** `matchedBy` value on docs lookup API rows. */
export const DocsLookupMatch = {
  Route: 'route',
  Integration: 'integration',
  Graphql: 'graphql',
  Product: 'product',
  Fulltext: 'fulltext',
  FulltextFallback: 'fulltext-fallback',
} as const;
export type DocsLookupMatch = (typeof DocsLookupMatch)[keyof typeof DocsLookupMatch];

/** `match` field on docs_list rows from route or product lookup. */
export const DocsListRouteMatch = {
  Primary: 'primary',
  Mention: 'mention',
  Product: 'product',
  Search: 'search',
} as const;
export type DocsListRouteMatch = (typeof DocsListRouteMatch)[keyof typeof DocsListRouteMatch];

/** GraphQL schema artifact kind for docs lookup. */
export const DocsGraphqlKind = {
  Query: 'query',
  Mutation: 'mutation',
  Type: 'type',
  Input: 'input',
  Enum: 'enum',
} as const;
export type DocsGraphqlKind = (typeof DocsGraphqlKind)[keyof typeof DocsGraphqlKind];

const docsGuideTypeTitles = new Set<string>(Object.values(DocsGuideType));

/** Returns a known guide type title, or null when the index carries a newer label. */
export function parseDocsGuideType(value: string | null | undefined): DocsGuideType | null {
  if (value == null || value === '') {
    return null;
  }
  return docsGuideTypeTitles.has(value) ? (value as DocsGuideType) : null;
}

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
