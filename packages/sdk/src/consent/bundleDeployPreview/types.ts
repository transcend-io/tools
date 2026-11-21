/** Module tab keys aligned with the consent deploy review modal */
export const ConsentDeployModuleKey = {
  Core: 'core',
  Scripts: 'scripts',
  Tcf: 'tcf',
  NativeApp: 'nativeApp',
  Messages: 'messages',
  Stylesheet: 'stylesheet',
  UiV2Messages: 'uiV2Messages',
  UiV2Themes: 'uiV2Themes',
} as const;

/** Values of {@link ConsentDeployModuleKey} */
export type ConsentDeployModuleKeyValue =
  (typeof ConsentDeployModuleKey)[keyof typeof ConsentDeployModuleKey];

/** Top-level keys in consent manager configuration JSON */
export interface PendingConsentBundleConfig {
  /** Airgap core module */
  core?: unknown;
  /** TCF vendor list module */
  tcf?: unknown;
  /** Native app module */
  nativeApp?: unknown;
  /** Locale-keyed message modules */
  messages?: unknown;
  /** Stylesheet module */
  stylesheet?: unknown;
  /** UI v2 message modules */
  uiV2Messages?: unknown;
}

/** Result of comparing one module */
export interface ConsentModuleDiff {
  /** Module tab key — see {@link ConsentDeployModuleKey} */
  key: ConsentDeployModuleKeyValue;
  /** Whether a diff was detected */
  changesMade: boolean;
  /** Unified diff text for chat display */
  patch: string;
  /** True when the patch was truncated */
  truncated: boolean;
  /** Short bullets for summaries */
  highlights: string[];
}

/** Full deploy preview */
export interface ConsentBundleDeployDiff {
  /** No prior deploy for this environment */
  firstDeploy: boolean;
  /** Last deploy timestamp, if any */
  lastDeployedAt: string | null;
  /** Whether any module changed */
  hasChanges: boolean;
  /** Per-module diffs */
  modules: ConsentModuleDiff[];
}

/** Inputs needed to diff pending vs deployed */
export interface ConsentBundleDeployDiffInputs {
  /** Configuration that would be published */
  pending: PendingConsentBundleConfig;
  /** Deployed core snapshot, if any */
  deployedCore: Record<string, unknown> | null;
  /** Modules fetched from CDN for the deployed bundle */
  deployedModules: Partial<PendingConsentBundleConfig>;
  /** Last deploy timestamp */
  lastDeployedAt: string | null;
  /** No prior version for this environment */
  firstDeploy: boolean;
  /** Bundle script URL used to resolve the CDN origin */
  bundleUrl: string;
  /** Whether TCF modules should be compared */
  useIabFramework: boolean;
}
