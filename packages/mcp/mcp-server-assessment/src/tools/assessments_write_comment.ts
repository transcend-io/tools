import {
  createToolResult,
  defineTool,
  ErrorCode,
  ToolError,
  z,
  type AssessmentComment,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';
import { buildAssessmentLinks } from '../helpers/buildAssessmentLinks.js';

const AssessmentCommentLevelEnum = z.enum(['FORM', 'SECTION', 'QUESTION']);

export const WriteAssessmentCommentSchema = z.object({
  assessmentId: z
    .string()
    .describe(
      'Assessment form id (from assessments_list). Dashboard link; FORM edit/resolve ' +
        'defaults targetId to this when omitted.',
    ),
  content: z
    .string()
    .optional()
    .describe('Comment body. Required to create or reply; omit when only resolving via commentId.'),
  level: AssessmentCommentLevelEnum.describe(
    'FORM, SECTION, or QUESTION — from the assessments_list_comments row.',
  ),
  targetId: z
    .string()
    .optional()
    .describe(
      'Form, section, or question id (list row targetId). Required to create/reply; required ' +
        'for QUESTION edit/resolve; FORM defaults to assessmentId.',
    ),
  parentCommentId: z
    .string()
    .optional()
    .describe(
      'Comment to reply to. Not with commentId. With resolved true, closes that parent after reply.',
    ),
  commentId: z
    .string()
    .optional()
    .describe('Existing comment to edit and/or resolve (id from assessments_list_comments).'),
  resolved: z
    .boolean()
    .optional()
    .describe(
      'true to resolve, false to reopen. Needs commentId, or parentCommentId when replying.',
    ),
});
export type WriteAssessmentCommentInput = z.infer<typeof WriteAssessmentCommentSchema>;

export function createAssessmentsWriteCommentTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  const { dashboardUrl } = clients;
  return defineTool({
    name: 'assessments_write_comment',
    description:
      'Leave, reply to, edit, or resolve reviewer feedback on an assessment — form, section, ' +
      'or question, matching assessments_list_comments rows. Pass parentCommentId to reply, ' +
      'commentId to edit, resolved to close or reopen, or reply with resolved true to close ' +
      'the parent thread. Call assessments_list_comments first for id, level, and targetId.',
    category: 'Assessments',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: WriteAssessmentCommentSchema,
    handler: async ({
      assessmentId,
      content,
      level,
      targetId,
      parentCommentId,
      commentId,
      resolved,
    }) => {
      const links = buildAssessmentLinks({ dashboardUrl, assessmentFormId: assessmentId });

      const resolveTargetId = (
        forQuestion: boolean,
        action: 'editing' | 'resolving',
      ): string | undefined => {
        const resolvedTargetId = targetId ?? (level === 'FORM' ? assessmentId : undefined);
        if (forQuestion && level === 'QUESTION' && resolvedTargetId === undefined) {
          throw new ToolError(
            ErrorCode.VALIDATION_ERROR,
            `targetId is required when ${action} a QUESTION comment. Pass the question id ` +
              'from assessments_list_comments (the row targetId).',
            false,
            { level, commentId, parentCommentId },
          );
        }
        return resolvedTargetId;
      };

      if (commentId !== undefined) {
        if (parentCommentId !== undefined) {
          throw new ToolError(
            ErrorCode.VALIDATION_ERROR,
            'Pass either commentId (to edit or resolve) or parentCommentId (to reply), not both. ' +
              'Call assessments_list_comments for the comment id and its level/targetId.',
            false,
            { commentId, parentCommentId },
          );
        }
        if (content === undefined && resolved === undefined) {
          throw new ToolError(
            ErrorCode.VALIDATION_ERROR,
            'When commentId is set, pass content to edit the comment, resolved to close or ' +
              'reopen it, or both. Call assessments_list_comments for the comment id.',
            false,
            { commentId, level },
          );
        }

        let comment: AssessmentComment | undefined;
        if (content !== undefined) {
          comment = await graphql.updateAssessmentComment({
            level,
            commentId,
            content,
            targetId: resolveTargetId(true, 'editing'),
          });
        }
        if (resolved !== undefined) {
          comment = await graphql.resolveAssessmentComment({
            level,
            commentId,
            isResolved: resolved,
            targetId: resolveTargetId(true, 'resolving'),
          });
        }

        const parts: string[] = [];
        if (content !== undefined) parts.push('updated');
        if (resolved === true) parts.push('resolved');
        if (resolved === false) parts.push('reopened');
        return createToolResult(true, {
          assessmentId,
          ...links,
          comment,
          message: `Comment ${parts.join(' and ')}. View the assessment at ${links.url}`,
        });
      }

      if (resolved !== undefined && parentCommentId === undefined) {
        throw new ToolError(
          ErrorCode.VALIDATION_ERROR,
          'resolved requires commentId (to close or reopen that comment) or parentCommentId ' +
            '(to reply and then close that parent thread). Call assessments_list_comments for ids.',
          false,
          { level, resolved },
        );
      }

      if (content === undefined) {
        throw new ToolError(
          ErrorCode.VALIDATION_ERROR,
          'content is required when creating or replying to a comment. To only resolve or ' +
            'reopen, pass commentId with resolved instead.',
          false,
          { level, assessmentId },
        );
      }

      if (targetId === undefined) {
        throw new ToolError(
          ErrorCode.VALIDATION_ERROR,
          'targetId is required when creating or replying to a comment. Pass the form, ' +
            'section, or question id from assessments_list_comments (the row targetId). ' +
            'For a new FORM comment, targetId is the same as assessmentId.',
          false,
          { level, assessmentId },
        );
      }

      const comment = await graphql.createAssessmentComment({
        level,
        targetId,
        content,
        parentCommentId,
      });

      if (resolved !== undefined && parentCommentId !== undefined) {
        await graphql.resolveAssessmentComment({
          level,
          commentId: parentCommentId,
          isResolved: resolved,
          targetId: resolveTargetId(true, 'resolving'),
        });
        const closeOrReopen = resolved ? 'resolved' : 'reopened';
        return createToolResult(true, {
          assessmentId,
          ...links,
          comment,
          message:
            `Reply posted and parent thread ${closeOrReopen}. ` +
            `View the assessment at ${links.url}`,
        });
      }

      const action = parentCommentId !== undefined ? 'Reply posted' : 'Comment created';
      return createToolResult(true, {
        assessmentId,
        ...links,
        comment,
        message: `${action}. View the assessment at ${links.url}`,
      });
    },
  });
}
