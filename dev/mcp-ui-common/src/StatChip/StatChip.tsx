/** Props for {@link StatChip}. */
export interface StatChipProps {
  /** Uppercase label above the value */
  label: string;
  /** Numeric value to display */
  value: number;
}

/**
 * Compact KPI chip for host-adaptive surfaces (not the fixed light card kit).
 *
 * Prefer {@link MetricCard} on dashboard panels that sit on `bg-card`.
 */
export function StatChip({ label, value }: StatChipProps) {
  return (
    <div className="flex min-w-16 flex-col gap-1 border border-line-subtle rounded-md p-2 grow-0 shrink-0 basis-[108px]">
      <div className="text-sm text-content uppercase">{label}</div>
      <div className="text-heading-md text-content">{value}</div>
    </div>
  );
}
