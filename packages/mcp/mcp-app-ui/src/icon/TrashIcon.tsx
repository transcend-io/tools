import type { ReactElement } from 'react';

import { Icon, type IconProps } from './Icon.js';
import TrashSvg from './svgs/trash.svg?react';

/** Trash / delete icon. */
export function TrashIcon(props: IconProps): ReactElement {
  return <Icon svg={TrashSvg} {...props} />;
}
