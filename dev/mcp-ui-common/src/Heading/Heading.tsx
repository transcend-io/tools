import { makeEnum } from '@transcend-io/type-utils';

/** Heading size / weight used in dashboard section headers. */
export const HeadingVariant = makeEnum({
  /** Small caps label above a section */
  Eyebrow: 'eyebrow',
  /** Page title */
  Title: 'title',
  /** Nested section heading */
  Section: 'section',
});

export type HeadingVariant = (typeof HeadingVariant)[keyof typeof HeadingVariant];

/** Props for {@link Heading}. */
export interface HeadingProps {
  /** Display text */
  text: string;
  /** Visual variant; defaults to title when omitted */
  variant?: HeadingVariant;
}

/**
 * The dashboard sits on a light panel, so headings use the `on-card` family
 * rather than the host-adaptive `content` family — otherwise a dark host paints
 * white text onto that light panel.
 */
const VARIANT_CLASS: Record<HeadingVariant, string> = {
  [HeadingVariant.Eyebrow]: 'text-sm font-semibold tracking-wide text-on-card-muted uppercase',
  [HeadingVariant.Title]: 'text-heading-md font-semibold text-on-card',
  [HeadingVariant.Section]: 'text-heading-sm font-semibold text-on-card',
};

/** Dashboard heading without period chips (inventory stats are not time-windowed). */
export function Heading({ text, variant = HeadingVariant.Title }: HeadingProps) {
  return <h2 className={VARIANT_CLASS[variant]}>{text}</h2>;
}
