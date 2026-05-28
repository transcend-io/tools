'use client';

export { airgapReady } from './core/airgap-ready.js';
export type { ConsentAPI } from './core/consent-apis.js';
export { ConsentBoundary } from './react/consent-boundary.js';
export type {
  ConsentBoundaryFallbackProps,
  ConsentBoundaryProps,
} from './react/consent-boundary.js';
export { ConsentProvider, useConsentManager } from './react/use-consent-manager.js';
export type { ConsentProviderProps } from './react/use-consent-manager.js';
export { TrackingScript } from './react/tracking-script.js';
export type { TrackingScriptProps } from './react/tracking-script.js';
