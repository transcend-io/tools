import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getAssessmentTools } from '../src/tools.js';

describe('Assessment Tools', () => {
  let mockGraphql: {
    listAssessments: ReturnType<typeof vi.fn>;
    listAssessmentGroups: ReturnType<typeof vi.fn>;
    listAssessmentTemplates: ReturnType<typeof vi.fn>;
    createAssessment: ReturnType<typeof vi.fn>;
    getAssessment: ReturnType<typeof vi.fn>;
    createAssessmentFormTemplate: ReturnType<typeof vi.fn>;
    selectAssessmentQuestionAnswers: ReturnType<typeof vi.fn>;
    updateAssessmentFormAssignees: ReturnType<typeof vi.fn>;
    updateAssessment: ReturnType<typeof vi.fn>;
    submitAssessmentForReview: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockGraphql = {
      listAssessments: vi.fn(),
      listAssessmentGroups: vi.fn(),
      listAssessmentTemplates: vi.fn(),
      createAssessment: vi.fn(),
      getAssessment: vi.fn(),
      createAssessmentFormTemplate: vi.fn(),
      selectAssessmentQuestionAnswers: vi.fn(),
      updateAssessmentFormAssignees: vi.fn(),
      updateAssessment: vi.fn(),
      submitAssessmentForReview: vi.fn(),
    };
  });

  const getTools = (dashboardUrl = 'https://app.transcend.io') =>
    getAssessmentTools({
      rest: {} as never,
      graphql: mockGraphql as never,
      dashboardUrl,
    });

  describe('assessments_list', () => {
    const listTool = () => getTools().find((t) => t.name === 'assessments_list')!;

    /** Parse through the schema so defaults land the way the server applies them. */
    const call = async (input: Record<string, unknown>) => {
      const tool = listTool();
      const parsed = tool.zodSchema.parse(input);
      return tool.handler(parsed as never);
    };

    const resolveList = (nodes: unknown[], totalCount = nodes.length, offset = 0) => {
      mockGraphql.listAssessments.mockResolvedValue({
        nodes,
        totalCount,
        pageInfo: {
          hasNextPage: offset + nodes.length < totalCount,
          hasPreviousPage: offset > 0,
        },
      });
    };

    const NODES = [
      { id: 'a1', title: 'Assessment 1', status: 'DRAFT' },
      { id: 'a2', title: 'Assessment 2', status: 'IN_PROGRESS' },
    ];

    it('rejects a status value outside the AssessmentFormStatus enum', () => {
      const result = listTool().zodSchema.safeParse({ statuses: ['INVALID_STATUS'] });
      expect(result.success).toBe(false);
      expect((result as any).error.issues[0].path).toEqual(['statuses', 0]);
    });

    it('no longer declares the singular status argument', () => {
      // Replaced by `statuses`. The server refuses unknown arguments (see
      // strict-arguments in mcp-server-base), so dropping it from the shape is
      // what turns the old name into an error rather than a silent no-op.
      const { shape } = listTool().zodSchema as unknown as { shape: Record<string, unknown> };
      expect(shape).not.toHaveProperty('status');
      expect(shape).toHaveProperty('statuses');
    });

    it('returns assessments with dashboard links on success', async () => {
      resolveList(NODES);

      const result = await call({ statuses: ['DRAFT'], limit: 25 });

      expect(result).toMatchObject({
        success: true,
        count: 2,
        totalCount: 2,
        hasNextPage: false,
      });
      expect((result as any).data[0]).toMatchObject({
        id: 'a1',
        url: expect.stringContaining('a1'),
      });
      expect(mockGraphql.listAssessments).toHaveBeenCalledWith(
        expect.objectContaining({
          first: 25,
          offset: 0,
          includeDetails: false,
          filterBy: { statuses: ['DRAFT'] },
        }),
      );
    });

    it('forwards every filter to the API rather than filtering client-side', async () => {
      resolveList(NODES);
      mockGraphql.listAssessmentGroups.mockResolvedValue({
        nodes: [{ id: 'g1' }, { id: 'g2' }],
        totalCount: 2,
      });

      await call({
        statuses: ['IN_REVIEW'],
        text: 'rideshare',
        ids: ['a1'],
        assigneeIds: ['u1'],
        reviewerIds: ['u2'],
        externalAssigneeEmails: ['vendor@example.com'],
        templateIds: ['t1'],
        assessmentGroupIds: ['g1'],
        createdAfter: '2026-01-01',
        createdBefore: '2026-04-01',
        dueAfter: '2026-02-01',
        dueBefore: '2026-03-01',
      });

      expect(mockGraphql.listAssessments).toHaveBeenCalledWith(
        expect.objectContaining({
          filterBy: {
            statuses: ['IN_REVIEW'],
            text: 'rideshare',
            ids: ['a1'],
            assigneeIds: ['u1'],
            reviewerIds: ['u2'],
            externalAssigneeEmails: ['vendor@example.com'],
            assessmentGroupIds: ['g1'],
            createdAtAfter: '2026-01-01',
            createdAtBefore: '2026-04-01',
            dueDateAfter: '2026-02-01',
            dueDateBefore: '2026-03-01',
          },
        }),
      );
    });

    it('rejects a date that is not ISO 8601 and names the field', () => {
      const result = listTool().zodSchema.safeParse({ dueBefore: 'last friday' });
      expect(result.success).toBe(false);
      expect((result as any).error.issues[0].message).toContain('dueBefore');
      expect((result as any).error.issues[0].message).toContain('2026-01-31');
    });

    it('accepts a full timestamp as well as a bare date', () => {
      expect(listTool().zodSchema.safeParse({ createdAfter: '2026-01-31T09:30:00Z' }).success).toBe(
        true,
      );
    });

    it('maps caller sort names onto the GraphQL order field', async () => {
      resolveList(NODES);

      await call({ sortBy: 'status', sortDirection: 'DESC' });

      expect(mockGraphql.listAssessments).toHaveBeenCalledWith(
        expect.objectContaining({ sortField: 'statusRank', sortDirection: 'DESC' }),
      );
    });

    it('omits sorting entirely when sortBy is not given', async () => {
      resolveList(NODES);

      await call({});

      const [args] = mockGraphql.listAssessments.mock.calls[0];
      expect(args).not.toHaveProperty('sortField');
    });

    it('rejects an unknown sortBy and lists the valid columns', () => {
      const result = listTool().zodSchema.safeParse({ sortBy: 'dueDate' });
      expect(result.success).toBe(false);
      expect((result as any).error.issues[0].message).toContain('title, status, submittedAt');
    });

    it('gates the expensive detail fields behind includeDetails', async () => {
      resolveList(NODES);

      await call({ includeDetails: true });

      expect(mockGraphql.listAssessments).toHaveBeenCalledWith(
        expect.objectContaining({ includeDetails: true }),
      );
    });

    it('pages with offset and reports that more remain', async () => {
      resolveList(NODES, 120, 50);

      const result = await call({ limit: 50, offset: 50 });

      expect(mockGraphql.listAssessments).toHaveBeenCalledWith(
        expect.objectContaining({ first: 50, offset: 50 }),
      );
      expect(result).toMatchObject({ hasNextPage: true, totalCount: 120 });
      expect((result as any).paginationNote).toContain('offset 100');
    });

    it('says so plainly on the last page', async () => {
      resolveList(NODES, 52, 50);

      const result = await call({ limit: 50, offset: 50 });

      expect((result as any).paginationNote).toContain('No further pages');
      expect((result as any).paginationNote).toContain('the last');
    });

    it('does not call a single page of results "the last" one', async () => {
      resolveList(NODES.slice(0, 2), 2, 0);

      const result = await call({ limit: 50, offset: 0 });

      // "the last 2 of 2" implies a page came before this one.
      expect((result as any).paginationNote).toBe('Showing all 2 matches. No further pages.');
    });

    it('does not say "1 matches"', async () => {
      resolveList(NODES.slice(0, 1), 1, 0);

      const result = await call({ limit: 50, offset: 0 });

      expect((result as any).paginationNote).toBe('Showing all 1 match. No further pages.');
    });

    it('distinguishes no matches from a broken query and names the filters', async () => {
      resolveList([], 0);

      const result = await call({ statuses: ['APPROVED'], text: 'nope' });

      expect(result).toMatchObject({ success: true, count: 0 });
      const note = (result as any).paginationNote;
      expect(note).toContain('statuses');
      expect(note).toContain('text');
      expect(note).toContain('query succeeded');
    });

    it('reports an empty organization differently from an over-filtered one', async () => {
      resolveList([], 0);

      const result = await call({});

      expect((result as any).paginationNote).toContain('no assessments');
    });

    it('reaches assessments by template through their groups', async () => {
      // assessmentForms accepts templateIds and then rejects it with
      // "assessmentFormTemplate is not associated to assessmentForm", so the
      // ids have to be resolved into groups before the forms are queried.
      resolveList(NODES);
      mockGraphql.listAssessmentGroups.mockResolvedValue({
        nodes: [{ id: 'g-a' }, { id: 'g-b' }],
        totalCount: 2,
      });

      await call({ templateIds: ['tpl-1'] });

      expect(mockGraphql.listAssessmentGroups).toHaveBeenCalledWith(
        expect.objectContaining({ filterBy: { templateIds: ['tpl-1'] } }),
      );
      expect(mockGraphql.listAssessments).toHaveBeenCalledWith(
        expect.objectContaining({ filterBy: { assessmentGroupIds: ['g-a', 'g-b'] } }),
      );
    });

    it('reads every group of a template, not just the first page', async () => {
      resolveList(NODES);
      mockGraphql.listAssessmentGroups
        .mockResolvedValueOnce({
          nodes: Array.from({ length: 100 }, (_, i) => ({ id: `g-${i}` })),
          totalCount: 102,
        })
        .mockResolvedValueOnce({ nodes: [{ id: 'g-100' }, { id: 'g-101' }], totalCount: 102 });

      await call({ templateIds: ['tpl-1'] });

      // Stopping at one page would silently drop the assessments in the groups
      // that did not fit.
      expect(mockGraphql.listAssessmentGroups).toHaveBeenCalledTimes(2);
      const { filterBy } = mockGraphql.listAssessments.mock.calls[0][0];
      expect(filterBy.assessmentGroupIds).toHaveLength(102);
    });

    it('intersects templateIds with an explicit group filter', async () => {
      resolveList(NODES);
      mockGraphql.listAssessmentGroups.mockResolvedValue({
        nodes: [{ id: 'g-a' }, { id: 'g-b' }],
        totalCount: 2,
      });

      await call({ templateIds: ['tpl-1'], assessmentGroupIds: ['g-b', 'g-z'] });

      expect(mockGraphql.listAssessments).toHaveBeenCalledWith(
        expect.objectContaining({ filterBy: { assessmentGroupIds: ['g-b'] } }),
      );
    });

    it('reports no matches when no group was built from the template', async () => {
      mockGraphql.listAssessmentGroups.mockResolvedValue({ nodes: [], totalCount: 0 });

      const result = await call({ templateIds: ['tpl-unused'] });

      // An empty assessmentGroupIds would have been dropped as "no filter" and
      // returned every assessment in the organization.
      expect(mockGraphql.listAssessments).not.toHaveBeenCalled();
      expect(result).toMatchObject({ success: true, count: 0, totalCount: 0 });
      expect((result as any).paginationNote).toContain('templateIds');
    });

    it('names filters as the caller passed them, not as the API spells them', async () => {
      resolveList([], 0);

      const result = await call({ dueAfter: '2026-02-01', createdBefore: '2026-04-01' });

      // dueDateAfter is the API's name; an agent told that would go looking for
      // an argument this tool does not have.
      const note = (result as any).paginationNote;
      expect(note).toContain('dueAfter');
      expect(note).toContain('createdBefore');
      expect(note).not.toContain('dueDateAfter');
      expect(note).not.toContain('createdAtBefore');
    });

    it('rejects an offset past the end instead of implying nothing matched', async () => {
      resolveList([], 12, 500);

      await expect(call({ offset: 500 })).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('past the end'),
        details: { offset: 500, totalCount: 12 },
      });
    });

    it('allows offset 0 against an empty result set', async () => {
      resolveList([], 0);

      await expect(call({ offset: 0 })).resolves.toMatchObject({ count: 0 });
    });

    it('throws when client throws', async () => {
      mockGraphql.listAssessments.mockRejectedValue(new Error('API unavailable'));

      await expect(call({ limit: 50 })).rejects.toThrow('API unavailable');
    });
  });

  describe('assessments_list_templates', () => {
    const templatesTool = () => getTools().find((t) => t.name === 'assessments_list_templates')!;

    it('narrows by title instead of scanning pages', async () => {
      mockGraphql.listAssessmentTemplates.mockResolvedValue({
        nodes: [{ id: 'tpl-7', title: 'Vendor Onboarding' }],
        totalCount: 1,
        pageInfo: { hasNextPage: false },
      });

      const tool = templatesTool();
      await tool.handler(
        tool.zodSchema.parse({ text: 'Vendor Onboarding', statuses: ['PUBLISHED'] }) as never,
      );

      expect(mockGraphql.listAssessmentTemplates).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 0,
          filterBy: { text: 'Vendor Onboarding', statuses: ['PUBLISHED'] },
        }),
      );
    });

    it('pages with offset', async () => {
      mockGraphql.listAssessmentTemplates.mockResolvedValue({
        nodes: [{ id: 'tpl-9', title: 'Template 9' }],
        totalCount: 200,
        pageInfo: { hasNextPage: true },
      });

      const tool = templatesTool();
      const result = (await tool.handler(
        tool.zodSchema.parse({ limit: 50, offset: 100 }) as never,
      )) as { hasNextPage: boolean; totalCount: number };

      expect(mockGraphql.listAssessmentTemplates).toHaveBeenCalledWith(
        expect.objectContaining({ first: 50, offset: 100 }),
      );
      expect(result).toMatchObject({ hasNextPage: true, totalCount: 200 });
    });

    it('rejects a status outside DRAFT and PUBLISHED', () => {
      const result = templatesTool().zodSchema.safeParse({ statuses: ['ARCHIVED'] });
      expect(result.success).toBe(false);
    });

    it('passes template metadata through without inventing values', async () => {
      // This mapper used to stamp every row with version 1.0.0, isActive true
      // and createdAt = now, which reported every template as created today.
      mockGraphql.listAssessmentTemplates.mockResolvedValue({
        nodes: [
          {
            id: 'tpl-7',
            title: 'Vendor Onboarding',
            status: 'PUBLISHED',
            isArchived: false,
            createdAt: '2024-03-01T00:00:00.000Z',
          },
        ],
        totalCount: 1,
        pageInfo: { hasNextPage: false },
      });

      const tool = templatesTool();
      const result = (await tool.handler(tool.zodSchema.parse({}) as never)) as {
        data: Array<Record<string, unknown>>;
      };

      expect(result.data[0]).toMatchObject({
        status: 'PUBLISHED',
        createdAt: '2024-03-01T00:00:00.000Z',
      });
      expect(result.data[0]).not.toHaveProperty('version');
      expect(result.data[0]).not.toHaveProperty('isActive');
    });

    it('forwards how a template was made and who made it', async () => {
      mockGraphql.listAssessmentTemplates.mockResolvedValue({
        nodes: [],
        totalCount: 0,
        pageInfo: { hasNextPage: false },
      });

      const tool = templatesTool();
      await tool.handler(
        tool.zodSchema.parse({
          sources: ['IMPORT', 'DATA_INVENTORY'],
          creatorIds: ['usr-1'],
          lastEditorIds: ['usr-2'],
        }) as never,
      );

      expect(mockGraphql.listAssessmentTemplates).toHaveBeenCalledWith(
        expect.objectContaining({
          filterBy: {
            sources: ['IMPORT', 'DATA_INVENTORY'],
            creatorIds: ['usr-1'],
            lastEditorIds: ['usr-2'],
          },
        }),
      );
    });

    it('rejects a source the dashboard does not offer', () => {
      const result = templatesTool().zodSchema.safeParse({ sources: ['ONETRUST'] });
      expect(result.success).toBe(false);
    });

    it('says a filter matched nothing rather than returning a bare empty page', async () => {
      mockGraphql.listAssessmentTemplates.mockResolvedValue({
        nodes: [],
        totalCount: 0,
        pageInfo: { hasNextPage: false },
      });

      const tool = templatesTool();
      const result = (await tool.handler(
        tool.zodSchema.parse({ sources: ['IMPORT'] }) as never,
      )) as { paginationNote?: string };

      // An empty array alone reads exactly like a failed lookup, and a probe
      // agent spent a second unfiltered call before it would trust the zero.
      expect(result.paginationNote).toContain('sources');
      expect(result.paginationNote).toContain('query succeeded');
    });

    it('distinguishes an empty organization from an over-narrow filter', async () => {
      mockGraphql.listAssessmentTemplates.mockResolvedValue({
        nodes: [],
        totalCount: 0,
        pageInfo: { hasNextPage: false },
      });

      const tool = templatesTool();
      const result = (await tool.handler(tool.zodSchema.parse({}) as never)) as {
        paginationNote?: string;
      };

      expect(result.paginationNote).toContain('no templates');
    });

    it('leaves the people off the row until they are asked for', async () => {
      mockGraphql.listAssessmentTemplates.mockResolvedValue({
        nodes: [{ id: 'tpl-7', title: 'Vendor Onboarding', source: 'IMPORT' }],
        totalCount: 1,
        pageInfo: { hasNextPage: false },
      });

      const tool = templatesTool();
      const result = (await tool.handler(tool.zodSchema.parse({}) as never)) as {
        data: Array<Record<string, unknown>>;
      };

      expect(mockGraphql.listAssessmentTemplates).toHaveBeenCalledWith(
        expect.objectContaining({ includeDetails: false }),
      );
      // `source` is cheap enough to carry always; a caller filtering on it can
      // read back what it matched without a second call.
      expect(result.data[0]).toMatchObject({ source: 'IMPORT' });
    });

    it('names the creator and last editor when details are requested', async () => {
      mockGraphql.listAssessmentTemplates.mockResolvedValue({
        nodes: [
          {
            id: 'tpl-7',
            title: 'Vendor Onboarding',
            source: 'MANUAL',
            creator: { id: 'usr-1', name: 'Daniel Sklyar', email: 'daniel@transcend.io' },
            lastEditor: { id: 'usr-2', name: 'Ada Lovelace', email: 'ada@transcend.io' },
          },
        ],
        totalCount: 1,
        pageInfo: { hasNextPage: false },
      });

      const tool = templatesTool();
      const result = (await tool.handler(
        tool.zodSchema.parse({ includeDetails: true }) as never,
      )) as { data: Array<Record<string, unknown>> };

      expect(mockGraphql.listAssessmentTemplates).toHaveBeenCalledWith(
        expect.objectContaining({ includeDetails: true }),
      );
      expect(result.data[0]).toMatchObject({
        creator: { name: 'Daniel Sklyar' },
        lastEditor: { name: 'Ada Lovelace' },
      });
    });
  });

  describe('assessments_create', () => {
    it('zodSchema rejects when title is missing', () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_create')!;

      const result = tool.zodSchema.safeParse({ assessmentGroupId: 'grp-1' });
      expect(result.success).toBe(false);
      expect((result as any).error.issues[0].path).toEqual(['title']);
    });

    it('creates assessment with group_id on success', async () => {
      const mockAssessment = {
        id: 'assess-1',
        title: 'My Assessment',
        status: 'DRAFT',
      };
      mockGraphql.createAssessment.mockResolvedValue(mockAssessment);

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_create')!;

      const result = await tool.handler({
        title: 'My Assessment',
        assessmentGroupId: 'grp-123',
      });

      expect(result).toMatchObject({
        success: true,
        data: expect.objectContaining({
          assessment: expect.objectContaining(mockAssessment),
          message: expect.stringContaining('created successfully'),
        }),
      });
      expect(mockGraphql.createAssessment).toHaveBeenCalledWith({
        title: 'My Assessment',
        assessmentGroupId: 'grp-123',
        assigneeIds: undefined,
      });
    });

    it('resolves templateId to assessmentGroupId when assessmentGroupId not provided', async () => {
      const mockGroup = {
        id: 'grp-from-template',
        assessmentFormTemplate: { id: 'tpl-1' },
      };
      mockGraphql.listAssessmentGroups.mockResolvedValue({
        nodes: [mockGroup],
        totalCount: 1,
        pageInfo: { hasNextPage: false },
      });

      const mockAssessment = {
        id: 'assess-2',
        title: 'From Template',
        status: 'DRAFT',
      };
      mockGraphql.createAssessment.mockResolvedValue(mockAssessment);

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_create')!;

      const result = await tool.handler({
        title: 'From Template',
        templateId: 'tpl-1',
      });

      expect(result).toMatchObject({
        success: true,
        data: expect.objectContaining({
          assessment: expect.objectContaining(mockAssessment),
        }),
      });
      expect(mockGraphql.listAssessmentGroups).toHaveBeenCalledWith({ first: 100 });
      expect(mockGraphql.createAssessment).toHaveBeenCalledWith({
        title: 'From Template',
        assessmentGroupId: 'grp-from-template',
        assigneeIds: undefined,
      });
    });

    it('throws when client throws', async () => {
      mockGraphql.createAssessment.mockRejectedValue(new Error('Group not found'));

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_create')!;

      await expect(
        tool.handler({
          title: 'Test',
          assessmentGroupId: 'grp-bad',
        }),
      ).rejects.toThrow('Group not found');
    });
  });

  describe('assessments_create_template', () => {
    it('zodSchema rejects when title is missing', () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_create_template')!;

      const result = tool.zodSchema.safeParse({
        sections: [{ title: 'Section 1', questions: [] }],
      });
      expect(result.success).toBe(false);
      expect((result as any).error.issues[0].path).toEqual(['title']);
    });

    it('creates template on success', async () => {
      const mockTemplate = {
        id: 'tpl-new',
        title: 'New Template',
        status: 'DRAFT',
      };
      mockGraphql.createAssessmentFormTemplate.mockResolvedValue(mockTemplate);

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_create_template')!;

      const result = await tool.handler({
        title: 'New Template',
        description: 'A test template',
        status: 'DRAFT',
        sections: [
          {
            title: 'Section 1',
            questions: [
              {
                title: 'Question 1',
                type: 'SHORT_ANSWER_TEXT',
              },
            ],
          },
        ],
      });

      expect(result).toMatchObject({
        success: true,
        data: expect.objectContaining({
          template: mockTemplate,
          message: expect.stringContaining('created successfully'),
        }),
      });
      expect(mockGraphql.createAssessmentFormTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Template',
          description: 'A test template',
          status: 'DRAFT',
          sections: expect.any(Array),
        }),
      );
    });

    it('throws when client throws', async () => {
      mockGraphql.createAssessmentFormTemplate.mockRejectedValue(
        new Error('Template creation failed'),
      );

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_create_template')!;

      await expect(
        tool.handler({
          title: 'Failing Template',
        }),
      ).rejects.toThrow('Template creation failed');
    });
  });

  describe('assessments_answer_question', () => {
    it('zodSchema rejects when assessmentQuestionId is missing', () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_answer_question')!;

      const result = tool.zodSchema.safeParse({ assessmentAnswerIds: ['ans-1'] });
      expect(result.success).toBe(false);
      expect((result as any).error.issues[0].path).toEqual(['assessmentQuestionId']);
    });

    it('answers question with answer IDs on success', async () => {
      const mockSelected = [{ id: 'ans-1', value: 'Option A' }];
      mockGraphql.selectAssessmentQuestionAnswers.mockResolvedValue(mockSelected);

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_answer_question')!;

      const result = await tool.handler({
        assessmentQuestionId: 'q1',
        assessmentAnswerIds: ['ans-1'],
      });

      expect(result).toMatchObject({
        success: true,
        data: expect.objectContaining({
          selectedAnswers: mockSelected,
          message: expect.stringContaining('answered successfully'),
        }),
      });
      expect(mockGraphql.selectAssessmentQuestionAnswers).toHaveBeenCalledWith({
        assessmentQuestionId: 'q1',
        assessmentAnswerIds: ['ans-1'],
      });
    });

    it('answers question with answer values (text) on success', async () => {
      const mockSelected = [{ value: 'Custom answer', isUserCreated: true }];
      mockGraphql.selectAssessmentQuestionAnswers.mockResolvedValue(mockSelected);

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_answer_question')!;

      const result = await tool.handler({
        assessmentQuestionId: 'q2',
        assessmentAnswerValues: [{ value: 'My text answer', isUserCreated: true }],
      });

      expect(result).toMatchObject({
        success: true,
        data: expect.objectContaining({
          selectedAnswers: mockSelected,
        }),
      });
      expect(mockGraphql.selectAssessmentQuestionAnswers).toHaveBeenCalledWith({
        assessmentQuestionId: 'q2',
        assessmentAnswerValues: [{ value: 'My text answer', isUserCreated: true }],
      });
    });

    it('throws when client throws', async () => {
      mockGraphql.selectAssessmentQuestionAnswers.mockRejectedValue(
        new Error('Question not found'),
      );

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_answer_question')!;

      await expect(
        tool.handler({
          assessmentQuestionId: 'q-bad',
          assessmentAnswerIds: ['ans-1'],
        }),
      ).rejects.toThrow('Question not found');
    });
  });

  describe('assessments_prefill', () => {
    it('zodSchema rejects when title is missing', () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_prefill')!;

      const result = tool.zodSchema.safeParse({
        assessmentGroupId: 'grp-1',
        answers: { Q1: 'A1' },
      });
      expect(result.success).toBe(false);
      expect((result as any).error.issues[0].path).toEqual(['title']);
    });

    it('zodSchema rejects when answers is missing', () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_prefill')!;

      const result = tool.zodSchema.safeParse({
        title: 'Prefill Test',
        assessmentGroupId: 'grp-1',
      });
      expect(result.success).toBe(false);
      expect((result as any).error.issues[0].path).toEqual(['answers']);
    });

    it('returns error when neither templateId nor assessmentGroupId provided', async () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_prefill')!;

      const result = await tool.handler({
        title: 'Prefill Test',
        answers: { Q1: 'A1' },
      });

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('templateId or assessmentGroupId'),
      });
      expect(mockGraphql.createAssessment).not.toHaveBeenCalled();
    });

    it('prefills assessment on happy path (multi-step flow)', async () => {
      const mockAssessment = {
        id: 'assess-prefill-1',
        title: 'Prefilled Assessment',
        status: 'DRAFT',
      };
      mockGraphql.createAssessment.mockResolvedValue(mockAssessment);

      const mockFullForm = {
        id: 'assess-prefill-1',
        title: 'Prefilled Assessment',
        status: 'DRAFT',
        sections: [
          {
            id: 'sec-1',
            questions: [
              {
                id: 'q1',
                title: 'What is your name?',
                referenceId: 'ref-1',
                type: 'SHORT_ANSWER_TEXT',
                answerOptions: [],
              },
              {
                id: 'q2',
                title: 'Select one',
                referenceId: 'ref-2',
                type: 'SINGLE_SELECT',
                answerOptions: [
                  { id: 'opt-a', value: 'Option A' },
                  { id: 'opt-b', value: 'Option B' },
                ],
              },
            ],
          },
        ],
      };
      mockGraphql.getAssessment.mockResolvedValue(mockFullForm);
      mockGraphql.selectAssessmentQuestionAnswers.mockResolvedValue([]);

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_prefill')!;

      const result = await tool.handler({
        title: 'Prefilled Assessment',
        assessmentGroupId: 'grp-prefill',
        answers: {
          'What is your name?': 'Alice',
          'Select one': 'Option A',
        },
      });

      expect(result).toMatchObject({
        success: true,
        data: expect.objectContaining({
          assessmentId: 'assess-prefill-1',
          title: 'Prefilled Assessment',
          answersApplied: expect.any(Number),
          totalQuestions: 2,
          results: expect.any(Array),
          message: expect.stringContaining('created and prefilled'),
        }),
      });
      expect(mockGraphql.createAssessment).toHaveBeenCalledWith({
        title: 'Prefilled Assessment',
        assessmentGroupId: 'grp-prefill',
      });
      expect(mockGraphql.getAssessment).toHaveBeenCalledWith('assess-prefill-1');
      expect(mockGraphql.selectAssessmentQuestionAnswers).toHaveBeenCalledTimes(2);
    });

    it('returns early success when form has no sections', async () => {
      const mockAssessment = {
        id: 'assess-empty',
        title: 'Empty Form',
        status: 'DRAFT',
      };
      mockGraphql.createAssessment.mockResolvedValue(mockAssessment);
      mockGraphql.getAssessment.mockResolvedValue({
        id: 'assess-empty',
        title: 'Empty Form',
        sections: [],
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_prefill')!;

      const result = await tool.handler({
        title: 'Empty Form',
        assessmentGroupId: 'grp-1',
        answers: { Q1: 'A1' },
      });

      expect(result).toMatchObject({
        success: true,
        data: expect.objectContaining({
          assessment: expect.objectContaining({ id: 'assess-empty' }),
          answersApplied: 0,
          message: expect.stringContaining('no sections/questions'),
        }),
      });
      expect(mockGraphql.selectAssessmentQuestionAnswers).not.toHaveBeenCalled();
    });

    it('throws when client throws during create', async () => {
      mockGraphql.createAssessment.mockRejectedValue(new Error('Create failed'));

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_prefill')!;

      await expect(
        tool.handler({
          title: 'Failing Prefill',
          assessmentGroupId: 'grp-1',
          answers: { Q1: 'A1' },
        }),
      ).rejects.toThrow('Create failed');
    });
  });

  describe('admin dashboard deep links', () => {
    const FORM_ID = '1928a56a-26b9-40f1-aac3-1b5208cd256e';
    const GROUP_ID = '44dc90f1-71b8-4bb7-a2ae-053985605cf1';

    it('assessments_create returns the form response url for DRAFT status', async () => {
      mockGraphql.createAssessment.mockResolvedValue({
        id: FORM_ID,
        title: 'DPIA',
        status: 'DRAFT',
        assessmentGroupId: GROUP_ID,
      });

      const tool = getTools().find((t) => t.name === 'assessments_create')!;
      const result = (await tool.handler({
        title: 'DPIA',
        assessmentGroupId: GROUP_ID,
      })) as { success: boolean; data: Record<string, unknown> };

      expect(result.success).toBe(true);
      expect(result.data.url).toBe(
        `https://app.transcend.io/assessments/forms/${FORM_ID}/response`,
      );
      // The per-assessment tools only surface a single `url` field — exposing
      // `groupUrl` alongside it tempts LLM clients to render the group page
      // instead of the assessment.
      expect(result.data.groupUrl).toBeUndefined();
      // Should never surface the assignee-only /view route — it 404s for non-assignees.
      expect(JSON.stringify(result.data)).not.toContain('/view');
      expect(result.data.message).toContain(
        `https://app.transcend.io/assessments/forms/${FORM_ID}/response`,
      );
    });

    it('assessments_submit_response returns the form response URL even for IN_REVIEW status', async () => {
      // The dashboard's own "View Responses" row action sends reviewers to
      // /response regardless of status — the previous IN_REVIEW -> group
      // special case mirrored the email link convention, but that's a
      // different audience. Per-assessment MCP responses should always
      // point at the specific assessment.
      mockGraphql.submitAssessmentForReview.mockResolvedValue({
        id: FORM_ID,
        title: 'DPIA',
        status: 'IN_REVIEW',
        assessmentGroupId: GROUP_ID,
      });

      const tool = getTools().find((t) => t.name === 'assessments_submit_response')!;
      const result = (await tool.handler({
        assessmentId: FORM_ID,
        assessmentSectionIds: ['sec-1'],
      })) as { success: boolean; data: Record<string, unknown> };

      expect(result.success).toBe(true);
      expect(result.data.url).toBe(
        `https://app.transcend.io/assessments/forms/${FORM_ID}/response`,
      );
      expect(result.data.groupUrl).toBeUndefined();
      expect(result.data.message).toContain(
        `https://app.transcend.io/assessments/forms/${FORM_ID}/response`,
      );
    });

    it('assessments_get returns the form response URL for APPROVED status', async () => {
      mockGraphql.getAssessment.mockResolvedValue({
        id: FORM_ID,
        title: 'DPIA',
        status: 'APPROVED',
        assessmentGroupId: GROUP_ID,
      });

      const tool = getTools().find((t) => t.name === 'assessments_get')!;
      const result = (await tool.handler({ assessmentId: FORM_ID })) as {
        success: boolean;
        data: Record<string, unknown>;
      };

      expect(result.success).toBe(true);
      expect(result.data.url).toBe(
        `https://app.transcend.io/assessments/forms/${FORM_ID}/response`,
      );
      expect(result.data.groupUrl).toBeUndefined();
    });

    it('assessments_list attaches a /response url to each row regardless of status', async () => {
      mockGraphql.listAssessments.mockResolvedValue({
        nodes: [
          { id: FORM_ID, title: 'Draft', status: 'DRAFT', assessmentGroupId: GROUP_ID },
          { id: 'form-2', title: 'In Review', status: 'IN_REVIEW', assessmentGroupId: GROUP_ID },
        ],
        totalCount: 2,
        pageInfo: { hasNextPage: false },
      });

      const tool = getTools().find((t) => t.name === 'assessments_list')!;
      const result = (await tool.handler({ limit: 50 })) as {
        success: boolean;
        data: Array<Record<string, unknown>>;
      };

      expect(result.success).toBe(true);
      // Every row gets the same canonical /response URL regardless of
      // status — matches the dashboard's "View Responses" row action.
      expect(result.data[0]!.url).toBe(
        `https://app.transcend.io/assessments/forms/${FORM_ID}/response`,
      );
      expect(result.data[1]!.url).toBe(
        `https://app.transcend.io/assessments/forms/form-2/response`,
      );
      // Per-assessment rows must not expose a sibling `groupUrl` — agents will
      // pick it over the canonical `url` and route every link to the group page.
      expect(result.data[0]!.groupUrl).toBeUndefined();
      expect(result.data[1]!.groupUrl).toBeUndefined();
      // No row should expose the assignee-only /view route.
      expect(JSON.stringify(result.data)).not.toContain('/view');
    });

    it('assessments_list_groups attaches a groupUrl to each row', async () => {
      mockGraphql.listAssessmentGroups.mockResolvedValue({
        nodes: [
          { id: 'grp-1', title: 'Group 1' },
          { id: 'grp-2', title: 'Group 2' },
        ],
        totalCount: 2,
        pageInfo: { hasNextPage: false },
      });

      const tool = getTools().find((t) => t.name === 'assessments_list_groups')!;
      const result = (await tool.handler({ limit: 50 })) as {
        success: boolean;
        data: Array<Record<string, unknown>>;
      };

      expect(result.success).toBe(true);
      expect(result.data[0]!.groupUrl).toBe('https://app.transcend.io/assessments/groups/grp-1');
      expect(result.data[1]!.groupUrl).toBe('https://app.transcend.io/assessments/groups/grp-2');
    });

    it('assessments_list_groups narrows by title instead of scanning pages', async () => {
      mockGraphql.listAssessmentGroups.mockResolvedValue({
        nodes: [{ id: 'grp-1', title: 'Vendor Onboarding' }],
        totalCount: 1,
        pageInfo: { hasNextPage: false },
      });

      const tool = getTools().find((t) => t.name === 'assessments_list_groups')!;
      await tool.handler(
        tool.zodSchema.parse({ text: 'Vendor Onboarding', templateIds: ['tpl-1'] }) as never,
      );

      expect(mockGraphql.listAssessmentGroups).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 0,
          filterBy: { text: 'Vendor Onboarding', templateIds: ['tpl-1'] },
        }),
      );
    });

    it('assessments_list_groups pages with offset', async () => {
      mockGraphql.listAssessmentGroups.mockResolvedValue({
        nodes: [{ id: 'grp-3', title: 'Group 3' }],
        totalCount: 120,
        pageInfo: { hasNextPage: true },
      });

      const tool = getTools().find((t) => t.name === 'assessments_list_groups')!;
      const result = (await tool.handler(
        tool.zodSchema.parse({ limit: 50, offset: 50 }) as never,
      )) as { hasNextPage: boolean; totalCount: number };

      expect(mockGraphql.listAssessmentGroups).toHaveBeenCalledWith(
        expect.objectContaining({ first: 50, offset: 50 }),
      );
      expect(result).toMatchObject({ hasNextPage: true, totalCount: 120 });
    });

    it('assessments_list_groups resolves a form to its template via assessmentGroupId', async () => {
      // The documented bridge to assessments_export_template: AssessmentFormRaw
      // reaches its group but not its template, so the group row carries it.
      mockGraphql.listAssessmentGroups.mockResolvedValue({
        nodes: [
          {
            id: 'grp-1',
            title: 'Vendor Onboarding',
            assessmentFormTemplate: { id: 'tpl-7', title: 'Vendor Onboarding' },
          },
        ],
        totalCount: 1,
        pageInfo: { hasNextPage: false },
      });

      const tool = getTools().find((t) => t.name === 'assessments_list_groups')!;
      const result = (await tool.handler(tool.zodSchema.parse({ ids: ['grp-1'] }) as never)) as {
        data: Array<Record<string, any>>;
      };

      expect(mockGraphql.listAssessmentGroups).toHaveBeenCalledWith(
        expect.objectContaining({ filterBy: { ids: ['grp-1'] } }),
      );
      expect(result.data[0]!.assessmentFormTemplate.id).toBe('tpl-7');
    });

    it('assessments_list_groups says a filter matched nothing', async () => {
      mockGraphql.listAssessmentGroups.mockResolvedValue({
        nodes: [],
        totalCount: 0,
        pageInfo: { hasNextPage: false },
      });

      const tool = getTools().find((t) => t.name === 'assessments_list_groups')!;
      const result = (await tool.handler(
        tool.zodSchema.parse({ text: 'Nothing By This Name' }) as never,
      )) as { paginationNote?: string };

      expect(result.paginationNote).toContain('text');
      expect(result.paginationNote).toContain('query succeeded');
    });

    it('assessments_list_groups no longer accepts a cursor', () => {
      const tool = getTools().find((t) => t.name === 'assessments_list_groups')!;
      const { shape } = tool.zodSchema as unknown as { shape: Record<string, unknown> };
      expect(shape).not.toHaveProperty('cursor');
      expect(shape).toHaveProperty('offset');
    });

    it('honors a caller-supplied dashboard URL on the ToolClients', async () => {
      mockGraphql.createAssessment.mockResolvedValue({
        id: FORM_ID,
        title: 'DPIA',
        status: 'DRAFT',
        assessmentGroupId: GROUP_ID,
      });

      const tool = getTools('https://app.staging.transcend.io').find(
        (t) => t.name === 'assessments_create',
      )!;
      const result = (await tool.handler({
        title: 'DPIA',
        assessmentGroupId: GROUP_ID,
      })) as { success: boolean; data: Record<string, unknown> };

      expect(result.data.url).toBe(
        `https://app.staging.transcend.io/assessments/forms/${FORM_ID}/response`,
      );
    });
  });
});
