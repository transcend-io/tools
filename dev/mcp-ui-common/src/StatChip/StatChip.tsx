import { CompactCount } from '../CompactCount/CompactCount.tsx';

/** Props for {@link StatChip}. */
export interface StatChipProps {
  /** Uppercase label above the value */
  label: string;
  /** Numeric value to display */
  value: number;
  /** Class name for the value */
  valueClassName?: string;
  /** When true, replaces the value with a ~3ch leading shimmer */
  busy?: boolean;
}

/**
 * Compact KPI chip for host-adaptive surfaces (not the fixed light card kit).
 *
 * Prefer {@link MetricCard} on dashboard panels that sit on `bg-card`.
 */
export function StatChip({ label, value, valueClassName, busy = false }: StatChipProps) {
  return (
    <div className="flex min-w-16 flex-col gap-1 border border-card-line rounded-md p-2 grow-0 shrink-0 basis-[108px]">
      <div className="text-sm uppercase">{label}</div>
      <div
        className={
          valueClassName
            ? `text-heading-md font-semibold tabular-nums ${valueClassName}`
            : 'text-heading-md font-semibold tabular-nums'
        }
      >
        <CompactCount value={value} busy={busy} />
      </div>
    </div>
  );
}
