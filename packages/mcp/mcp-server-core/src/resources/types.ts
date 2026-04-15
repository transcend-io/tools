/**
 * A read-only resource registered with the MCP server.
 * Resources expose reference data that clients can pull
 * into context on demand via resources/read.
 */
export interface ResourceDefinition {
  /** Stable URI (e.g. "consent://classification-guide") */
  uri: string;
  /** Human-readable name shown in resources/list */
  name: string;
  /** Description of what the resource contains */
  description: string;
  /** MIME type of the content (defaults to "text/plain") */
  mimeType?: string;
  /** Returns the resource text content. May be async for dynamic data. */
  handler: () => string | Promise<string>;
}
