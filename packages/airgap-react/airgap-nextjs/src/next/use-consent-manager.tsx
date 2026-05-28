'use client';

import {
  ConsentProvider as ReactConsentProvider,
  type ConsentProviderProps as ReactConsentProviderProps,
} from '@transcend-io/airgap-react';
import Script, { type ScriptProps } from 'next/script';
import { type ReactElement } from 'react';

export interface ConsentProviderProps extends Pick<ReactConsentProviderProps, 'children'> {
  /** airgap.js script URL from Transcend's developer settings. */
  airgapSrc: string;
  /** Additional props forwarded to `next/script`. */
  scriptProps?: Omit<ScriptProps, 'children' | 'src'>;
}

/**
 * Provides loaded `airgap` and `transcend` APIs to React children while loading
 * airgap.js through `next/script`.
 */
export function ConsentProvider({
  airgapSrc,
  children,
  scriptProps,
}: ConsentProviderProps): ReactElement {
  return (
    <>
      <Script src={airgapSrc} {...scriptProps} />
      <ReactConsentProvider>{children}</ReactConsentProvider>
    </>
  );
}
