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
  it('maps TWDC CCTV RoPA kebab-case YAML fields to GraphQL camelCase', () => {
    const input: ProcessingActivityInput = {
      title: 'CCTV — Disney Italia Theme Park Entrances',
      description: 'On-premise CCTV surveillance…',
      controllerships: [Controllership.Controller],
      'retention-type': RetentionType.Limited,
      'data-protection-impact-assessment-status': DataProtectionImpactAssessmentStatus.Missing,
      'data-subject-types': ['customer', 'employee'],
      'team-names': ['Security Operations'],
      'processing-sub-purposes': [
        { purpose: ProcessingPurpose.OperationSecurity },
        { purpose: ProcessingPurpose.Essential },
      ],
      'data-sub-categories': [
        { category: DataCategoryType.Other, name: 'Security-Physical' },
        { category: DataCategoryType.Contact, name: 'Image' },
      ],
      'storage-regions': [{ country: IsoCountryCode.IT }],
      'transfer-regions': [{ country: IsoCountryCode.EU }],
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
      'security-measure-details': 'Encrypted at rest',
      'retention-type': RetentionType.StatedPeriod,
      'retention-period': 90,
      'data-protection-impact-assessment-link': 'https://example.com',
      'data-silo-titles': ['Adobe'],
      'owner-emails': ['delilah@acme.com'],
      'saas-categories': ['Artificial Intelligence'],
      'processing-sub-purposes': [{ purpose: ProcessingPurpose.HR, name: 'Recruiting' }],
      'data-sub-categories': [{ category: DataCategoryType.Contact }],
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
  it('soft-warns and drops unresolved team-names', () => {
    const warn = vi.fn();
    const result = filterUnresolvedTeamNames(
      [
        {
          title: 'CCTV',
          'team-names': ['Security Operations', 'Missing Team'],
        },
      ],
      new Set(['Security Operations']),
      { warn, info: vi.fn(), error: vi.fn(), debug: vi.fn() },
    );

    expect(result[0]?.['team-names']).toEqual(['Security Operations']);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('unresolved team-names skipped: "Missing Team"'),
    );
  });

  it('clears team-names when none resolve', () => {
    const warn = vi.fn();
    const result = filterUnresolvedTeamNames(
      [{ title: 'CCTV', 'team-names': ['Ghost Team'] }],
      new Set(),
      { warn, info: vi.fn(), error: vi.fn(), debug: vi.fn() },
    );

    expect(result[0]?.['team-names']).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });
});
