import { ScopeName } from '@transcend-io/privacy-types';
import { describe, expect, it } from 'vitest';

import { TR_PUSH_RESOURCE_SCOPE_MAP } from '../constants.js';
import { TranscendPullResource } from '../enums.js';

/** Sections whose push path calls ensureAllDataSubjectsExist (excluding data-subjects itself) */
const SECTIONS_WITH_DATA_SUBJECT_LOOKUP = [
  TranscendPullResource.DataSilos,
  TranscendPullResource.Enrichers,
  TranscendPullResource.ProcessingActivities,
] as const;

describe('TR_PUSH_RESOURCE_SCOPE_MAP data subject lookups', () => {
  it.each(SECTIONS_WITH_DATA_SUBJECT_LOOKUP)(
    '%s push scopes include ViewDataSubjectRequestSettings',
    (resource) => {
      expect(TR_PUSH_RESOURCE_SCOPE_MAP[resource]).toContain(
        ScopeName.ViewDataSubjectRequestSettings,
      );
    },
  );
});
