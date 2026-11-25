/** Ambient module declaration for Markdown files imported as text. */
declare module '*.md' {
  /** Contents of the file, inlined as a string at build time. */
  const contents: string;
  export default contents;
}
