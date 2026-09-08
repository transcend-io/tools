import type { AuthCredentials } from '@transcend-io/mcp-server-base';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AssessmentsMixin } from '../src/graphql.js';

function createMockFetchResponse<T>(data: T) {
  return vi.fn().mockImplementation(async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => '',
    json: async () => ({ data }),
  }));
}

describe('AssessmentsMixin (normalizeQuestion / generateUUID)', () => {
  const API_KEY_AUTH: AuthCredentials = { type: 'apiKey', apiKey: 'test-api-key-12345' };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('generates UUID for question with missing referenceId', async () => {
    const mockFetch = createMockFetchResponse({
      createAssessmentFormTemplate: {
        assessmentFormTemplate: {
          id: 'tpl-1',
          title: 'Template',
          status: 'DRAFT',
          sections: [],
        },
      },
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new AssessmentsMixin(API_KEY_AUTH);
    await client.createAssessmentFormTemplate({
      title: 'Test Template',
      sections: [
        {
          title: 'Section 1',
          questions: [
            {
              title: 'Question without referenceId',
              type: 'SHORT_ANSWER_TEXT',
            },
          ],
        },
      ],
    });

    const callBody = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    const questions = callBody.variables.input.sections[0].questions;
    expect(questions).toHaveLength(1);
    expect(questions[0].referenceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('sets subType to CUSTOM when allowSelectOther is true', async () => {
    const mockFetch = createMockFetchResponse({
      createAssessmentFormTemplate: {
        assessmentFormTemplate: {
          id: 'tpl-1',
          title: 'Template',
          status: 'DRAFT',
          sections: [],
        },
      },
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new AssessmentsMixin(API_KEY_AUTH);
    await client.createAssessmentFormTemplate({
      title: 'Test Template',
      sections: [
        {
          title: 'Section 1',
          questions: [
            {
              title: 'Select question',
              type: 'SINGLE_SELECT',
              subType: 'NONE',
              allowSelectOther: true,
              referenceId: 'e7cfe5ad-3568-4c74-af3d-fd6afce5740a',
            },
          ],
        },
      ],
    });

    const callBody = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    const questions = callBody.variables.input.sections[0].questions;
    expect(questions[0].subType).toBe('CUSTOM');
    expect(questions[0].allowSelectOther).toBe(true);
  });

  it('strips requireRiskEvaluation when riskFrameworkId is missing', async () => {
    const mockFetch = createMockFetchResponse({
      createAssessmentFormTemplate: {
        assessmentFormTemplate: {
          id: 'tpl-1',
          title: 'Template',
          status: 'DRAFT',
          sections: [],
        },
      },
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new AssessmentsMixin(API_KEY_AUTH);
    await client.createAssessmentFormTemplate({
      title: 'Test Template',
      sections: [
        {
          title: 'Section 1',
          questions: [
            {
              title: 'Risk question',
              type: 'SINGLE_SELECT',
              referenceId: 'e7cfe5ad-3568-4c74-af3d-fd6afce5740a',
              requireRiskEvaluation: true,
            },
          ],
        },
      ],
    });

    const callBody = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    const questions = callBody.variables.input.sections[0].questions;
    expect(questions[0].requireRiskEvaluation).toBe(false);
  });
});

describe('AssessmentsMixin (listAssessmentTemplates)', () => {
  const API_KEY_AUTH: AuthCredentials = { type: 'apiKey', apiKey: 'test-api-key-12345' };

  const template = {
    id: 'tpl-1',
    title: 'Vendor Onboarding',
    description: 'Questions for a new vendor',
    status: 'PUBLISHED',
    source: 'IMPORT',
    isArchived: false,
    createdAt: '2024-03-01T00:00:00.000Z',
    updatedAt: '2024-04-01T00:00:00.000Z',
    creator: { id: 'usr-1', name: 'Daniel Sklyar', email: 'daniel@transcend.io' },
    lastEditor: { id: 'usr-2', name: 'Ada Lovelace', email: 'ada@transcend.io' },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends the source and people filters to the API under its own names', async () => {
    const mockFetch = createMockFetchResponse({
      assessmentFormTemplates: { nodes: [], totalCount: 0 },
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new AssessmentsMixin(API_KEY_AUTH);
    await client.listAssessmentTemplates({
      filterBy: {
        sources: ['IMPORT'],
        creatorIds: ['usr-1'],
        lastEditorIds: ['usr-2'],
      },
    });

    const { variables } = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body) as {
      variables: Record<string, unknown>;
    };
    expect(variables.filterBy).toEqual({
      sources: ['IMPORT'],
      creatorIds: ['usr-1'],
      lastEditorIds: ['usr-2'],
    });
    expect(variables.includeDetails).toBe(false);
  });

  it('carries source on every row but the people only when asked', async () => {
    vi.stubGlobal(
      'fetch',
      createMockFetchResponse({
        assessmentFormTemplates: { nodes: [template], totalCount: 1 },
      }),
    );

    const client = new AssessmentsMixin(API_KEY_AUTH);
    const compact = await client.listAssessmentTemplates();

    // The server answers the @include directive, so a compact row could still
    // arrive carrying people; the mapper is what keeps them off it.
    expect(compact.nodes[0]).toMatchObject({ source: 'IMPORT' });
    expect(compact.nodes[0].creator).toBeUndefined();
    expect(compact.nodes[0].lastEditor).toBeUndefined();
  });

  it('names the creator and last editor when details are requested', async () => {
    vi.stubGlobal(
      'fetch',
      createMockFetchResponse({
        assessmentFormTemplates: { nodes: [template], totalCount: 1 },
      }),
    );

    const client = new AssessmentsMixin(API_KEY_AUTH);
    const detailed = await client.listAssessmentTemplates({ includeDetails: true });

    expect(detailed.nodes[0]).toMatchObject({
      creator: { id: 'usr-1', name: 'Daniel Sklyar', email: 'daniel@transcend.io' },
      lastEditor: { id: 'usr-2', name: 'Ada Lovelace', email: 'ada@transcend.io' },
    });
  });

  it('leaves the people undefined when the template has no creator on record', async () => {
    vi.stubGlobal(
      'fetch',
      createMockFetchResponse({
        assessmentFormTemplates: {
          nodes: [{ ...template, creator: null, lastEditor: null }],
          totalCount: 1,
        },
      }),
    );

    const client = new AssessmentsMixin(API_KEY_AUTH);
    const detailed = await client.listAssessmentTemplates({ includeDetails: true });

    expect(detailed.nodes[0].creator).toBeUndefined();
    expect(detailed.nodes[0].lastEditor).toBeUndefined();
  });
});
