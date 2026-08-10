import type { ReactElement } from 'react';

import TrashSvg from './svgs/trash.svg?react';
import { Icon, type IconProps } from './Icon.js';

/** Trash / delete icon. */
export function TrashIcon(props: IconProps): ReactElement {
  return <Icon svg={TrashSvg} {...props} />;
}
