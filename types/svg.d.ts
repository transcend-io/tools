/** Ambient module declarations for SVG assets imported as text. */
declare module '*.svg' {
  /** UTF-8 contents of the SVG file */
  const content: string;
  export default content;
}
