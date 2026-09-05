import { ConsentTrackerStatus, DataFlowScope } from '@transcend-io/privacy-types';
import { describe, expect, it } from 'vitest';

import type { CookieCsvInput, DataFlowCsvInput } from '../../../codecs.js';
import {
  mapCookieCsvRowsToInputs,
  mapDataFlowCsvRowsToInputs,
} from '../mapConsentCsvRowsToInputs.js';

describe('mapConsentCsvRowsToInputs', () => {
  it('maps cookie fields and excludes native export columns from attributes', () => {
    const row = {
      Name: 'session',
      Purpose: 'Analytics, Advertising',
      'Is Regex?': 'TRUE',
      Notes: 'Session cookie',
      Owners: 'owner@example.com, second@example.com',
      Teams: 'Privacy',
      Service: 'Checkout',
      ID: 'cookie-id',
      'Custom Classification': 'First Party, Essential',
    } satisfies CookieCsvInput;

    expect(mapCookieCsvRowsToInputs([row], ConsentTrackerStatus.Live)).toEqual([
      {
        name: 'session',
        isRegex: true,
        description: 'Session cookie',
        trackingPurposes: ['Analytics', 'Advertising'],
        status: ConsentTrackerStatus.Live,
        owners: ['owner@example.com', 'second@example.com'],
        teams: ['Privacy'],
        attributes: [
          {
            key: 'Custom Classification',
            values: ['First Party', 'Essential'],
          },
        ],
      },
    ]);
  });

  it('preserves a row status instead of applying the default', () => {
    const row = {
      Name: 'preferences',
      Purpose: 'Functional',
      Status: ConsentTrackerStatus.NeedsReview,
    } satisfies CookieCsvInput;

    expect(mapCookieCsvRowsToInputs([row], ConsentTrackerStatus.Live)[0]?.status).toBe(
      ConsentTrackerStatus.NeedsReview,
    );
  });

  it('maps data flow fields and custom attributes', () => {
    const row = {
      'Connections Made To': 'api.example.com',
      Type: DataFlowScope.Host,
      Purpose: 'Analytics',
      Notes: 'API traffic',
      Owners: 'owner@example.com',
      Teams: 'Engineering, Privacy',
      Service: 'Example API',
      'Data Residency': 'US, EU',
    } satisfies DataFlowCsvInput;

    expect(mapDataFlowCsvRowsToInputs([row], ConsentTrackerStatus.Live)).toEqual([
      {
        value: 'api.example.com',
        type: DataFlowScope.Host,
        description: 'API traffic',
        trackingPurposes: ['Analytics'],
        status: ConsentTrackerStatus.Live,
        owners: ['owner@example.com'],
        teams: ['Engineering', 'Privacy'],
        attributes: [
          {
            key: 'Data Residency',
            values: ['US', 'EU'],
          },
        ],
      },
    ]);
  });
});
