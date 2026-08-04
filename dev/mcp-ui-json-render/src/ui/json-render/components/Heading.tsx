import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { z } from 'zod';

import type { HeadingPropsSchema, PeriodSchema } from '../../../catalog.ts';

type HeadingProps = z.infer<typeof HeadingPropsSchema>;
type Period = z.infer<typeof PeriodSchema>;

/**
 * The whole dashboard sits on a light panel (see `JsonRenderView`), so headings
 * use the `on-card` family rather than the host-adaptive `content` family —
 * otherwise a dark host paints white text onto that light panel.
 */
const VARIANT_CLASS: Record<NonNullable<HeadingProps['variant']>, string> = {
  eyebrow: 'text-sm font-semibold tracking-wide text-on-card-muted uppercase',
  title: 'text-heading-md font-semibold text-on-card',
  section: 'text-heading-sm font-semibold text-on-card',
};

/** Callback the view provides so period chips can ask the host to refetch. */
export interface PeriodChangeContextValue {
  /** Invoked when the user picks a period chip; may be undefined while connecting */
  onPeriodChange?: (period: Period) => void | Promise<void>;
}

const PeriodChangeContext = createContext<PeriodChangeContextValue>({});

/** Provides {@link PeriodChangeContextValue} to Heading period chips. */
export function PeriodChangeProvider({
  value,
  children,
}: {
  value: PeriodChangeContextValue;
  children: ReactNode;
}) {
  return <PeriodChangeContext.Provider value={value}>{children}</PeriodChangeContext.Provider>;
}

/**
 * Dashboard heading. Eyebrow matches the uppercase letter-spaced labels in the
 * Agentic Assist Figma; optional period chips mirror the 7d / 30d / 90d / 6mo
 * control next to CONSENT ACTIVITY.
 */
export function Heading({ props }: { props: HeadingProps }) {
  const variant = props.variant ?? 'title';
  const periods = props.periods?.filter(Boolean) ?? [];
  const { onPeriodChange } = useContext(PeriodChangeContext);
  const [selected, setSelected] = useState<Period | null>(props.selectedPeriod ?? null);

  useEffect(() => {
    setSelected(props.selectedPeriod ?? null);
  }, [props.selectedPeriod]);

  const title = <h2 className={VARIANT_CLASS[variant]}>{props.text}</h2>;

  if (periods.length === 0) {
    return title;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {title}
      <div className="flex items-center gap-1" role="group" aria-label="Time range">
        {periods.map((period) => {
          const isSelected = selected === period;
          return (
            <button
              key={period}
              type="button"
              aria-pressed={isSelected}
              className={
                isSelected
                  ? 'rounded-sm bg-card px-2.5 py-1 text-sm font-medium text-on-card shadow-sm'
                  : 'rounded-sm px-2.5 py-1 text-sm font-medium text-on-card-muted transition-colors hover:text-on-card'
              }
              onClick={() => {
                if (period === selected) return;
                setSelected(period);
                void onPeriodChange?.(period);
              }}
            >
              {period}
            </button>
          );
        })}
      </div>
    </div>
  );
}
