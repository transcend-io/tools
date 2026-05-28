'use client';

export { airgapReady, ConsentBoundary, useConsentManager } from '@transcend-io/airgap-react';
export type {
  ConsentAPI,
  ConsentBoundaryFallbackProps,
  ConsentBoundaryProps,
} from '@transcend-io/airgap-react';
export { ConsentProvider } from './next/consent-manager.js';
export type { ConsentProviderProps } from './next/consent-manager.js';
export { TrackingScript } from './next/tracking-script.js';
export type { TrackingScriptProps } from './next/tracking-script.js';
