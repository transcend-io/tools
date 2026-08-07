/**
 * Ambient module declaration for HTML files imported as text.
 *
 * Used by MCP App views, which Vite prebuilds into one self-contained document for
 * a server to serve as a string over `resources/read`.
 */
declare module '*.html' {
  /** Contents of the file, inlined as a string at build time. */
  const contents: string;
  export default contents;
}
