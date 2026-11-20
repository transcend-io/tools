/** Kind of value accepted in a dashboard deep-link filter field. */
export const DashboardLinkFieldKind = {
  Enum: 'enum',
  Text: 'text',
  Id: 'id',
  Boolean: 'boolean',
  Date: 'date',
} as const;
export type DashboardLinkFieldKind =
  (typeof DashboardLinkFieldKind)[keyof typeof DashboardLinkFieldKind];

/** How a query parameter is encoded on Admin Dashboard list URLs. */
export const DashboardLinkParamEncoding = {
  Json: 'json',
  String: 'string',
  Integer: 'integer',
} as const;
export type DashboardLinkParamEncoding =
  (typeof DashboardLinkParamEncoding)[keyof typeof DashboardLinkParamEncoding];

/** Static filter field definition in dashboard-link-manifest.json. */
export interface DashboardLinkFieldDef {
  /** Value kind */
  kind: DashboardLinkFieldKind;
  /** Query param encoding; defaults to json for the `filters` blob */
  encoding?: DashboardLinkParamEncoding;
  /** Allowed enum values when kind is enum */
  values?: readonly string[];
  /** Database model name when kind is id */
  model?: string;
  /** Whether the field accepts multiple values in the JSON blob */
  multiple?: boolean;
  /** Short description for agents */
  description?: string;
}

/** One list page in dashboard-link-manifest.json. */
export interface DashboardPageLink {
  /** Route path or pattern such as `/privacy-requests/incoming-requests` */
  route: string;
  /** Human label */
  title: string;
  /** Filter fields keyed by GraphQL filter input property */
  filters?: Record<string, DashboardLinkFieldDef>;
  /** Extra scalar query params such as `tab` */
  params?: Record<
    string,
    DashboardLinkFieldDef & {
      encoding:
        | typeof DashboardLinkParamEncoding.String
        | typeof DashboardLinkParamEncoding.Integer;
    }
  >;
  /** Whether `sort` is persisted in the URL */
  sort?: boolean;
  /** Whether `page` is persisted in the URL */
  pagination?: boolean;
}

/** Published dashboard-link-manifest.json root. */
export interface DashboardLinkManifest {
  /** Manifest schema version */
  version: number;
  /** Git commit SHA of the admin-dashboard build when present */
  commit?: string;
  /** Dashboard origin used in generated URLs */
  origin: string;
  /** One entry per supported list page */
  pages: DashboardPageLink[];
}
