/** Ambient module declarations for SVG assets. */

/** Raw SVG markup (tsdown text loader / default Vite text plugins). */
declare module '*.svg' {
  /** Inline SVG markup */
  const content: string;
  export default content;
}

/** SVGR React component (`vite-plugin-svgr` via the `?react` query). */
declare module '*.svg?react' {
  import type { FunctionComponent, SVGProps } from 'react';

  /** Root `<svg>` component */
  const ReactComponent: FunctionComponent<SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}
