import { App } from '@modelcontextprotocol/ext-apps';

const headingEl = document.getElementById('heading')!;
const titleInputEl = document.getElementById('title-input') as HTMLInputElement;
const groupSelectEl = document.getElementById('group-select') as HTMLSelectElement;
const assigneeSelectEl = document.getElementById('assignee-select') as HTMLSelectElement;
const confirmBtn = document.getElementById('confirm-btn') as HTMLButtonElement;
const statusEl = document.getElementById('status')!;

const app = new App({ name: 'Assessment Create Form', version: '1.0.0' });

let confirmationToken: string | null = null;
let groupsLoaded = false;
let usersLoaded = false;

interface FormContext {
  confirmationToken?: string;
  suggestedTitle?: string;
  suggestedAssessmentGroupId?: string;
  suggestedAssigneeId?: string;
}

interface ToolPayload {
  success?: boolean;
  data?: unknown;
  error?: string;
}

function setStatus(message: string, kind: 'info' | 'error' | 'success' = 'info') {
  statusEl.textContent = message;
  statusEl.className = kind === 'info' ? '' : kind;
}

function parseToolJson(result: {
  content?: Array<{ type: string; text?: string }>;
}): ToolPayload | null {
  const text = result.content?.find((c) => c.type === 'text')?.text;
  if (!text) return null;
  try {
    return JSON.parse(text) as ToolPayload;
  } catch {
    return null;
  }
}

function updateConfirmButtonState() {
  const title = titleInputEl.value.trim();
  const groupId = groupSelectEl.value;
  const assigneeId = assigneeSelectEl.value;
  confirmBtn.disabled =
    !groupsLoaded || !usersLoaded || !confirmationToken || !title || !groupId || !assigneeId;
}

function getMergedSuggestions(): FormContext {
  return {
    suggestedTitle: toolInputSuggestions.suggestedTitle ?? serverSuggestions.suggestedTitle,
    suggestedAssessmentGroupId:
      toolInputSuggestions.suggestedAssessmentGroupId ??
      serverSuggestions.suggestedAssessmentGroupId,
    suggestedAssigneeId:
      toolInputSuggestions.suggestedAssigneeId ?? serverSuggestions.suggestedAssigneeId,
  };
}

function applySingleOptionDefaults() {
  const groupOptions = [...groupSelectEl.options].filter((option) => option.value);
  if (!groupSelectEl.value && groupOptions.length === 1) {
    groupSelectEl.value = groupOptions[0]!.value;
  }

  const userOptions = [...assigneeSelectEl.options].filter((option) => option.value);
  if (!assigneeSelectEl.value && userOptions.length === 1) {
    assigneeSelectEl.value = userOptions[0]!.value;
  }
}

function applySuggestions(suggestions: {
  suggestedTitle?: string;
  suggestedAssessmentGroupId?: string;
  suggestedAssigneeId?: string;
}) {
  if (suggestions.suggestedTitle && !titleInputEl.value) {
    titleInputEl.value = suggestions.suggestedTitle;
  }
  if (
    suggestions.suggestedAssessmentGroupId &&
    [...groupSelectEl.options].some((o) => o.value === suggestions.suggestedAssessmentGroupId)
  ) {
    groupSelectEl.value = suggestions.suggestedAssessmentGroupId;
  }
  if (
    suggestions.suggestedAssigneeId &&
    [...assigneeSelectEl.options].some((o) => o.value === suggestions.suggestedAssigneeId)
  ) {
    assigneeSelectEl.value = suggestions.suggestedAssigneeId;
  }

  applySingleOptionDefaults();
  updateConfirmButtonState();
}

function applyAllSuggestions() {
  applySuggestions(getMergedSuggestions());
}

async function loadFormContext(): Promise<FormContext | null> {
  try {
    const result = await app.callServerTool({
      name: 'assessments_get_create_form_context',
      arguments: {},
    });
    const payload = parseToolJson(result);
    if (!payload?.success || !payload.data || typeof payload.data !== 'object') {
      return null;
    }
    return payload.data as FormContext;
  } catch {
    return null;
  }
}

async function refreshServerSuggestions(maxAttempts = 12, delayMs = 250): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const context = await loadFormContext();
    if (!context) continue;

    if (context.confirmationToken) {
      confirmationToken = context.confirmationToken;
    }

    serverSuggestions = {
      suggestedTitle: context.suggestedTitle,
      suggestedAssessmentGroupId: context.suggestedAssessmentGroupId,
      suggestedAssigneeId: context.suggestedAssigneeId,
    };
    applyAllSuggestions();
  }
}

async function loadGroups(): Promise<void> {
  const result = await app.callServerTool({
    name: 'assessments_list_groups',
    arguments: { limit: 100 },
  });
  const payload = parseToolJson(result) as {
    success?: boolean;
    data?: Array<{ id: string; title?: string; assessmentFormTemplate?: { title?: string } }>;
    error?: string;
  } | null;

  if (!payload?.success || !Array.isArray(payload.data)) {
    setStatus(payload?.error ?? 'Failed to load assessment groups.', 'error');
    return;
  }

  groupSelectEl.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Choose a group…';
  groupSelectEl.appendChild(placeholder);

  for (const group of payload.data) {
    const option = document.createElement('option');
    option.value = group.id;
    option.textContent = formatGroupLabel(group);
    groupSelectEl.appendChild(option);
  }

  groupSelectEl.disabled = false;
  groupsLoaded = true;
  applyAllSuggestions();
}

function formatGroupLabel(group: {
  title?: string;
  assessmentFormTemplate?: { title?: string };
}): string {
  const groupTitle = group.title?.trim() || 'Untitled group';
  const templateTitle = group.assessmentFormTemplate?.title?.trim();
  return templateTitle ? `${groupTitle} (${templateTitle} template)` : groupTitle;
}

async function loadUsers(): Promise<void> {
  const result = await app.callServerTool({
    name: 'admin_list_users',
    arguments: { limit: 100 },
  });
  const payload = parseToolJson(result) as {
    success?: boolean;
    data?: Array<{ id: string; email?: string; name?: string }>;
    error?: string;
  } | null;

  if (!payload?.success || !Array.isArray(payload.data)) {
    setStatus(payload?.error ?? 'Failed to load users.', 'error');
    return;
  }

  assigneeSelectEl.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Choose a user…';
  assigneeSelectEl.appendChild(placeholder);

  for (const user of payload.data) {
    const option = document.createElement('option');
    option.value = user.id;
    option.textContent = user.name?.trim() || user.email || user.id;
    assigneeSelectEl.appendChild(option);
  }

  assigneeSelectEl.disabled = false;
  usersLoaded = true;
  applyAllSuggestions();
}

let toolInputSuggestions: FormContext = {};
let serverSuggestions: FormContext = {};

app.ontoolinput = (params) => {
  const args = params.arguments ?? {};
  if (typeof args.suggested_title === 'string') {
    toolInputSuggestions.suggestedTitle = args.suggested_title;
  }
  if (typeof args.suggested_assessment_group_id === 'string') {
    toolInputSuggestions.suggestedAssessmentGroupId = args.suggested_assessment_group_id;
  }
  if (typeof args.suggested_assignee_id === 'string') {
    toolInputSuggestions.suggestedAssigneeId = args.suggested_assignee_id;
  }
  if (
    typeof toolInputSuggestions.suggestedTitle === 'string' &&
    toolInputSuggestions.suggestedTitle.length > 0
  ) {
    headingEl.textContent = `Create assessment: ${toolInputSuggestions.suggestedTitle}`;
  }

  applyAllSuggestions();
};

app.ontoolresult = (params) => {
  if (params.isError) {
    setStatus('Operation failed. Check the chat for details.', 'error');
    return;
  }
  const payload = parseToolJson({ content: params.content }) as {
    data?: { message?: string };
  } | null;
  const message = payload?.data?.message ?? 'Assessment created successfully.';
  setStatus(message, 'success');
  confirmBtn.disabled = true;
  titleInputEl.disabled = true;
  groupSelectEl.disabled = true;
  assigneeSelectEl.disabled = true;
};

titleInputEl.addEventListener('input', updateConfirmButtonState);
groupSelectEl.addEventListener('change', updateConfirmButtonState);
assigneeSelectEl.addEventListener('change', updateConfirmButtonState);

confirmBtn.addEventListener('click', async () => {
  const title = titleInputEl.value.trim();
  const groupId = groupSelectEl.value;
  const assigneeId = assigneeSelectEl.value;

  if (!title || !groupId || !assigneeId || !confirmationToken) {
    setStatus('Please fill in all fields.', 'error');
    return;
  }

  confirmBtn.disabled = true;
  setStatus('Creating assessment…');

  try {
    const result = await app.callServerTool({
      name: 'assessments_confirm_create',
      arguments: {
        title,
        assessment_group_id: groupId,
        assignee_ids: [assigneeId],
        confirmation_token: confirmationToken,
      },
    });
    const payload = parseToolJson(result);
    if (!payload?.success) {
      setStatus(payload?.error ?? 'Failed to create assessment.', 'error');
      updateConfirmButtonState();
      return;
    }
    setStatus('Assessment created. Finishing…');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), 'error');
    updateConfirmButtonState();
  }
});

app
  .connect()
  .then(async () => {
    titleInputEl.disabled = false;

    const [, context] = await Promise.all([
      Promise.all([loadGroups(), loadUsers()]),
      (async () => {
        for (let attempt = 0; attempt < 20; attempt += 1) {
          const loadedContext = await loadFormContext();
          if (loadedContext?.confirmationToken) {
            return loadedContext;
          }
          if (attempt < 19) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
        return null;
      })(),
    ]);

    if (context?.confirmationToken) {
      confirmationToken = context.confirmationToken;
    }
    serverSuggestions = {
      suggestedTitle: context?.suggestedTitle,
      suggestedAssessmentGroupId: context?.suggestedAssessmentGroupId,
      suggestedAssigneeId: context?.suggestedAssigneeId,
    };

    applyAllSuggestions();
    void refreshServerSuggestions();

    if (!confirmationToken) {
      setStatus('Waiting for create form context…', 'error');
      return;
    }

    setStatus('Review the fields and click Confirm to create the assessment.');
    updateConfirmButtonState();
  })
  .catch((error) => {
    setStatus(error instanceof Error ? error.message : String(error), 'error');
  });
