import type { ReactElement } from 'react';

import RightCaretSvg from './svgs/rightCaret.svg?react';
import { Icon, type IconProps } from './Icon.js';

/** Right-pointing caret icon. */
export function RightCaretIcon(props: IconProps): ReactElement {
  return <Icon svg={RightCaretSvg} {...props} />;
}
