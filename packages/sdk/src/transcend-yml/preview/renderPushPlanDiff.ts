import yaml from 'js-yaml';

import { PreviewFieldChangeKind, PreviewImplicitEffectKind, PreviewItemAction } from './enums.js';
import type { FieldChange, ItemPlan, PlainObject, PushPlan } from './types.js';

export interface RenderPushPlanDiffOptions {
  /** Maximum body lines before truncation */
  maxLines?: number;
}

export interface RenderPushPlanDiffResult {
  /** Fenced diff block, ready to paste into chat */
  markdown: string;
  /** Lines inside the fence */
  lineCount: number;
  /** True when output was cut at maxLines */
  truncated: boolean;
}

const isScalarList = (value: unknown): value is (string | number | boolean)[] =>
  Array.isArray(value) && value.every((entry) => typeof entry !== 'object' || entry === null);

const line = (prefix: ' ' | '+' | '-', text: string): string => `${prefix}${text}`;

const formatYamlScalar = (value: unknown): string => {
  if (value === undefined) {
    return '(not set)';
  }
  const dumped = yaml.dump(value, { lineWidth: 120, noRefs: true }).trimEnd();
  return dumped.includes('\n') ? dumped.split('\n')[0]! : dumped;
};

const dumpObjectAsPlus = (obj: PlainObject, listItem = false): string[] => {
  const dumped = yaml
    .dump(listItem ? [obj] : obj, { lineWidth: 120, noRefs: true, indent: 2 })
    .trimEnd();
  return dumped.split('\n').map((row) => line('+', row.startsWith('  ') ? row.slice(2) : row));
};

const renderScalarListDiff = (
  field: string,
  before: unknown,
  after: unknown,
  indent: string,
): string[] => {
  const lines: string[] = [line(' ', `${indent}${field}:`)];
  const previous = new Set((isScalarList(before) ? before : []).map(String));
  const next = isScalarList(after) ? after.map(String) : [];
  const childIndent = `${indent}  `;
  next.forEach((entry) => {
    const marker = previous.has(entry) ? ' ' : '+';
    lines.push(line(marker, `${childIndent}- ${JSON.stringify(entry)}`));
  });
  previous.forEach((entry) => {
    if (!next.includes(entry)) {
      lines.push(line('-', `${childIndent}- ${JSON.stringify(entry)}`));
    }
  });
  return lines;
};

const renderFieldChange = (change: FieldChange, indent: string): string[] => {
  const leaf = change.path.split('.').pop() ?? change.path;
  if (isScalarList(change.after) || isScalarList(change.before)) {
    return renderScalarListDiff(leaf, change.before, change.after, indent);
  }
  if (change.kind === PreviewFieldChangeKind.Added && change.before === undefined) {
    const rows = yaml
      .dump({ [leaf]: change.after }, { lineWidth: 120, noRefs: true })
      .trimEnd()
      .split('\n');
    return rows.map((row) => line('+', `${indent}${row}`));
  }
  return [
    line('-', `${indent}${leaf}: ${formatYamlScalar(change.before)}`),
    line('+', `${indent}${leaf}: ${formatYamlScalar(change.after)}`),
  ];
};

const listItemContextLine = (item: ItemPlan): string | undefined => {
  if (typeof item.label === 'string' && item.label !== item.created?.title) {
    if (item.created && typeof item.created.name === 'string') {
      return line(' ', `  - name: ${JSON.stringify(item.created.name)}`);
    }
    return line(' ', `  - ${item.label}`);
  }
  return undefined;
};

const renderItem = (item: ItemPlan, singleton: boolean): string[] => {
  const lines: string[] = [];
  const baseIndent = singleton ? '  ' : '    ';

  if (item.action === PreviewItemAction.Create && item.created) {
    if (!singleton) {
      lines.push(...dumpObjectAsPlus(item.created, true));
    } else {
      lines.push(...dumpObjectAsPlus(item.created));
    }
    return lines;
  }

  if (item.action === PreviewItemAction.Update || item.fields.length > 0) {
    if (!singleton) {
      const context = listItemContextLine(item);
      if (context) {
        lines.push(context);
      }
    }
    item.fields.forEach((change) => {
      lines.push(...renderFieldChange(change, baseIndent));
    });
  }

  return lines;
};

const renderResource = (resource: string, items: ItemPlan[], singleton: boolean): string[] => {
  const visible = items.filter(
    (item) =>
      item.action === PreviewItemAction.Create ||
      item.action === PreviewItemAction.Update ||
      item.action === PreviewItemAction.Skipped ||
      item.fields.length > 0 ||
      item.writeOnly.length > 0 ||
      item.note,
  );
  const hiddenUnchanged = items.filter(
    (item) => item.action === PreviewItemAction.Unchanged,
  ).length;
  if (visible.length === 0 && hiddenUnchanged === 0) {
    return [];
  }

  const lines: string[] = [line(' ', `${resource}:`)];
  visible.forEach((item) => lines.push(...renderItem(item, singleton)));
  if (hiddenUnchanged > 0) {
    lines.push(line(' ', `  # ${hiddenUnchanged} unchanged`));
  }
  return lines;
};

/**
 * Render a push plan as a fenced unified diff agents can paste into chat.
 *
 * @param plan - Planned push from {@link planPush}
 * @param options - Display limits
 * @returns Markdown diff and metadata
 */
export function renderPushPlanDiff(
  plan: PushPlan,
  options: RenderPushPlanDiffOptions = {},
): RenderPushPlanDiffResult {
  const maxLines = options.maxLines ?? 400;
  const body: string[] = [];

  plan.resources.forEach(({ resource, items }) => {
    const singleton = items.length === 1 && items[0]!.label === resource;
    body.push(...renderResource(resource, items, singleton));
    if (body.length > 0 && body[body.length - 1] !== '') {
      body.push('');
    }
  });

  if (plan.effects.length > 0) {
    body.push(line(' ', '# Side effects'));
    plan.effects.forEach((effect) => {
      const marker = effect.kind === PreviewImplicitEffectKind.Delete ? '-' : '+';
      body.push(line(marker, `  ${effect.description}`));
    });
    body.push('');
  }

  if (plan.warnings.length > 0) {
    body.push(line(' ', '# Warnings'));
    plan.warnings.forEach((warning) => body.push(line(' ', `  ${warning}`)));
    body.push('');
  }

  const nonEmpty = body.filter((row) => row !== '');
  let truncated = false;
  let output = nonEmpty;
  if (nonEmpty.length > maxLines) {
    truncated = true;
    output = [
      ...nonEmpty.slice(0, maxLines),
      line(' ', `# ... ${nonEmpty.length - maxLines} more lines`),
    ];
  }

  const markdown = `\`\`\`diff\n${output.join('\n')}\n\`\`\``;
  return { markdown, lineCount: output.length, truncated };
}
