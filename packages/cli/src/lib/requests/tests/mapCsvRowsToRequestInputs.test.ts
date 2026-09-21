import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PersistedState } from '@transcend-io/persisted-state';
import { RequestAction } from '@transcend-io/privacy-types';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CachedFileState, ColumnName, NONE } from '../constants.js';
import { mapCsvRowsToRequestInputs } from '../mapCsvRowsToRequestInputs.js';

describe('mapCsvRowsToRequestInputs workflowConfigId', () => {
  let cacheDir: string;
  let state: PersistedState<typeof CachedFileState>;

  beforeEach(() => {
    cacheDir = mkdtempSync(join(tmpdir(), 'map-csv-rows-'));
    state = new PersistedState(join(cacheDir, 'cache.json'), CachedFileState, {
      columnNames: {
        [ColumnName.Email]: 'email',
        [ColumnName.CoreIdentifier]: 'coreIdentifier',
        [ColumnName.RequestType]: 'requestType',
        [ColumnName.SubjectType]: 'subjectType',
        [ColumnName.Locale]: NONE,
        [ColumnName.Country]: NONE,
        [ColumnName.CountrySubDivision]: NONE,
        [ColumnName.RequestStatus]: NONE,
        [ColumnName.CreatedAt]: NONE,
        [ColumnName.DataSiloIds]: NONE,
        [ColumnName.WorkflowConfigId]: 'workflowConfigId',
      },
      requestTypeToRequestAction: {
        ACCESS: RequestAction.Access,
      },
      subjectTypeToSubjectName: {
        customer: 'customer',
      },
      languageToLocale: {},
      statusToRequestStatus: {},
      identifierNames: {},
      attributeNames: {},
      regionToCountrySubDivision: {},
      regionToCountry: {},
    });
  });

  afterEach(() => {
    rmSync(cacheDir, { recursive: true, force: true });
  });

  const mapOptions = {
    columnNameMap: {},
    identifierNameMap: {},
    attributeNameMap: {},
    requestAttributeKeys: [],
  };

  it('includes workflowConfigId when the mapped cell is non-empty', () => {
    const workflowConfigId = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
    const [, privacyRequestInput] = mapCsvRowsToRequestInputs(
      [
        {
          email: 'user@example.com',
          coreIdentifier: 'id-123',
          requestType: 'ACCESS',
          subjectType: 'customer',
          workflowConfigId,
        },
      ],
      state,
      mapOptions,
    )[0]!;

    expect(privacyRequestInput.workflowConfigId).to.equal(workflowConfigId);
  });

  it('omits workflowConfigId when the mapped cell is empty', () => {
    const [, privacyRequestInput] = mapCsvRowsToRequestInputs(
      [
        {
          email: 'user@example.com',
          coreIdentifier: 'id-123',
          requestType: 'ACCESS',
          subjectType: 'customer',
          workflowConfigId: '',
        },
      ],
      state,
      mapOptions,
    )[0]!;

    expect(privacyRequestInput.workflowConfigId).to.equal(undefined);
  });

  it('omits workflowConfigId when the column is mapped to NONE', async () => {
    await state.setValue(NONE, 'columnNames', ColumnName.WorkflowConfigId);

    const [, privacyRequestInput] = mapCsvRowsToRequestInputs(
      [
        {
          email: 'user@example.com',
          coreIdentifier: 'id-123',
          requestType: 'ACCESS',
          subjectType: 'customer',
          workflowConfigId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        },
      ],
      state,
      mapOptions,
    )[0]!;

    expect(privacyRequestInput.workflowConfigId).to.equal(undefined);
  });
});
