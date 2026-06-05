import { requestAuthContext } from '@transcend-io/mcp-server-base';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  _clearPendingCreateConfirmations,
  confirmCreateConfirmation,
  getPendingCreateContext,
} from '../src/pending-create-confirmation.js';
import { getAssessmentTools } from '../src/tools.js';

const auth = { type: 'apiKey' as const, apiKey: 'prefill-blocking-key' };

async function confirmPendingCreate(input: {
  title: string;
  assessmentGroupId: string;
  assigneeIds: string[];
}): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
    const confirmed = requestAuthContext.run(auth, () => {
      const ctx = getPendingCreateContext();
      if (!ctx?.confirmationToken) return false;
      confirmCreateConfirmation({
        title: input.title,
        assessmentGroupId: input.assessmentGroupId,
        assigneeIds: input.assigneeIds,
        confirmationToken: ctx.confirmationToken,
      });
      return true;
    });
    if (confirmed) return;
  }
  throw new Error('Timed out waiting for create confirmation');
}

describe('assessments_prefill blocking create confirmation', () => {
  beforeEach(() => {
    _clearPendingCreateConfirmations();
  });

  afterEach(() => {
    _clearPendingCreateConfirmations();
    vi.restoreAllMocks();
  });

  it('waits for create confirmation before creating or prefilling', async () => {
    const mockGraphql = {
      createAssessment: vi.fn().mockResolvedValue({
        id: 'assess-block-1',
        title: 'Blocked Prefill',
        status: 'DRAFT',
      }),
      getAssessment: vi.fn().mockResolvedValue({
        id: 'assess-block-1',
        title: 'Blocked Prefill',
        sections: [
          {
            id: 'sec-1',
            questions: [
              {
                id: 'q1',
                title: 'Question 1',
                referenceId: 'ref-1',
                type: 'SHORT_ANSWER_TEXT',
                answerOptions: [],
              },
            ],
          },
        ],
      }),
      selectAssessmentQuestionAnswers: vi.fn().mockResolvedValue([]),
      updateAssessmentFormAssignees: vi.fn().mockResolvedValue({
        id: 'assess-block-1',
        status: 'SHARED',
      }),
      updateAssessment: vi.fn(),
      submitAssessmentForReview: vi.fn(),
      getCurrentUser: vi.fn().mockResolvedValue({ id: 'user-default' }),
      listUsers: vi.fn(),
      listAssessmentGroups: vi.fn(),
    };

    const tools = getAssessmentTools({
      rest: {} as never,
      graphql: mockGraphql as never,
      dashboardUrl: 'https://app.transcend.io',
    });
    const tool = tools.find((t) => t.name === 'assessments_prefill')!;

    const handlerPromise = requestAuthContext.run(auth, () =>
      tool.handler({
        suggested_title: 'Blocked Prefill',
        suggested_assessment_group_id: 'grp-1',
        answers: { 'Question 1': 'Answer 1' },
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(mockGraphql.createAssessment).not.toHaveBeenCalled();

    await confirmPendingCreate({
      title: 'Blocked Prefill',
      assessmentGroupId: 'grp-1',
      assigneeIds: ['user-42'],
    });

    const result = await handlerPromise;

    expect(result).toMatchObject({
      success: true,
      data: expect.objectContaining({
        assessmentId: 'assess-block-1',
        answersApplied: 1,
      }),
    });
    expect(mockGraphql.createAssessment).toHaveBeenCalledWith({
      title: 'Blocked Prefill',
      assessmentGroupId: 'grp-1',
    });
    expect(mockGraphql.updateAssessmentFormAssignees).toHaveBeenCalledWith({
      id: 'assess-block-1',
      assigneeIds: ['user-42'],
      externalAssigneeEmails: undefined,
    });
    expect(mockGraphql.selectAssessmentQuestionAnswers).toHaveBeenCalledTimes(1);
  });
});

describe('assessments_create blocking create confirmation', () => {
  beforeEach(() => {
    _clearPendingCreateConfirmations();
  });

  afterEach(() => {
    _clearPendingCreateConfirmations();
    vi.restoreAllMocks();
  });

  it('waits for create confirmation before creating assessment', async () => {
    const mockGraphql = {
      createAssessment: vi.fn().mockResolvedValue({
        id: 'assess-create-block',
        title: 'Blocked Create',
        status: 'DRAFT',
      }),
      updateAssessmentFormAssignees: vi.fn().mockResolvedValue({
        id: 'assess-create-block',
        title: 'Blocked Create',
        status: 'SHARED',
      }),
      getCurrentUser: vi.fn().mockResolvedValue({ id: 'user-default' }),
      listUsers: vi.fn(),
      listAssessmentGroups: vi.fn(),
    };

    const tools = getAssessmentTools({
      rest: {} as never,
      graphql: mockGraphql as never,
      dashboardUrl: 'https://app.transcend.io',
    });
    const tool = tools.find((t) => t.name === 'assessments_create')!;

    const handlerPromise = requestAuthContext.run(auth, () =>
      tool.handler({
        suggested_title: 'Blocked Create',
        suggested_assessment_group_id: 'grp-1',
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(mockGraphql.createAssessment).not.toHaveBeenCalled();

    await confirmPendingCreate({
      title: 'User Confirmed Title',
      assessmentGroupId: 'grp-2',
      assigneeIds: ['user-99'],
    });

    const result = await handlerPromise;

    expect(result).toMatchObject({
      success: true,
      data: expect.objectContaining({
        assessment: expect.objectContaining({ id: 'assess-create-block', status: 'SHARED' }),
        message: expect.stringContaining('created successfully'),
      }),
    });
    expect(mockGraphql.createAssessment).toHaveBeenCalledWith({
      title: 'User Confirmed Title',
      assessmentGroupId: 'grp-2',
    });
    expect(mockGraphql.updateAssessmentFormAssignees).toHaveBeenCalledWith({
      id: 'assess-create-block',
      assigneeIds: ['user-99'],
    });
  });
});
