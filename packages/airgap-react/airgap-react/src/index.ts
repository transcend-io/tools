'use client';

export { airgapReady } from './core/airgap-ready.js';
export type { ConsentAPI } from './core/consent-manager.js';
export { ConsentBoundary } from './react/consent-boundary.js';
export type {
  ConsentBoundaryFallbackProps,
  ConsentBoundaryProps,
} from './react/consent-boundary.js';
export { ConsentContext, ConsentProvider, useConsentManager } from './react/consent-manager.js';
export type { ConsentProviderProps } from './react/consent-manager.js';
export { TrackingScript } from './react/tracking-script.js';
export type { TrackingScriptProps } from './react/tracking-script.js';
