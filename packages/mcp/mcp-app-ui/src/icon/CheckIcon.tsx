import type { ReactElement } from 'react';

import CheckSvg from './svgs/checkmark.svg?react';
import { Icon, type IconProps } from './Icon.js';

/** Checkmark icon. */
export function CheckIcon(props: IconProps): ReactElement {
  return <Icon svg={CheckSvg} {...props} />;
}
