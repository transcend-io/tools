import type { AirgapAPI, TrackingPurpose } from '@transcend-io/airgap.js-types';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { getMissingConsentPurposesForUrls } from '../core/consent-boundary.js';
import { ConsentBoundary, type ConsentBoundaryFallbackProps } from './consent-boundary.js';

const mocks = vi.hoisted(() => ({
  useConsentManager: vi.fn(),
  useEffect: vi.fn(),
  useState: vi.fn(),
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();

  return {
    ...actual,
    useEffect: mocks.useEffect,
    useState: mocks.useState,
  };
});

vi.mock('./use-consent-manager.js', () => ({
  useConsentManager: mocks.useConsentManager,
}));

describe('ConsentBoundary', () => {
  beforeEach(() => {
    mocks.useConsentManager.mockReset();
    mocks.useEffect.mockReset();
    mocks.useState.mockReset();
  });

  test('renders fallback while pending without mounting children', () => {
    const fallback = vi.fn(() => 'fallback');
    mocks.useConsentManager.mockReturnValue({});
    mocks.useState.mockReturnValue([{ status: 'pending' }, vi.fn()]);
    mocks.useEffect.mockImplementation(() => undefined);

    const result = ConsentBoundary({
      children: 'blocked children',
      fallback,
      urlsRequiredForRender: ['https://example.com/tracker.js'],
    });

    expect(result).toBe('fallback');
    expect(fallback).toHaveBeenCalledWith(
      expect.objectContaining({
        missingConsentPurposes: new Set<TrackingPurpose>(),
        status: 'pending',
      }),
    );
  });

  test('renders children after required URLs are allowed', () => {
    mocks.useConsentManager.mockReturnValue({});
    mocks.useState.mockReturnValue([{ status: 'allowed' }, vi.fn()]);
    mocks.useEffect.mockImplementation(() => undefined);

    const result = ConsentBoundary({
      children: 'allowed children',
      urlsRequiredForRender: ['https://example.com/tracker.js'],
    }) as ReactElement<{ children: string }>;

    expect(result.props.children).toBe('allowed children');
  });

  test('renders fallback with missing purposes when blocked', () => {
    const missingConsentPurposes = new Set<TrackingPurpose>(['Analytics']);
    const fallback = vi.fn(() => 'fallback');
    mocks.useConsentManager.mockReturnValue({});
    mocks.useState.mockReturnValue([{ missingConsentPurposes, status: 'blocked' }, vi.fn()]);
    mocks.useEffect.mockImplementation(() => undefined);

    const result = ConsentBoundary({
      children: 'blocked children',
      fallback,
      urlsRequiredForRender: ['https://example.com/tracker.js'],
    });

    expect(result).toBe('fallback');
    expect(fallback).toHaveBeenCalledWith(
      expect.objectContaining({
        missingConsentPurposes,
        status: 'blocked',
      }),
    );
  });

  test('keys URL effect dependencies by contents', () => {
    const airgap = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const effectDeps: unknown[][] = [];
    const urlsRequiredForRender = ['https://example.com/tracker.js'];
    mocks.useConsentManager.mockReturnValue({ airgap });
    mocks.useState.mockReturnValue([{ status: 'pending' }, vi.fn()]);
    mocks.useEffect.mockImplementation((_effect: () => void | (() => void), deps?: unknown[]) => {
      effectDeps.push(deps ?? []);
    });

    ConsentBoundary({
      children: 'blocked children',
      urlsRequiredForRender,
    });

    expect(effectDeps[0]?.[2]).toBe(JSON.stringify(urlsRequiredForRender));
    expect(effectDeps[0]).not.toContain(urlsRequiredForRender);
  });

  test('refreshes consent checks when Airgap consent events fire', () => {
    const setConsentRefreshCounter = vi.fn();
    const airgap = {
      addEventListener: vi.fn(),
      getPurposes: vi.fn(() => Promise.resolve(new Set<TrackingPurpose>(['Analytics']))),
      getRegimePurposes: vi.fn(() => new Set<TrackingPurpose>()),
      isAllowed: vi.fn(() => Promise.resolve(false)),
      isConsented: vi.fn(() => false),
      removeEventListener: vi.fn(),
    };
    mocks.useConsentManager.mockReturnValue({ airgap });
    mocks.useState
      .mockReturnValueOnce([{ status: 'pending' }, vi.fn()])
      .mockReturnValueOnce([0, setConsentRefreshCounter]);
    mocks.useEffect.mockImplementation((effect: () => void | (() => void)) => effect());

    ConsentBoundary({
      children: 'blocked children',
      urlsRequiredForRender: ['https://example.com/tracker.js'],
    });

    expect(airgap.addEventListener).toHaveBeenCalledWith('consent-change', expect.any(Function));
    expect(airgap.addEventListener).toHaveBeenCalledWith(
      'consent-resolution',
      expect.any(Function),
    );
    expect(airgap.addEventListener).toHaveBeenCalledWith('sync', expect.any(Function));

    const refreshConsentState = airgap.addEventListener.mock.calls[0]?.[1] as () => void;
    refreshConsentState();

    expect(setConsentRefreshCounter).toHaveBeenCalledWith(expect.any(Function));
    const refreshUpdater = setConsentRefreshCounter.mock.calls[0]?.[0] as (
      current: number,
    ) => number;
    expect(refreshUpdater(1)).toBe(2);
  });

  test('opt-in handler grants missing purposes', async () => {
    const missingConsentPurposes = new Set<TrackingPurpose>(['Analytics']);
    const setState = vi.fn();
    const airgap = {
      getPurposes: vi.fn(),
      getConsent: vi.fn(() => ({
        purposes: {
          Analytics: false,
          Essential: true,
        },
      })),
      isAllowed: vi.fn(() => Promise.resolve(true)),
      setConsent: vi.fn(() => Promise.resolve(true)),
    };
    let fallbackProps: ConsentBoundaryFallbackProps | undefined;
    const fallback = vi.fn((props: ConsentBoundaryFallbackProps) => {
      fallbackProps = props;
      return 'fallback';
    });
    mocks.useConsentManager.mockReturnValue({ airgap });
    mocks.useState.mockReturnValue([{ missingConsentPurposes, status: 'blocked' }, setState]);
    mocks.useEffect.mockImplementation(() => undefined);

    ConsentBoundary({
      children: 'blocked children',
      fallback,
      urlsRequiredForRender: ['https://example.com/tracker.js'],
    });
    const auth = new Event('click');

    await fallbackProps?.onConsentGiven({
      nativeEvent: auth,
    } as Parameters<ConsentBoundaryFallbackProps['onConsentGiven']>[0]);

    expect(airgap.setConsent).toHaveBeenCalledWith(auth, {
      Analytics: true,
      Essential: true,
    });
    expect(setState).toHaveBeenCalledWith({ status: 'allowed' });
  });
});

describe('getMissingConsentPurposesForUrls', () => {
  test('returns no missing purposes for allowed URLs', async () => {
    const airgap = {
      getPurposes: vi.fn(),
      isAllowed: vi.fn(() => Promise.resolve(true)),
    };

    await expect(
      getMissingConsentPurposesForUrls(airgap as unknown as AirgapAPI, [
        'https://example.com/tracker.js',
      ]),
    ).resolves.toEqual(new Set());
    expect(airgap.getPurposes).not.toHaveBeenCalled();
  });

  test('expands Unknown to unconsented regime purposes', async () => {
    const airgap = {
      getPurposes: vi.fn(() => Promise.resolve(new Set<TrackingPurpose>(['Unknown']))),
      getRegimePurposes: vi.fn(() => new Set<TrackingPurpose>(['Analytics', 'Advertising'])),
      isAllowed: vi.fn(() => Promise.resolve(false)),
      isConsented: vi.fn((purposes: Set<TrackingPurpose>) => purposes.has('Advertising')),
    };

    await expect(
      getMissingConsentPurposesForUrls(airgap as unknown as AirgapAPI, [
        'https://example.com/tracker.js',
      ]),
    ).resolves.toEqual(new Set<TrackingPurpose>(['Analytics']));
  });
});
