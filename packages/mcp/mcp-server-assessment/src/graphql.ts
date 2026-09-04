import {
  derivePageInfo,
  ErrorCode,
  ToolError,
  TranscendGraphQLBase,
  type Assessment,
  type AssessmentComment,
  type AssessmentCommentLevel,
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

/** Shape shared by the form, section, and question comment types in the API. */
interface RawComment {
  /** Unique identifier */
  id: string;
  /** Body of the comment */
  content: string;
  /** ID of the comment this one replies to */
  parentCommentId?: string | null;
  /** When the comment was resolved (ISO 8601) */
  resolvedAt?: string | null;
  /** When the comment was created (ISO 8601) */
  createdAt: string;
  /** When the comment was last edited (ISO 8601) */
  updatedAt?: string | null;
  /** Email of an external reviewer who has no user record */
  externalAuthorEmail?: string | null;
  /** Internal user who wrote the comment */
  author?: {
    /** User ID */
    id: string;
    /** User email */
    email: string;
    /** User display name */
    name: string;
  } | null;
  /** Files attached to the comment */
  files?: {
    /** File ID */
    id: string;
  }[];
}

/**
 * Flatten one API comment into the shared {@link AssessmentComment} shape.
 * External reviewers arrive as a bare `externalAuthorEmail` rather than an
 * `author` record, so both spellings collapse into one author field.
 */
function toComment(
  comment: RawComment,
  level: AssessmentCommentLevel,
  targetId: string,
): AssessmentComment {
  return {
    id: comment.id,
    level,
    targetId,
    content: comment.content,
    author: comment.author
      ? { id: comment.author.id, email: comment.author.email, name: comment.author.name }
      : comment.externalAuthorEmail
        ? { email: comment.externalAuthorEmail }
        : undefined,
    parentCommentId: comment.parentCommentId ?? undefined,
    resolvedAt: comment.resolvedAt ?? undefined,
    fileCount: comment.files?.length || undefined,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt ?? undefined,
  };
}

function toComments(
  comments: RawComment[] | undefined,
  level: AssessmentCommentLevel,
  targetId: string,
): AssessmentComment[] | undefined {
  return comments?.map((c) => toComment(c, level, targetId));
}

/** Not-found for a form ID, pointing the caller at the tool that lists valid IDs. */
function assessmentNotFound(id: string): ToolError {
  return new ToolError(
    ErrorCode.NOT_FOUND,
    `No assessment form with id "${id}". Call assessments_list to find valid assessment IDs, ` +
      'or assessments_list_templates if you meant a template rather than a filled-in form.',
    false,
    { assessmentId: id },
  );
}

/**
 * Not-found for a section ID. Lists the sections the form does have, since the
 * caller reached here from a skeleton read and most likely mistyped or reused
 * an ID from a different form.
 */
function sectionNotFound(
  assessmentId: string,
  requested: string[],
  available: { id: string; title?: string | null }[],
): ToolError {
  return new ToolError(
    ErrorCode.NOT_FOUND,
    `None of the requested sectionIds exist on assessment "${assessmentId}". ` +
      'Call assessments_get without sectionIds to list the sections this form has.',
    false,
    {
      assessmentId,
      requestedSectionIds: requested,
      availableSections: available.map((s) => ({ id: s.id, title: s.title ?? undefined })),
    },
  );
}

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
  query AssessmentsList($first: Int, $offset: Int, $filterBy: AssessmentFormFiltersInput) {
    assessmentForms(first: $first, offset: $offset, filterBy: $filterBy) {
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

/**
 * Full form contents. Question comments ride along on the nested `comments`
 * field rather than the root `assessmentQuestionComments` query because
 * `AssessmentQuestionComment` carries no question ID, so a batched root query
 * cannot say which question each comment belongs to. The nested field takes no
 * pagination arguments, hence the `@include` guard: callers who did not ask for
 * comments must not pay for an unbounded list of them.
 */
const GetAssessmentDoc = graphql(/* GraphQL */ `
  query AssessmentsGet($ids: [ID!]!, $includeComments: Boolean!) {
    assessmentForms(first: 1, filterBy: { ids: $ids }) {
      nodes {
        id
        title
        description
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
            comments @include(if: $includeComments) {
              id
              content
              parentCommentId
              resolvedAt
              createdAt
              updatedAt
              externalAuthorEmail
              author {
                id
                email
                name
              }
              files {
                id
              }
            }
          }
        }
      }
    }
  }
`);

/**
 * Section index for a form: everything except question bodies. `questions { id }`
 * is only there to count them — a real form runs to hundreds of questions and
 * tens of thousands of characters, which is why this is the default read.
 */
const GetAssessmentSkeletonDoc = graphql(/* GraphQL */ `
  query AssessmentsGetSkeleton($ids: [ID!]!) {
    assessmentForms(first: 1, filterBy: { ids: $ids }) {
      nodes {
        id
        title
        description
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
          }
        }
      }
    }
  }
`);

/**
 * The three comment levels are separate root queries because only
 * `AssessmentQuestionRaw` exposes a nested `comments` field, and that nested
 * field takes no pagination arguments. Going through the root queries is the
 * only way to bound how many comments a call returns, and it is also what lets
 * question comments be read from their ids rather than by expanding a section.
 *
 * None of them can filter on resolution: `resolvedAt` is a returned field, not
 * a filter input. Callers asking for open comments only are served by filtering
 * what comes back.
 */
const ListFormCommentsDoc = graphql(/* GraphQL */ `
  query AssessmentsListFormComments($first: Int, $offset: Int, $formIds: [ID!], $authorIds: [ID!]) {
    assessmentFormComments(
      first: $first
      offset: $offset
      filterBy: { assessmentFormIds: $formIds, authorIds: $authorIds }
    ) {
      nodes {
        id
        content
        parentCommentId
        resolvedAt
        createdAt
        updatedAt
        externalAuthorEmail
        author {
          id
          email
          name
        }
        files {
          id
        }
      }
      totalCount
    }
  }
`);

const ListSectionCommentsDoc = graphql(/* GraphQL */ `
  query AssessmentsListSectionComments(
    $first: Int
    $offset: Int
    $sectionIds: [ID!]
    $authorIds: [ID!]
  ) {
    assessmentSectionComments(
      first: $first
      offset: $offset
      filterBy: { assessmentSectionIds: $sectionIds, authorIds: $authorIds }
    ) {
      nodes {
        id
        content
        assessmentSectionId
        parentCommentId
        resolvedAt
        createdAt
        updatedAt
        externalAuthorEmail
        author {
          id
          email
          name
        }
        files {
          id
        }
      }
      totalCount
    }
  }
`);

/**
 * Question comments come through the form rather than the `assessmentQuestionComments`
 * root query, because that root query returns no back-reference to the question
 * a comment sits on — batching ids into it would answer "what feedback exists"
 * while losing "on which question". This asks for question id, title and
 * comments only, so it carries none of the answer text that makes a full form
 * read expensive.
 */
/**
 * Ids of everything on a form that can carry a comment. Small enough to fetch
 * alongside a form read, and it is what lets comment totals be counted without
 * pulling a single comment body.
 */
const CommentTargetsDoc = graphql(/* GraphQL */ `
  query AssessmentsCommentTargets($ids: [ID!]!) {
    assessmentForms(first: 1, filterBy: { ids: $ids }) {
      nodes {
        id
        sections {
          id
          questions {
            id
          }
        }
      }
    }
  }
`);

/** Comment totals per level, read from `totalCount` without fetching bodies. */
const CountFormCommentsDoc = graphql(/* GraphQL */ `
  query AssessmentsCountFormComments($formIds: [ID!]) {
    assessmentFormComments(first: 1, filterBy: { assessmentFormIds: $formIds }) {
      totalCount
    }
  }
`);

const CountSectionCommentsDoc = graphql(/* GraphQL */ `
  query AssessmentsCountSectionComments($sectionIds: [ID!]) {
    assessmentSectionComments(first: 1, filterBy: { assessmentSectionIds: $sectionIds }) {
      totalCount
    }
  }
`);

const CountQuestionCommentsDoc = graphql(/* GraphQL */ `
  query AssessmentsCountQuestionComments($questionIds: [ID!]) {
    assessmentQuestionComments(first: 1, filterBy: { assessmentQuestionIds: $questionIds }) {
      totalCount
    }
  }
`);

const ListQuestionCommentsDoc = graphql(/* GraphQL */ `
  query AssessmentsListQuestionComments($ids: [ID!]!) {
    assessmentForms(first: 1, filterBy: { ids: $ids }) {
      nodes {
        sections {
          id
          questions {
            id
            title
            comments {
              id
              content
              parentCommentId
              resolvedAt
              createdAt
              updatedAt
              externalAuthorEmail
              author {
                id
                email
                name
              }
              files {
                id
              }
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
  query AssessmentsListGroups($first: Int, $offset: Int) {
    assessmentGroups(first: $first, offset: $offset) {
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
  query AssessmentsListTemplates($first: Int, $offset: Int) {
    assessmentFormTemplates(first: $first, offset: $offset) {
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
    const offset = options?.offset ?? 0;
    const data = await this.makeRequest(ListAssessmentsDoc, {
      first: Math.min(options?.first ?? 50, 100),
      offset,
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
      pageInfo: derivePageInfo({
        offset,
        nodeCount: data.assessmentForms.nodes.length,
        totalCount: data.assessmentForms.totalCount,
      }),
      totalCount: data.assessmentForms.totalCount,
    };
  }

  /**
   * Section index for a form: metadata plus one row per section with a question
   * count, and no question bodies. This is the cheap read that lets a caller
   * decide which sections are worth expanding.
   */
  async getAssessmentSkeleton(id: string): Promise<Assessment> {
    const data = await this.makeRequest(GetAssessmentSkeletonDoc, { ids: [id] });
    const node = data.assessmentForms.nodes[0];
    if (!node) {
      throw assessmentNotFound(id);
    }
    return {
      id: node.id,
      title: node.title,
      description: node.description ?? undefined,
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
        questionCount: section.questions?.length ?? 0,
      })),
    };
  }

  /**
   * Full form contents, optionally narrowed to specific sections. `sectionIds`
   * filters after the fetch because neither `sections` nor `questions` accepts
   * pagination arguments in the API — the narrowing exists to bound what the
   * caller has to read, not what the server has to send.
   */
  async getAssessment(
    id: string,
    options: {
      /** Restrict the returned sections to these IDs. Omit for every section. */
      sectionIds?: string[];
      /** Fetch the comments attached to each question. */
      includeComments?: boolean;
    } = {},
  ): Promise<Assessment> {
    const includeComments = options.includeComments ?? false;
    const data = await this.makeRequest(GetAssessmentDoc, { ids: [id], includeComments });
    const node = data.assessmentForms.nodes[0];
    if (!node) {
      throw assessmentNotFound(id);
    }
    const wanted = options.sectionIds?.length ? new Set(options.sectionIds) : undefined;
    const sections = (node.sections ?? []).filter((s) => !wanted || wanted.has(s.id));
    if (wanted && sections.length === 0) {
      throw sectionNotFound(id, options.sectionIds ?? [], node.sections ?? []);
    }
    return {
      id: node.id,
      title: node.title,
      description: node.description ?? undefined,
      status: node.status as Assessment['status'],
      dueDate: node.dueDate ?? undefined,
      submittedAt: node.submittedAt ?? undefined,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt ?? undefined,
      assessmentGroupId: node.assessmentGroup?.id,
      sections: sections.map((section) => ({
        id: section.id,
        title: section.title ?? undefined,
        index: section.index ?? undefined,
        status: section.status ?? undefined,
        questionCount: section.questions?.length ?? 0,
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
          comments: 'comments' in q ? toComments(q.comments, 'QUESTION', q.id) : undefined,
        })),
      })),
    };
  }

  /** Comments left on the form as a whole, newest page first. */
  async listAssessmentFormComments(
    formId: string,
    options: { first?: number; offset?: number; authorIds?: string[] } = {},
  ): Promise<{ nodes: AssessmentComment[]; totalCount: number }> {
    const data = await this.makeRequest(ListFormCommentsDoc, {
      formIds: [formId],
      authorIds: options.authorIds,
      first: Math.min(options.first ?? 50, 100),
      offset: options.offset ?? 0,
    });
    return {
      nodes: data.assessmentFormComments.nodes.map((c) => toComment(c, 'FORM', formId)),
      totalCount: data.assessmentFormComments.totalCount,
    };
  }

  /** Comments left on specific sections of a form. */
  async listAssessmentSectionComments(
    sectionIds: string[],
    options: { first?: number; offset?: number; authorIds?: string[] } = {},
  ): Promise<{ nodes: AssessmentComment[]; totalCount: number }> {
    if (sectionIds.length === 0) return { nodes: [], totalCount: 0 };
    const data = await this.makeRequest(ListSectionCommentsDoc, {
      sectionIds,
      authorIds: options.authorIds,
      first: Math.min(options.first ?? 50, 100),
      offset: options.offset ?? 0,
    });
    return {
      nodes: data.assessmentSectionComments.nodes.map((c) =>
        toComment(c, 'SECTION', c.assessmentSectionId),
      ),
      totalCount: data.assessmentSectionComments.totalCount,
    };
  }

  /**
   * Every comment left on a question of this form, each carrying the question
   * it sits on. Unpaginated at the API — the nested `comments` field takes no
   * paging arguments — so callers page the merged result themselves.
   */
  async listAssessmentQuestionComments(formId: string): Promise<{
    /** The comments, tagged with their question */
    nodes: AssessmentComment[];
    /** Question title by question id, so a comment can name its question */
    questionTitles: Record<string, string>;
    /** Sections of the form, so section comments can be read in the same pass */
    sectionIds: string[];
  }> {
    const data = await this.makeRequest(ListQuestionCommentsDoc, { ids: [formId] });
    const node = data.assessmentForms.nodes[0];
    if (!node) {
      throw assessmentNotFound(formId);
    }
    const sections = node.sections ?? [];
    const questions = sections.flatMap((section) => section.questions ?? []);
    return {
      nodes: questions.flatMap(
        (question) => toComments(question.comments, 'QUESTION', question.id) ?? [],
      ),
      questionTitles: Object.fromEntries(questions.map((q) => [q.id, q.title])),
      sectionIds: sections.map((section) => section.id),
    };
  }

  /**
   * How many comments sit at each level of a form, without fetching any of
   * them. Lets a form read say that feedback exists, and how much, for the
   * price of counts rather than bodies.
   */
  async countAssessmentComments(formId: string): Promise<Record<AssessmentCommentLevel, number>> {
    const targets = await this.makeRequest(CommentTargetsDoc, { ids: [formId] });
    const node = targets.assessmentForms.nodes[0];
    if (!node) {
      throw assessmentNotFound(formId);
    }
    const sectionIds = (node.sections ?? []).map((section) => section.id);
    const questionIds = (node.sections ?? []).flatMap((section) =>
      (section.questions ?? []).map((question) => question.id),
    );
    const [form, section, question] = await Promise.all([
      this.makeRequest(CountFormCommentsDoc, { formIds: [formId] }),
      sectionIds.length > 0 ? this.makeRequest(CountSectionCommentsDoc, { sectionIds }) : undefined,
      questionIds.length > 0
        ? this.makeRequest(CountQuestionCommentsDoc, { questionIds })
        : undefined,
    ]);
    return {
      FORM: form.assessmentFormComments.totalCount,
      SECTION: section?.assessmentSectionComments.totalCount ?? 0,
      QUESTION: question?.assessmentQuestionComments.totalCount ?? 0,
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
    const offset = options?.offset ?? 0;
    const data = await this.makeRequest(ListAssessmentGroupsDoc, {
      first: Math.min(options?.first ?? 50, 100),
      offset,
    });
    return {
      nodes: data.assessmentGroups.nodes.map((node) => ({
        id: node.id,
        title: node.title,
        assessmentFormTemplate: node.assessmentFormTemplate
          ? { id: node.assessmentFormTemplate.id, title: node.assessmentFormTemplate.title }
          : undefined,
      })),
      pageInfo: derivePageInfo({
        offset,
        nodeCount: data.assessmentGroups.nodes.length,
        totalCount: data.assessmentGroups.totalCount,
      }),
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
    const offset = options?.offset ?? 0;
    const data = await this.makeRequest(ListAssessmentTemplatesDoc, {
      first: Math.min(options?.first ?? 50, 100),
      offset,
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
      pageInfo: derivePageInfo({
        offset,
        nodeCount: data.assessmentFormTemplates.nodes.length,
        totalCount: data.assessmentFormTemplates.totalCount,
      }),
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
