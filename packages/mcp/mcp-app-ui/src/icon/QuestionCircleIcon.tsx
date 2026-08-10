import type { ReactElement } from 'react';

import { Icon, type IconProps } from './Icon.js';
import QuestionCircleSvg from './svgs/questionCircle.svg?react';

/** Question-mark-in-circle icon. */
export function QuestionCircleIcon(props: IconProps): ReactElement {
  return <Icon svg={QuestionCircleSvg} {...props} />;
}
