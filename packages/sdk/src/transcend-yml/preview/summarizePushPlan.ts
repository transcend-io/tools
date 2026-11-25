import { PreviewItemAction } from './enums.js';
import type { PushPlan } from './types.js';

const MAX_RESOURCE_LINES = 12;
const MAX_ITEM_LABELS = 3;

function itemLine(resource: string, action: string, label: string, fields: string[]): string {
  const fieldPart =
    fields.length > 0 ? ` (${fields.slice(0, 4).join(', ')}${fields.length > 4 ? ', …' : ''})` : '';
  return `${resource}: ${action} ${JSON.stringify(label)}${fieldPart}`;
}

/**
 * Short multi-line summary for confirmation prompts and tool results.
 *
 * @param plan - Push plan from {@link planPush}
 * @returns Plain-text summary
 */
export function summarizePushPlan(plan: PushPlan): string {
  const { create, update, unchanged, skipped, effects } = plan.summary;
  const lines: string[] = [
    `Push preview: ${create} to create, ${update} to update, ${unchanged} unchanged${
      skipped > 0 ? `, ${skipped} skipped` : ''
    }${effects > 0 ? `, ${effects} side effect${effects === 1 ? '' : 's'}` : ''}.`,
  ];

  let resourceLines = 0;
  for (const { resource, items } of plan.resources) {
    if (resourceLines >= MAX_RESOURCE_LINES) {
      lines.push('…more resources with changes');
      break;
    }
    const changed = items.filter(
      (item) =>
        item.action === PreviewItemAction.Create ||
        item.action === PreviewItemAction.Update ||
        item.action === PreviewItemAction.Skipped,
    );
    if (changed.length === 0) continue;

    const shown = changed.slice(0, MAX_ITEM_LABELS);
    for (const item of shown) {
      const action =
        item.action === PreviewItemAction.Create
          ? 'create'
          : item.action === PreviewItemAction.Update
            ? 'update'
            : 'skip';
      lines.push(
        itemLine(
          resource,
          action,
          String(item.label),
          item.fields.map((f) => f.path),
        ),
      );
      resourceLines++;
      if (resourceLines >= MAX_RESOURCE_LINES) break;
    }
    if (changed.length > shown.length) {
      lines.push(`${resource}: and ${changed.length - shown.length} more`);
      resourceLines++;
    }
  }

  for (const effect of plan.effects.slice(0, 5)) {
    lines.push(effect.description);
  }
  if (plan.effects.length > 5) {
    lines.push(`…and ${plan.effects.length - 5} more side effects`);
  }

  if (plan.warnings.length > 0) {
    lines.push(
      `${plan.warnings.length} warning${plan.warnings.length === 1 ? '' : 's'} (run config_preview_push for full detail).`,
    );
  }

  return lines.join('\n');
}
