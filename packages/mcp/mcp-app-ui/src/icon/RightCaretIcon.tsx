import type { ReactElement } from 'react';

import { Icon, type IconProps } from './Icon.js';
import RightCaretSvg from './svgs/rightCaret.svg?react';

/** Right-pointing caret icon. */
export function RightCaretIcon(props: IconProps): ReactElement {
  return <Icon svg={RightCaretSvg} {...props} />;
}
