import { describe, expect, it } from 'vitest';

import type { DataSiloEnriched } from '../../data-inventory/fetchEnrichedDataSilos.js';
import type { DataSiloInput } from '../codecs.js';
import {
  pullDataSiloInventoryFields,
  pushDataSiloInventoryFields,
} from '../dataSiloInventoryFields.js';

const baseSilo = (): DataSiloEnriched =>
  ({
    vendor: { title: 'Acme Analytics' },
    notes: 'Primary warehouse',
    dsrProcessingDocumentation: 'See runbook',
    contactEmail: 'dpo@example.com',
    isPausedForDsrs: true,
    dataProcessingAgreementStatus: 'ONLINE_DPA',
  }) as DataSiloEnriched;

describe('pullDataSiloInventoryFields', () => {
  it('maps vendor title and omits empty strings', () => {
    expect(pullDataSiloInventoryFields(baseSilo())).toEqual({
      'vendor-title': 'Acme Analytics',
      notes: 'Primary warehouse',
      dsrProcessingDocumentation: 'See runbook',
      contactEmail: 'dpo@example.com',
      isPausedForDsrs: true,
      dataProcessingAgreementStatus: 'ONLINE_DPA',
    });
  });
});

describe('pushDataSiloInventoryFields', () => {
  it('resolves vendor-title to vendorId', () => {
    const input = {
      title: 'Warehouse',
      integrationName: 'server',
      'vendor-title': 'Acme Analytics',
      notes: 'Primary warehouse',
    } as DataSiloInput;

    expect(
      pushDataSiloInventoryFields(input, { 'Acme Analytics': { id: 'vendor-1' } }),
    ).toMatchObject({
      vendorId: 'vendor-1',
      notes: 'Primary warehouse',
    });
  });

  it('flags unknown vendor titles', () => {
    const input = {
      title: 'Warehouse',
      integrationName: 'server',
      'vendor-title': 'Missing Vendor',
    } as DataSiloInput;

    expect(pushDataSiloInventoryFields(input, {})).toMatchObject({
      missingVendorTitle: 'Missing Vendor',
    });
  });
});
