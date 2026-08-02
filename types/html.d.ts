/**
 * Ambient module declaration for HTML files imported as text.
 *
 * Used by MCP App views: Vite prebuilds each view into one self-contained
 * document, and the server package imports it as a string to serve over
 * `resources/read`.
 */
declare module '*.html' {
  /** Contents of the file, inlined as a string at build time. */
  const contents: string;
  export default contents;
}
