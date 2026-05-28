import { ConsentProvider as ReactConsentProvider } from '@transcend-io/airgap-react';
import type { ReactElement } from 'react';
import { describe, expect, test, vi } from 'vitest';

import { ConsentProvider } from './use-consent-manager.js';

vi.mock('next/script', () => ({
  default: function MockScript(): null {
    return null;
  },
}));

describe('ConsentProvider', () => {
  test('renders Script with the provided airgap source', () => {
    const result = ConsentProvider({
      airgapSrc: 'https://transcend-cdn.com/cm/example/airgap.js',
      children: 'children',
      scriptProps: { id: 'airgap', strategy: 'afterInteractive' },
    }) as ReactElement<{ children: ReactElement<Record<string, unknown>>[] }>;
    const [scriptElement] = result.props.children;

    expect(scriptElement?.props.src).toBe('https://transcend-cdn.com/cm/example/airgap.js');
    expect(scriptElement?.props.id).toBe('airgap');
    expect(scriptElement?.props.strategy).toBe('afterInteractive');
  });

  test('wraps children with the React consent provider', () => {
    const result = ConsentProvider({
      airgapSrc: 'https://transcend-cdn.com/cm/example/airgap.js',
      children: 'children',
    }) as ReactElement<{ children: ReactElement<Record<string, unknown>>[] }>;
    const [, reactProviderElement] = result.props.children;

    expect(reactProviderElement?.type).toBe(ReactConsentProvider);
    expect(reactProviderElement?.props.children).toBe('children');
    expect(reactProviderElement?.props.airgapSrc).toBeUndefined();
  });
});
