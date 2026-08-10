import type { ReactElement } from 'react';

import { Icon, type IconProps } from './Icon.js';
import CheckSvg from './svgs/checkmark.svg?react';

/** Checkmark icon. */
export function CheckIcon(props: IconProps): ReactElement {
  return <Icon svg={CheckSvg} {...props} />;
}
