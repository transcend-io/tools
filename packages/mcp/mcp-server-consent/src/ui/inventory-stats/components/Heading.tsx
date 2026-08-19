/** Heading size / weight used in dashboard section headers. */
export type HeadingVariant = 'eyebrow' | 'title' | 'section';

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
  eyebrow: 'text-sm font-semibold tracking-wide text-on-card-muted uppercase',
  title: 'text-heading-md font-semibold text-on-card',
  section: 'text-heading-sm font-semibold text-on-card',
};

/** Dashboard heading without period chips (inventory stats are not time-windowed). */
export function Heading({ text, variant = 'title' }: HeadingProps) {
  return <h2 className={VARIANT_CLASS[variant]}>{text}</h2>;
}
