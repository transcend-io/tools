import type { FieldChange, ItemPlan, PushPlan } from './types.js';

const MAX_VALUE_LENGTH = 70;

function truncate(text: string): string {
  return text.length > MAX_VALUE_LENGTH ? `${text.slice(0, MAX_VALUE_LENGTH - 3)}...` : text;
}

/**
 * Short, single-line form of a value for the preview.
 *
 * @param value - Any value
 * @returns Display text
 */
export function formatValue(value: unknown): string {
  if (value === undefined) {
    return '(not set)';
  }
  if (typeof value === 'string') {
    return truncate(JSON.stringify(value));
  }
  return truncate(JSON.stringify(value) ?? String(value));
}

const isScalarList = (value: unknown): value is (string | number | boolean)[] =>
  Array.isArray(value) && value.every((entry) => typeof entry !== 'object' || entry === null);

function describeChange(change: FieldChange): string {
  if (change.kind === 'added') {
    return `+ ${change.path}`;
  }
  const { before, after } = change;
  if (isScalarList(after) && (before === undefined || isScalarList(before))) {
    const previous = new Set((before ?? []).map(String));
    const next = new Set(after.map(String));
    const added = [...next].filter((entry) => !previous.has(entry));
    const removed = [...previous].filter((entry) => !next.has(entry));
    const parts = [
      ...added.map((entry) => `+${JSON.stringify(entry)}`),
      ...removed.map((entry) => `-${JSON.stringify(entry)}`),
    ];
    if (parts.length > 0) {
      return `${change.path}: ${truncate(parts.join(' '))}`;
    }
  }
  return `${change.path}: ${formatValue(before)} -> ${formatValue(after)}`;
}

function renderItem(item: ItemPlan): string[] {
  const marker = {
    create: '+ create',
    update: '~ update',
    skipped: '! skipped',
    unchanged: '= same',
  }[item.action];
  const lines = [
    `  ${marker}  ${JSON.stringify(item.label)}${item.note ? `  (${item.note})` : ''}`,
  ];
  item.fields.forEach((change) => lines.push(`      ${describeChange(change)}`));
  if (item.writeOnly.length > 0) {
    lines.push(`      also sets (current value is not readable): ${item.writeOnly.join(', ')}`);
  }
  return lines;
}

/**
 * Render a plan as plain text. Unchanged items are collapsed into a count.
 *
 * @param plan - The plan to render
 * @param options - Display options
 * @returns Multi-line text ending with a newline
 */
export function renderPushPlan(
  plan: PushPlan,
  options: {
    /** Heading, for example the organization name */
    title?: string;
  } = {},
): string {
  const lines: string[] = [];
  if (options.title) {
    lines.push(options.title, '');
  }

  plan.resources.forEach(({ resource, items }) => {
    const shown = items.filter(
      (item) => item.action !== 'unchanged' || item.writeOnly.length > 0 || item.note,
    );
    const hidden = items.filter((item) => !shown.includes(item)).length;
    if (shown.length === 0 && hidden === 0) {
      return;
    }
    lines.push(resource);
    shown.forEach((item) => lines.push(...renderItem(item)));
    if (hidden > 0) {
      lines.push(`  = ${hidden} unchanged`);
    }
    lines.push('');
  });

  if (plan.effects.length > 0) {
    lines.push('Side effects');
    plan.effects.forEach((effect) => lines.push(`  ${effect.kind}  ${effect.description}`));
    lines.push('');
  }

  if (plan.ignoredResources.length > 0) {
    lines.push(`Ignored (push does not apply these): ${plan.ignoredResources.join(', ')}`, '');
  }

  if (plan.warnings.length > 0) {
    lines.push('Warnings');
    plan.warnings.forEach((warning) => lines.push(`  ${warning}`));
    lines.push('');
  }

  const { create, update, unchanged, skipped, effects } = plan.summary;
  const parts = [`${create} to create`, `${update} to update`, `${unchanged} unchanged`];
  if (skipped > 0) {
    parts.push(`${skipped} skipped`);
  }
  if (effects > 0) {
    parts.push(`${effects} side effect${effects === 1 ? '' : 's'}`);
  }
  lines.push(parts.join(', '));
  return `${lines.join('\n')}\n`;
}
