/**
 * Ambient module declaration for Markdown imported as text.
 *
 * Used by agent-facing guides: the markdown is authored as a real `.md` file so
 * it stays readable and reviewable, and the server inlines it as a string at
 * build time so it ships inside `dist` with no runtime file reads.
 */
declare module '*.md' {
  /** Contents of the file, inlined as a string at build time. */
  const contents: string;
  export default contents;
}
