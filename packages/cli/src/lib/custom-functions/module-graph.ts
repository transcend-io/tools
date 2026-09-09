/** One resolved dependency in `deno info --json` output. */
interface DenoInfoDependency {
  /** Original import specifier. */
  specifier?: unknown;
  /** Runtime dependency resolution. */
  code?: {
    /** Resolved runtime module specifier. */
    specifier?: unknown;
  };
}

/** One module in `deno info --json` output. */
interface DenoInfoModule {
  /** Resolved module specifier. */
  specifier?: unknown;
  /** Direct module dependencies. */
  dependencies?: DenoInfoDependency[];
}

/**
 * Find runtime imports that rely on local files or project import maps.
 *
 * Custom Functions are signed and executed as one data-URL module, so local
 * runtime dependencies cannot accompany the entry source. Type-only imports
 * are intentionally ignored because Deno strips them before execution.
 *
 * @param output - `deno info --json` output for one source root
 * @returns Original import specifiers that resolve to local files
 */
export function findNonSelfContainedRuntimeImports(output: string): string[] {
  const graph = JSON.parse(output) as {
    /** Root module specifiers. */
    roots?: unknown;
    /** Resolved modules. */
    modules?: DenoInfoModule[];
  };
  const root = Array.isArray(graph.roots) ? graph.roots[0] : undefined;
  if (typeof root !== 'string' || !Array.isArray(graph.modules)) {
    throw new Error('Deno returned an unexpected module graph.');
  }
  const rootModule = graph.modules.find(({ specifier }) => specifier === root);
  if (!rootModule) {
    throw new Error('Deno did not return the Custom Function root module.');
  }
  return [
    ...new Set(
      (rootModule.dependencies ?? [])
        .filter(
          ({ code, specifier }) =>
            typeof code?.specifier === 'string' &&
            (code.specifier.startsWith('file:') ||
              typeof specifier !== 'string' ||
              !/^(?:data|https?|jsr|node|npm):/u.test(specifier)),
        )
        .map(({ specifier, code }) =>
          typeof specifier === 'string' ? specifier : String(code!.specifier),
        ),
    ),
  ];
}
