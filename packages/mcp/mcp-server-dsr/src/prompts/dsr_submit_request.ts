import type { PromptDefinition } from '@transcend-io/mcp-server-base';

export const dsrSubmitRequestPrompt: PromptDefinition = {
  name: 'dsr-submit-request',
  description:
    'Submit a Data Subject Request safely: list workflows, pick a published config by ' +
    'action/subject type, submit, then poll status. Prefer unique test emails for silent ACCESS.',
  arguments: [
    {
      name: 'action_type',
      description: 'Desired workflow action type, e.g. ACCESS or ERASURE (default: ACCESS)',
      required: false,
    },
    {
      name: 'email',
      description: 'Data subject email (default: a unique test+mcp…@example.com address)',
      required: false,
    },
    {
      name: 'is_silent',
      description: 'Whether to suppress subject emails: "true" or "false" (default: true)',
      required: false,
    },
  ],
  handler: (args) => {
    const actionType = (args.action_type || 'ACCESS').toUpperCase();
    const email = args.email || 'test+mcp@example.com';
    const isSilent = (args.is_silent || 'true').toLowerCase() !== 'false';

    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text:
            `Submit a silent=${isSilent} ${actionType} Data Subject Request for ${email}. ` +
            'Use published workflows only.',
        },
      },
      {
        role: 'assistant',
        content: {
          type: 'text',
          text: `I'll submit a DSR using the MCP workflow chain:

## 1. Discover workflow configs

Call \`workflows_list\` and pick a row where:
- \`actionType\` matches **${actionType}** (or the closest published equivalent)
- Prefer a published / privacy-center-visible config when \`workflowConfigVisibility\` is present

Use that row's \`id\` as \`workflowConfigId\`. Do **not** invent type/subjectType — they come from the workflow.

## 2. Submit

Call \`dsr_submit\` with:
- \`workflowConfigId\`: id from step 1
- \`email\`: ${email}
- \`isSilent\`: ${isSilent}

If the API says the request already exists, use a unique email (e.g. \`test+mcp-<timestamp>@example.com\`) and retry.

## 3. Poll

Call \`dsr_poll_status\` with the returned request id. Optionally call \`dsr_list_identifiers\` on the same id.

## 4. Respond / enrich (only if needed)

- Nonces are Sombra-signed JWTs — never invent them.
- Call \`dsr_list_pending_requests\` with the data silo id and ACCESS/ERASURE, then pass the pending item's **\`nonce\`** field into \`dsr_respond_access\` / \`dsr_respond_erasure\` / enrich. Auth must be a Transcend API key associated with that data silo (Admin → API Keys → linked Data Silos); OAuth-only is not enough.
- Do **not** use \`encryptedCekContext\` (or other payload fields) as the nonce.
- Enrichment-stage nonces are not interchangeable with fulfillment respond nonces.
- Enrich alternate (no nonce): \`requestId\` + \`enricherId\` on \`dsr_enrich_identifiers\` only.

Confirm the chosen workflow (id, actionType, subjectType) with the user before submitting if anything is ambiguous.`,
        },
      },
    ];
  },
};
