/**
 * Ambient module declaration for GraphQL schema SDL imported as text.
 *
 * The committed root `schema.graphql` is inlined at build time for MCP schema tools.
 */
declare module '*.graphql' {
  /** Contents of the file, inlined as a string at build time. */
  const contents: string;
  export default contents;
}
