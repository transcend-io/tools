/**
 * Node custom loader that stubs `.svg` / `.html` imports as empty string modules.
 * Needed when docgen imports MCP packages that pull OAuth callback HTML (SVG logo).
 */
export async function resolve(specifier, context, nextResolve) {
  const resolved = await nextResolve(specifier, context);
  if (resolved.url.endsWith('.svg') || resolved.url.endsWith('.html')) {
    return {
      ...resolved,
      format: 'module',
      shortCircuit: true,
    };
  }
  return resolved;
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.svg') || url.endsWith('.html')) {
    return {
      format: 'module',
      shortCircuit: true,
      source: 'export default "";\n',
    };
  }
  return nextLoad(url, context);
}
