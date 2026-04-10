/**
 * Content block within a prompt message. Text-only for now;
 * the MCP spec also supports image/audio/resource but we don't need those yet.
 */
export interface PromptMessageContent {
  /** Content type */
  type: 'text';
  /** Text body */
  text: string;
}

/** Single message in a prompt's output sequence. */
export interface PromptMessage {
  /** Whose turn this message represents */
  role: 'user' | 'assistant';
  /** Content block */
  content: PromptMessageContent;
}

/** Declared argument a prompt accepts. */
export interface PromptArgument {
  /** Argument name (used as key in the args record) */
  name: string;
  /** Human-readable description */
  description: string;
  /** Whether the caller must supply this argument */
  required?: boolean;
}

/**
 * A reusable prompt template registered with the MCP server.
 * Prompts encode workflow guidance that any MCP client can discover
 * and invoke without embedding it in tool descriptions.
 */
export interface PromptDefinition {
  /** Unique prompt name (kebab-case by convention) */
  name: string;
  /** Short description shown in prompts/list */
  description: string;
  /** Arguments the prompt accepts */
  arguments?: PromptArgument[];
  /**
   * Returns the message sequence for this prompt.
   * May be async if it needs to fetch dynamic data (e.g. customer purposes).
   */
  handler: (args: Record<string, string>) => PromptMessage[] | Promise<PromptMessage[]>;
}
