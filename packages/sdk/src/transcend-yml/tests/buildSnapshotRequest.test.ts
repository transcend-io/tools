import { ActionItemCode } from '@transcend-io/privacy-types';
import { describe, expect, it } from 'vitest';

import { buildSnapshotRequest, TranscendPullResource } from '../index.js';

describe('buildSnapshotRequest', () => {
  it('pulls only the resources the file defines', () => {
    const request = buildSnapshotRequest({ vendors: [{ title: 'A' }], teams: [] });
    expect(request.resources.sort()).toEqual(
      [TranscendPullResource.Teams, TranscendPullResource.Vendors].sort(),
    );
  });

  it('maps legacy enrichers to the enrichers resource and skips pull-only keys', () => {
    const request = buildSnapshotRequest({
      enrichers: [{ title: 'E', 'output-identifiers': [] }],
      assessments: [],
      'api-keys': [{ title: 'k' }],
    });
    expect(request.resources).toContain(TranscendPullResource.Enrichers);
    expect(request.resources).not.toContain(TranscendPullResource.Assessments);
    expect(request.resources).not.toContain(TranscendPullResource.ApiKeys);
  });

  it('adds identifiers and data subjects when the file references them', () => {
    const request = buildSnapshotRequest({
      'data-silos': [{ title: 'S', integrationName: 'server', 'identity-keys': ['email'] }],
    });
    expect(request.resources).toEqual(
      expect.arrayContaining([
        TranscendPullResource.DataSilos,
        TranscendPullResource.Identifiers,
        TranscendPullResource.DataSubjects,
      ]),
    );
  });

  it('limits data silos to the titles in the file', () => {
    const request = buildSnapshotRequest({
      'data-silos': [
        { title: 'A', integrationName: 'server' },
        { title: 'B', integrationName: 'server' },
      ],
    });
    expect(request.dataSiloTitles).toEqual(['A', 'B']);
  });

  it('skips datapoints and fields unless the file defines them', () => {
    const none = buildSnapshotRequest({
      'data-silos': [{ title: 'A', integrationName: 'server' }],
    });
    expect(none).toMatchObject({ skipDatapoints: true, skipSubDatapoints: true });

    const datapoints = buildSnapshotRequest({
      'data-silos': [{ title: 'A', integrationName: 'server', datapoints: [{ key: 'users' }] }],
    });
    expect(datapoints).toMatchObject({ skipDatapoints: false, skipSubDatapoints: true });

    const fields = buildSnapshotRequest({
      'data-silos': [
        {
          title: 'A',
          integrationName: 'server',
          datapoints: [{ key: 'users', fields: [{ key: 'email' }] }],
        },
      ],
    });
    expect(fields).toMatchObject({ skipDatapoints: false, skipSubDatapoints: false });
  });

  it('pulls every action item type, because push matches all of them', () => {
    const request = buildSnapshotRequest({ 'action-items': [] });
    expect(request.actionItemTypes).toEqual(Object.values(ActionItemCode));
    expect(buildSnapshotRequest({ vendors: [] }).actionItemTypes).toBeUndefined();
  });
});
