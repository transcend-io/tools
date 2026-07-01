import {
  TranscendGraphQLBase,
  type Assessment,
  type AssessmentCreateInput,
  type AssessmentGroup,
  type AssessmentQuestionInput,
  type AssessmentSubmitForReviewInput,
  type AssessmentTemplate,
  type AssessmentTemplateCreateInput,
  type AssessmentTemplateExport,
  type AssessmentUpdateInput,
  type ListOptions,
  type PaginatedResponse,
} from '@transcend-io/mcp-server-base';

import { graphql } from './__generated__/gql.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function normalizeQuestion(q: AssessmentQuestionInput): Record<string, unknown> {
  let { referenceId, subType, allowSelectOther, requireRiskEvaluation } = q;

  if (!referenceId || !UUID_RE.test(referenceId)) {
    referenceId = generateUUID();
  }

  if (allowSelectOther && (!subType || subType === 'NONE')) {
    subType = 'CUSTOM';
  }

  if (requireRiskEvaluation && !q.riskFrameworkId) {
    requireRiskEvaluation = false;
  }

  return {
    title: q.title,
    type: q.type,
    subType: subType || 'NONE',
    placeholder: q.placeholder || '',
    description: q.description || '',
    isRequired: q.isRequired ?? false,
    referenceId,
    answerOptions: q.answerOptions || [],
    allowSelectOther: allowSelectOther ?? false,
    requireRiskEvaluation: requireRiskEvaluation ?? false,
    ...(q.riskLogic && { riskLogic: q.riskLogic }),
    ...(q.riskCategoryIds && { riskCategoryIds: q.riskCategoryIds }),
    ...(q.riskFrameworkId && { riskFrameworkId: q.riskFrameworkId }),
    ...(q.displayLogic && { displayLogic: q.displayLogic }),
  };
}

const ListAssessmentsDoc = graphql(/* GraphQL */ `
  query AssessmentsList($first: Int, $filterBy: AssessmentFormFiltersInput) {
    assessmentForms(first: $first, filterBy: $filterBy) {
      nodes {
        id
        title
        status
        createdAt
        assessmentGroup {
          id
        }
      }
      totalCount
    }
  }
`);

const GetAssessmentDoc = graphql(/* GraphQL */ `
  query AssessmentsGet($ids: [ID!]!) {
    assessmentForms(first: 1, filterBy: { ids: $ids }) {
      nodes {
        id
        title
        status
        dueDate
        submittedAt
        createdAt
        updatedAt
        assessmentGroup {
          id
        }
        sections {
          id
          title
          index
          status
          questions {
            id
            title
            index
            type
            subType
            description
            isRequired
            placeholder
            answerOptions {
              id
              index
              value
            }
            selectedAnswers {
              id
              index
              value
            }
          }
        }
      }
    }
  }
`);

const SelectAssessmentQuestionAnswersDoc = graphql(/* GraphQL */ `
  mutation AssessmentsSelectAnswers($input: SelectAssessmentQuestionAnswerInput!) {
    selectAssessmentQuestionAnswers(input: $input) {
      selectedAnswers {
        id
        index
        value
      }
    }
  }
`);

const UpdateAssessmentFormAssigneesDoc = graphql(/* GraphQL */ `
  mutation AssessmentsUpdateAssignees($input: UpdateAssessmentFormAssigneesInput!) {
    updateAssessmentFormAssignees(input: $input) {
      assessmentForm {
        id
        title
        status
      }
    }
  }
`);

const ListAssessmentGroupsDoc = graphql(/* GraphQL */ `
  query AssessmentsListGroups($first: Int) {
    assessmentGroups(first: $first) {
      nodes {
        id
        title
        assessmentFormTemplate {
          id
          title
        }
      }
      totalCount
    }
  }
`);

const CreateAssessmentGroupDoc = graphql(/* GraphQL */ `
  mutation AssessmentsCreateGroup($input: CreateAssessmentGroupInput!) {
    createAssessmentGroup(input: $input) {
      assessmentGroup {
        id
        title
      }
    }
  }
`);

const CreateAssessmentFormsDoc = graphql(/* GraphQL */ `
  mutation AssessmentsCreate($input: CreateAssessmentFormsInput!) {
    createAssessmentForms(input: $input) {
      assessmentForms {
        id
        title
        status
        createdAt
      }
    }
  }
`);

const UpdateAssessmentFormDoc = graphql(/* GraphQL */ `
  mutation AssessmentsUpdate($input: UpdateAssessmentFormInput!) {
    updateAssessmentForm(input: $input) {
      assessmentForm {
        id
        title
        description
        status
        dueDate
        updatedAt
        assessmentGroup {
          id
        }
      }
    }
  }
`);

const ListAssessmentTemplatesDoc = graphql(/* GraphQL */ `
  query AssessmentsListTemplates($first: Int) {
    assessmentFormTemplates(first: $first) {
      nodes {
        id
        title
        description
      }
      totalCount
    }
  }
`);

const SubmitAssessmentForReviewDoc = graphql(/* GraphQL */ `
  mutation AssessmentsSubmitForReview($input: SubmitAssessmentFormForReviewInput!) {
    submitAssessmentFormForReview(input: $input) {
      clientMutationId
    }
  }
`);

const CreateAssessmentFormTemplateDoc = graphql(/* GraphQL */ `
  mutation AssessmentsCreateTemplate($input: CreateAssessmentFormTemplateInput!) {
    createAssessmentFormTemplate(input: $input) {
      assessmentFormTemplate {
        id
        title
        status
        sections {
          id
          title
          index
          questions {
            id
            title
            index
            type
            subType
            referenceId
          }
        }
      }
    }
  }
`);

const CreateAssessmentSectionDoc = graphql(/* GraphQL */ `
  mutation AssessmentsCreateSection($input: CreateAssessmentSectionInput!) {
    createAssessmentSection(input: $input) {
      assessmentSection {
        id
        title
        index
        questions {
          id
          title
          index
          type
          subType
          referenceId
        }
      }
    }
  }
`);

const CreateAssessmentQuestionsDoc = graphql(/* GraphQL */ `
  mutation AssessmentsCreateQuestions($input: [CreateAssessmentQuestionInput!]!) {
    createAssessmentQuestions(input: $input) {
      assessmentQuestions {
        id
        title
        index
        type
        subType
        referenceId
      }
    }
  }
`);

const GetAssessmentFormTemplateDoc = graphql(/* GraphQL */ `
  query AssessmentsGetTemplate($ids: [ID!]) {
    assessmentFormTemplates(first: 1, filterBy: { ids: $ids }) {
      nodes {
        id
        title
        description
        status
        source
        createdAt
        updatedAt
        sections {
          id
          title
          index
          questions {
            id
            title
            index
            type
            subType
            description
            placeholder
            isRequired
            referenceId
            allowSelectOther
            requireRiskEvaluation
            answerOptions {
              id
              index
              value
            }
          }
        }
      }
    }
  }
`);

export class AssessmentsMixin extends TranscendGraphQLBase {
  async listAssessments(
    options?: ListOptions & { filterBy?: { statuses?: string[] } },
  ): Promise<PaginatedResponse<Assessment>> {
    const data = await this.makeRequest(ListAssessmentsDoc, {
      first: Math.min(options?.first ?? 50, 100),
      filterBy: options?.filterBy?.statuses
        ? // The codegen-emitted enum is structurally equivalent to the manual
          // string array we accept here; the server validates it strictly.
          ({ statuses: options.filterBy.statuses } as never)
        : null,
    });
    return {
      nodes: data.assessmentForms.nodes.map((node) => ({
        id: node.id,
        title: node.title,
        status: node.status as Assessment['status'],
        createdAt: node.createdAt,
        assessmentGroupId: node.assessmentGroup?.id,
      })),
      pageInfo: {
        hasNextPage: data.assessmentForms.nodes.length < data.assessmentForms.totalCount,
        hasPreviousPage: false,
      },
      totalCount: data.assessmentForms.totalCount,
    };
  }

  async getAssessment(id: string): Promise<Assessment> {
    const data = await this.makeRequest(GetAssessmentDoc, { ids: [id] });
    const node = data.assessmentForms.nodes[0];
    if (!node) {
      throw new Error(`Assessment with id ${id} not found`);
    }
    return {
      id: node.id,
      title: node.title,
      status: node.status as Assessment['status'],
      dueDate: node.dueDate ?? undefined,
      submittedAt: node.submittedAt ?? undefined,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt ?? undefined,
      assessmentGroupId: node.assessmentGroup?.id,
      sections: node.sections?.map((section) => ({
        id: section.id,
        title: section.title ?? undefined,
        index: section.index ?? undefined,
        status: section.status ?? undefined,
        questions: section.questions?.map((q) => ({
          id: q.id,
          title: q.title ?? undefined,
          index: q.index ?? undefined,
          type: q.type,
          subType: q.subType ?? undefined,
          description: q.description ?? undefined,
          isRequired: q.isRequired ?? undefined,
          placeholder: q.placeholder ?? undefined,
          answerOptions: q.answerOptions?.map((a) => ({
            id: a.id,
            index: a.index,
            value: a.value,
          })),
          selectedAnswers: q.selectedAnswers?.map((a) => ({
            id: a.id,
            index: a.index,
            value: a.value,
          })),
        })),
      })),
    };
  }

  async selectAssessmentQuestionAnswers(input: {
    assessmentQuestionId: string;
    assessmentAnswerIds?: string[];
    assessmentAnswerValues?: { value: string; isUserCreated: boolean }[];
  }): Promise<Array<{ id: string; index: number; value: string }>> {
    const data = await this.makeRequest(SelectAssessmentQuestionAnswersDoc, { input });
    return data.selectAssessmentQuestionAnswers.selectedAnswers;
  }

  async updateAssessmentFormAssignees(input: {
    id: string;
    assigneeIds?: string[];
    externalAssigneeEmails?: string[];
  }): Promise<{ id: string; title: string; status: string }> {
    const data = await this.makeRequest(UpdateAssessmentFormAssigneesDoc, { input });
    return data.updateAssessmentFormAssignees.assessmentForm;
  }

  async listAssessmentGroups(options?: ListOptions): Promise<PaginatedResponse<AssessmentGroup>> {
    const data = await this.makeRequest(ListAssessmentGroupsDoc, {
      first: Math.min(options?.first ?? 50, 100),
    });
    return {
      nodes: data.assessmentGroups.nodes.map((node) => ({
        id: node.id,
        title: node.title,
        assessmentFormTemplate: node.assessmentFormTemplate
          ? { id: node.assessmentFormTemplate.id, title: node.assessmentFormTemplate.title }
          : undefined,
      })),
      pageInfo: {
        hasNextPage: data.assessmentGroups.nodes.length < data.assessmentGroups.totalCount,
        hasPreviousPage: false,
      },
      totalCount: data.assessmentGroups.totalCount,
    };
  }

  async createAssessmentGroup(input: {
    title: string;
    assessmentFormTemplateId: string;
    description?: string;
    isTriggerEnabled?: boolean;
    reviewerIds?: string[];
  }): Promise<{ id: string; title: string }> {
    const data = await this.makeRequest(CreateAssessmentGroupDoc, { input });
    return data.createAssessmentGroup.assessmentGroup;
  }

  async createAssessment(input: AssessmentCreateInput): Promise<Assessment> {
    const batchInput = {
      assessmentForms: [
        {
          title: input.title,
          assessmentGroupId: input.assessmentGroupId,
          ...(input.assigneeIds && { assigneeIds: input.assigneeIds }),
        },
      ],
    };
    const data = await this.makeRequest(CreateAssessmentFormsDoc, { input: batchInput });
    const created = data.createAssessmentForms.assessmentForms[0];
    if (!created) throw new Error('createAssessmentForms returned an empty array');
    return {
      id: created.id,
      title: created.title,
      status: created.status as Assessment['status'],
      createdAt: created.createdAt,
      // The mutation response doesn't echo `assessmentGroup`, but we know the
      // ID from the input -- surface it so callers can build a deep link
      // without an extra round trip.
      assessmentGroupId: input.assessmentGroupId,
    };
  }

  async updateAssessment(input: AssessmentUpdateInput): Promise<Assessment> {
    const data = await this.makeRequest(UpdateAssessmentFormDoc, { input });
    const form = data.updateAssessmentForm.assessmentForm;
    return {
      id: form.id,
      title: form.title,
      description: form.description ?? undefined,
      status: form.status as Assessment['status'],
      dueDate: form.dueDate ?? undefined,
      updatedAt: form.updatedAt ?? undefined,
      createdAt: '',
      assessmentGroupId: form.assessmentGroup?.id,
    };
  }

  async listAssessmentTemplates(
    options?: ListOptions,
  ): Promise<PaginatedResponse<AssessmentTemplate>> {
    const data = await this.makeRequest(ListAssessmentTemplatesDoc, {
      first: Math.min(options?.first ?? 50, 100),
    });
    const templates: AssessmentTemplate[] = data.assessmentFormTemplates.nodes.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description ?? undefined,
      version: '1.0.0',
      isActive: true,
      createdAt: new Date().toISOString(),
    }));
    return {
      nodes: templates,
      pageInfo: {
        hasNextPage:
          data.assessmentFormTemplates.nodes.length < data.assessmentFormTemplates.totalCount,
        hasPreviousPage: false,
      },
      totalCount: data.assessmentFormTemplates.totalCount,
    };
  }

  async submitAssessmentForReview(input: AssessmentSubmitForReviewInput): Promise<Assessment> {
    await this.makeRequest(SubmitAssessmentForReviewDoc, { input });
    return this.getAssessment(input.id);
  }

  async createAssessmentFormTemplate(
    input: AssessmentTemplateCreateInput,
  ): Promise<{ id: string; title: string; status: string }> {
    const gqlInput: Record<string, unknown> = {
      title: input.title,
      description: input.description || '',
      status: input.status || 'DRAFT',
      source: input.source || 'MANUAL',
    };
    if (input.sections) {
      gqlInput.sections = input.sections.map((s) => ({
        title: s.title,
        questions: s.questions?.map(normalizeQuestion) || [],
      }));
    }
    const data = await this.makeRequest(CreateAssessmentFormTemplateDoc, {
      // The schema's `CreateAssessmentFormTemplateInput` is strictly typed;
      // we pre-shape the questions through `normalizeQuestion` and let the
      // boundary cast accept whatever subset the manual input declares.
      input: gqlInput as never,
    });
    return data.createAssessmentFormTemplate.assessmentFormTemplate;
  }

  async createAssessmentSection(input: {
    assessmentFormTemplateId: string;
    title: string;
    questions?: AssessmentQuestionInput[];
  }): Promise<{ id: string; title: string; index: number }> {
    const gqlInput: Record<string, unknown> = {
      assessmentFormTemplateId: input.assessmentFormTemplateId,
      title: input.title,
    };
    if (input.questions) {
      gqlInput.questions = input.questions.map(normalizeQuestion);
    }
    const data = await this.makeRequest(CreateAssessmentSectionDoc, {
      input: gqlInput as never,
    });
    return data.createAssessmentSection.assessmentSection;
  }

  async createAssessmentQuestions(
    assessmentSectionId: string,
    questions: AssessmentQuestionInput[],
  ): Promise<
    Array<{
      id: string;
      title: string;
      index: number;
      type: string;
      subType: string;
      referenceId: string;
    }>
  > {
    const input = questions.map((q) => ({
      title: q.title,
      type: q.type,
      subType: q.subType || 'NONE',
      placeholder: q.placeholder || '',
      description: q.description || '',
      isRequired: q.isRequired ?? false,
      referenceId: q.referenceId,
      assessmentSectionId,
      answerOptions: q.answerOptions || [],
      allowSelectOther: q.allowSelectOther ?? false,
      requireRiskEvaluation: q.requireRiskEvaluation ?? false,
    }));
    const data = await this.makeRequest(CreateAssessmentQuestionsDoc, {
      input: input as never,
    });
    return data.createAssessmentQuestions.assessmentQuestions;
  }

  async getAssessmentFormTemplate(templateId: string): Promise<AssessmentTemplateExport> {
    const data = await this.makeRequest(GetAssessmentFormTemplateDoc, { ids: [templateId] });
    const node = data.assessmentFormTemplates.nodes[0];
    if (!node) {
      throw new Error(`Assessment template with id ${templateId} not found`);
    }
    return {
      id: node.id,
      title: node.title,
      description: node.description ?? '',
      status: node.status,
      source: node.source,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt ?? '',
      sections: (node.sections ?? []).map((s) => ({
        id: s.id,
        title: s.title ?? '',
        index: s.index ?? 0,
        questions: (s.questions ?? []).map((q) => ({
          id: q.id,
          title: q.title ?? '',
          index: q.index ?? 0,
          type: q.type,
          subType: q.subType ?? '',
          description: q.description ?? '',
          placeholder: q.placeholder ?? '',
          isRequired: q.isRequired ?? false,
          referenceId: q.referenceId ?? '',
          allowSelectOther: q.allowSelectOther ?? false,
          requireRiskEvaluation: q.requireRiskEvaluation ?? false,
          answerOptions: (q.answerOptions ?? []).map((a) => ({
            id: a.id,
            index: a.index,
            value: a.value,
          })),
        })),
      })),
    };
  }
}
