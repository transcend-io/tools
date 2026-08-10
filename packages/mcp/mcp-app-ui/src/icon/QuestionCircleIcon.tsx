import type { ReactElement } from 'react';

import QuestionCircleSvg from './svgs/questionCircle.svg?react';
import { Icon, type IconProps } from './Icon.js';

/** Question-mark-in-circle icon. */
export function QuestionCircleIcon(props: IconProps): ReactElement {
  return <Icon svg={QuestionCircleSvg} {...props} />;
}
