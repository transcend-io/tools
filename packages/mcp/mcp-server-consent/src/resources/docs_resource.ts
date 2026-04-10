import type { ResourceDefinition } from '@transcend-io/mcp-server-core';

const FETCH_TIMEOUT_MS = 8_000;

/**
 * Creates a ResourceDefinition that fetches content from a Transcend docs page.
 * Uses the actual docs URL as the resource URI so MCP clients can open it directly.
 * Falls back to a static description if the fetch fails (offline, timeout, etc.).
 */
export function createDocsResource(options: {
  /** Full URL of the docs page (becomes the resource URI) */
  url: string;
  /** Human-readable name shown in resources/list */
  name: string;
  /** Short description of what this docs page covers */
  description: string;
  /** Static markdown returned when the live fetch fails */
  fallback: string;
}): ResourceDefinition {
  return {
    uri: options.url,
    name: options.name,
    description: options.description,
    mimeType: 'text/markdown',
    handler: async () => {
      try {
        const response = await fetch(options.url, {
          headers: { Accept: 'text/markdown, text/plain, text/html' },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!response.ok) {
          return withSourceLink(options.fallback, options.url);
        }
        const text = await response.text();
        const markdown = extractMarkdown(text);
        return withSourceLink(markdown, options.url);
      } catch {
        return withSourceLink(options.fallback, options.url);
      }
    },
  };
}

function withSourceLink(content: string, url: string): string {
  return `${content}\n\n---\n*Source: ${url}*\n`;
}

/**
 * Extracts readable markdown from a docs page response.
 * Mintlify docs return HTML by default; we strip tags for a usable text version.
 * If the content is already markdown-like (starts with # or has no HTML), return as-is.
 */
function extractMarkdown(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.includes('<html') && !trimmed.includes('<!DOCTYPE')) {
    return trimmed;
  }

  let text = trimmed
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const lines = text.split('\n');
  const contentStart = lines.findIndex(
    (l) => l.trim().length > 20 && !l.includes('Skip to') && !l.includes('Search...'),
  );
  if (contentStart > 0) {
    text = lines.slice(contentStart).join('\n').trim();
  }

  return text;
}
