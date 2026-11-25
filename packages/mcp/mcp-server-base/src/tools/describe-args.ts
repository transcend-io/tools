/** Max items listed before a collection collapses to a count. */
const MAX_LISTED = 8;

/** Max length of a single rendered value. */
const MAX_VALUE_LENGTH = 200;

/** Flat recap shown above an elicitation confirmation form. */
export type ConfirmationSummary = Record<string, string | number | boolean>;

/**
 * Render call args for a human approving an elicitation form.
 * Arrays of objects collapse to a count; nested objects report keys only.
 */
export function describeArgs(args: unknown): ConfirmationSummary {
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    return args === undefined ? {} : { Arguments: renderValue(args) };
  }

  const summary: ConfirmationSummary = {};
  for (const [key, value] of Object.entries(args as Record<string, unknown>)) {
    if (value === undefined) continue;
    summary[key] = renderValue(value);
  }
  return summary;
}

function renderValue(value: unknown): string | number | boolean {
  if (value === null) return 'none';
  if (typeof value === 'string') return truncate(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return renderArray(value);
  return renderObject(value as Record<string, unknown>);
}

function renderArray(values: readonly unknown[]): string {
  if (values.length === 0) return 'none';

  const scalars = values.every(
    (entry) => typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean',
  );
  if (!scalars) return `${values.length} ${values.length === 1 ? 'item' : 'items'}`;

  if (values.length <= MAX_LISTED) return truncate(values.join(', '));
  return truncate(
    `${values.slice(0, MAX_LISTED).join(', ')}, and ${values.length - MAX_LISTED} more`,
  );
}

function renderObject(value: Record<string, unknown>): string {
  const keys = Object.keys(value);
  if (keys.length === 0) return 'none';
  if (keys.length <= MAX_LISTED) return truncate(keys.join(', '));
  return `${keys.length} fields`;
}

function truncate(value: string): string {
  return value.length <= MAX_VALUE_LENGTH ? value : `${value.slice(0, MAX_VALUE_LENGTH)}…`;
}
