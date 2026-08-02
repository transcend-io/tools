/**
 * Ambient module declaration for stylesheets imported for their side effects.
 *
 * Used by MCP App views, where Vite collects each imported stylesheet and the
 * shared build inlines the result into the view's single HTML document.
 */
declare module '*.css';
