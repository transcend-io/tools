import type { SVGProps } from 'react';

import approveCheckSvg from './approve-check.svg';
import cancelSvg from './cancel.svg';
import commentSvg from './comment.svg';
import { createSvgIcon } from './SvgIcon.tsx';
import trashSvg from './trash.svg';

type IconProps = SVGProps<SVGSVGElement>;

/** Checkmark icon for confirm / approve controls. */
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

/** Close / X icon for dismiss or reject controls. */
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

/** Checkmark used by approve controls (16×16 stroke). */
export const ApproveCheckIcon = createSvgIcon(approveCheckSvg, 'ApproveCheckIcon');

/** Close / X used by reject controls (16×16 stroke). */
export const CancelIcon = createSvgIcon(cancelSvg, 'CancelIcon');

/** Trash icon for delete controls. */
export const TrashIcon = createSvgIcon(trashSvg, 'TrashIcon');

/** Comment / notes icon. */
export const CommentIcon = createSvgIcon(commentSvg, 'CommentIcon');

/** Downward chevron for disclosure triggers. */
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

/** Circular arrows icon for refresh controls. */
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

/** Expand corners icon for entering fullscreen display mode. */
export function ExpandIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width={16} height={16} {...props}>
      <path
        d="M2.5 6.5V2.5H6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 6.5V2.5H9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.5 9.5V13.5H6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 9.5V13.5H9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Collapse corners icon for leaving fullscreen display mode. */
export function CollapseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width={16} height={16} {...props}>
      <path
        d="M6.5 2.5V6.5H2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 2.5V6.5H13.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 13.5V9.5H2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 13.5V9.5H13.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
