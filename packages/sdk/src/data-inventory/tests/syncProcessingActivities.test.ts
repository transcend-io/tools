import {
  Controllership,
  DataCategoryType,
  DataProtectionImpactAssessmentStatus,
  ProcessingPurpose,
  RetentionType,
  IsoCountryCode,
} from '@transcend-io/privacy-types';
import { describe, expect, it, vi } from 'vitest';

import {
  filterUnresolvedTeamNames,
  toProcessingActivityUpdateInput,
  type ProcessingActivityInput,
} from '../syncProcessingActivities.js';

describe('toProcessingActivityUpdateInput', () => {
  it('maps TWDC CCTV RoPA fields to GraphQL update input', () => {
    const input: ProcessingActivityInput = {
      title: 'CCTV — Disney Italia Theme Park Entrances',
      description: 'On-premise CCTV surveillance…',
      controllerships: [Controllership.Controller],
      retentionType: RetentionType.Limited,
      dataProtectionImpactAssessmentStatus: DataProtectionImpactAssessmentStatus.Missing,
      dataSubjectTypes: ['customer', 'employee'],
      teamNames: ['Security Operations'],
      processingSubPurposes: [
        { purpose: ProcessingPurpose.OperationSecurity },
        { purpose: ProcessingPurpose.Essential },
      ],
      dataSubCategories: [
        { category: DataCategoryType.Other, name: 'Security-Physical' },
        { category: DataCategoryType.Contact, name: 'Image' },
      ],
      storageRegions: [{ country: IsoCountryCode.IT }],
      transferRegions: [{ country: IsoCountryCode.EU }],
    };

    expect(toProcessingActivityUpdateInput(input, 'pa-id-1')).toEqual({
      id: 'pa-id-1',
      title: 'CCTV — Disney Italia Theme Park Entrances',
      description: 'On-premise CCTV surveillance…',
      controllerships: [Controllership.Controller],
      retentionType: RetentionType.Limited,
      dataProtectionImpactAssessmentStatus: DataProtectionImpactAssessmentStatus.Missing,
      dataSubjectTypes: ['customer', 'employee'],
      teamNames: ['Security Operations'],
      processingPurposeSubCategoryInputs: [
        { purpose: ProcessingPurpose.OperationSecurity, name: 'Other' },
        { purpose: ProcessingPurpose.Essential, name: 'Other' },
      ],
      dataSubCategoryInputs: [
        { category: DataCategoryType.Other, name: 'Security-Physical' },
        { category: DataCategoryType.Contact, name: 'Image' },
      ],
      storageRegions: [{ country: IsoCountryCode.IT }],
      transferRegions: [{ country: IsoCountryCode.EU }],
    });
  });

  it('maps optional fields and defaults sub-purpose name to Other', () => {
    const input: ProcessingActivityInput = {
      title: 'Recruiting',
      securityMeasureDetails: 'Encrypted at rest',
      retentionType: RetentionType.StatedPeriod,
      retentionPeriod: 90,
      dataProtectionImpactAssessmentLink: 'https://example.com',
      dataSiloTitles: ['Adobe'],
      ownerEmails: ['delilah@acme.com'],
      saaSCategories: ['Artificial Intelligence'],
      processingSubPurposes: [{ purpose: ProcessingPurpose.HR, name: 'Recruiting' }],
      dataSubCategories: [{ category: DataCategoryType.Contact }],
      attributes: [{ key: 'Source of Data', values: ['Online Tracking Technologies'] }],
    };

    expect(toProcessingActivityUpdateInput(input, 'pa-id-2')).toEqual({
      id: 'pa-id-2',
      title: 'Recruiting',
      securityMeasureDetails: 'Encrypted at rest',
      retentionType: RetentionType.StatedPeriod,
      retentionPeriod: 90,
      dataProtectionImpactAssessmentLink: 'https://example.com',
      dataSiloTitles: ['Adobe'],
      ownerEmails: ['delilah@acme.com'],
      saaSCategoryTitles: ['Artificial Intelligence'],
      processingPurposeSubCategoryInputs: [{ purpose: ProcessingPurpose.HR, name: 'Recruiting' }],
      dataSubCategoryInputs: [{ category: DataCategoryType.Contact, name: '' }],
      attributes: [{ key: 'Source of Data', values: ['Online Tracking Technologies'] }],
    });
  });
});

describe('filterUnresolvedTeamNames', () => {
  it('soft-warns and drops unresolved teamNames', () => {
    const warn = vi.fn();
    const result = filterUnresolvedTeamNames(
      [
        {
          title: 'CCTV',
          teamNames: ['Security Operations', 'Missing Team'],
        },
      ],
      new Set(['Security Operations']),
      { warn, info: vi.fn(), error: vi.fn(), debug: vi.fn() },
    );

    expect(result[0]?.teamNames).toEqual(['Security Operations']);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('unresolved teamNames skipped: "Missing Team"'),
    );
  });

  it('clears teamNames when none resolve', () => {
    const warn = vi.fn();
    const result = filterUnresolvedTeamNames(
      [{ title: 'CCTV', teamNames: ['Ghost Team'] }],
      new Set(),
      { warn, info: vi.fn(), error: vi.fn(), debug: vi.fn() },
    );

    expect(result[0]?.teamNames).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });
});
