/**
 * Hello World MCP App view.
 *
 * Bundled into a single HTML resource by `scripts/build-hello-world-app.mjs`.
 *
 * Prefers picture-in-picture (then fullscreen) so hosts like Cursor are more
 * likely to keep the View visible outside a collapsed inline tool card.
 */
import { App, type McpUiDisplayMode, type McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/** Prefer modes that stay visible while chatting; inline is last resort. */
const PREFERRED_DISPLAY_MODES: McpUiDisplayMode[] = ['pip', 'fullscreen'];

function extractGreeting(result: CallToolResult): string {
  const text = result.content?.find((c) => c.type === 'text')?.text;
  if (!text) return '[ERROR]';
  try {
    const parsed = JSON.parse(text) as {
      data?: { greeting?: string };
      greeting?: string;
    };
    return parsed.data?.greeting ?? parsed.greeting ?? text;
  } catch {
    return text;
  }
}

function pickPreferredMode(ctx: McpUiHostContext | undefined): McpUiDisplayMode | undefined {
  const available = ctx?.availableDisplayModes ?? [];
  return PREFERRED_DISPLAY_MODES.find((mode) => available.includes(mode));
}

function updateModeLabel(mode: McpUiDisplayMode | undefined): void {
  const modeEl = document.getElementById('display-mode');
  if (modeEl) {
    modeEl.textContent = mode ?? 'unknown';
  }
}

const greetingEl = document.getElementById('greeting')!;
const refreshBtn = document.getElementById('refresh') as HTMLButtonElement;
const keepOpenBtn = document.getElementById('keep-open') as HTMLButtonElement | null;

const app = new App(
  { name: 'Assessments Hello World', version: '1.0.0' },
  { availableDisplayModes: ['pip', 'fullscreen', 'inline'] },
);

app.ontoolresult = (result) => {
  greetingEl.textContent = extractGreeting(result);
};

app.onhostcontextchanged = (ctx) => {
  updateModeLabel(ctx.displayMode);
  const preferred = pickPreferredMode(ctx);
  if (keepOpenBtn) {
    keepOpenBtn.hidden = !preferred || ctx.displayMode === preferred;
  }
};

app.onerror = console.error;

async function requestPersistentDisplayMode(): Promise<void> {
  const ctx = app.getHostContext();
  const preferred = pickPreferredMode(ctx);
  if (!preferred || ctx?.displayMode === preferred) {
    updateModeLabel(ctx?.displayMode);
    return;
  }
  try {
    const result = await app.requestDisplayMode({ mode: preferred });
    updateModeLabel(result.mode);
  } catch (error) {
    console.error('requestDisplayMode failed:', error);
  }
}

refreshBtn.addEventListener('click', async () => {
  try {
    greetingEl.textContent = 'Loading…';
    const result = await app.callServerTool({
      name: 'hello_world',
      arguments: {},
    });
    greetingEl.textContent = extractGreeting(result);
  } catch (error) {
    console.error(error);
    greetingEl.textContent = '[ERROR]';
  }
});

keepOpenBtn?.addEventListener('click', () => {
  void requestPersistentDisplayMode();
});

void app.connect().then(async () => {
  updateModeLabel(app.getHostContext()?.displayMode);
  // Ask the host for a persistent mode as soon as the View mounts. Hosts may
  // ignore this (especially without a user gesture); the Keep open button is
  // the fallback that satisfies gesture requirements.
  await requestPersistentDisplayMode();
});
