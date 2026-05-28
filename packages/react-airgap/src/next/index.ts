'use client';

export { ConsentContext, ConsentProvider, useConsentManager } from './consent-manager.js';
export type { ConsentAPI, ConsentProviderProps } from './consent-manager.js';
export { ConsentBoundary, getMissingConsentPurposesForUrls } from './consent-boundary.js';
export type {
  ConsentBoundaryFallbackProps,
  ConsentBoundaryFallbackStatus,
  ConsentBoundaryProps,
} from './consent-boundary.js';
export { default as TrackingScript } from './tracking-script.js';
export type { TrackingScriptProps } from './tracking-script.js';
