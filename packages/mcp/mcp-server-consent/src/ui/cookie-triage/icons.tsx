import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

/** Checkmark icon for the approve decision control. */
export function CheckIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 11 8" fill="none" aria-hidden="true" width={16} height={16} {...props}>
      <path
        d="M0.75 3.42L4.08 6.75L10.08 0.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Close/X icon for the junk decision control. */
export function CloseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 10 10" fill="none" aria-hidden="true" width={16} height={16} {...props}>
      <path
        d="M0.75 0.75L9.08 9.08"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M0.75 9.08L9.08 0.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Trash icon for the delete control (not wired yet). */
export function TrashIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width={16} height={16} {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.37 14.01H5.64C4.86 14.01 4.21 13.4 4.15 12.62L3.5 4.25H12.51L11.86 12.62C11.8 13.4 11.15 14.01 10.37 14.01Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13.34 4.25H2.67" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.13 2H9.88C10.29 2 10.63 2.34 10.63 2.75V4.25H5.38V2.75C5.38 2.34 5.71 2 6.13 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 8.11L9 9.9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.11 10L8.9 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Comment icon for the per-row notes control. */
export function CommentIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width={16} height={16} {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0.75 3.25C0.75 1.87 1.87 0.75 3.25 0.75H13.25C14.63 0.75 15.75 1.87 15.75 3.25V15.33C15.75 15.48 15.67 15.62 15.54 15.7C15.4 15.77 15.24 15.77 15.11 15.69L12.55 14.08H3.25C1.87 14.08 0.75 12.96 0.75 11.58V3.25Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4.92 5.75H8.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11.58 5.75H10.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11.58 9.08H8.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4.92 9.08H5.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Chevron used in the suggested-purpose control. */
export function ChevronDownIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width={24} height={24} {...props}>
      <path
        d="M8 10L12 14L16 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Circular arrows icon for the header refresh control. */
export function RefreshIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width={16} height={16} {...props}>
      <path
        d="M13.5 8A5.5 5.5 0 1 1 11.3 3.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M11 1.5V4.5H14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
