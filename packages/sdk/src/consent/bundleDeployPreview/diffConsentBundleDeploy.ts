import { diffCss, diffJson, diffLines } from 'diff';
import { isEqual } from 'lodash-es';

import type {
  ConsentBundleDeployDiff,
  ConsentBundleDeployDiffInputs,
  ConsentModuleDiff,
  PendingConsentBundleConfig,
} from './types.js';

const MAX_PATCH_CHARS = 12_000;

export const ConsentDeployModuleKey = {
  Core: 'core',
  Scripts: 'scripts',
  Tcf: 'tcf',
  NativeApp: 'nativeApp',
  Messages: 'messages',
  Stylesheet: 'stylesheet',
  UiV2Messages: 'uiV2Messages',
  UiV2Themes: 'uiV2Themes',
} as const;

type CoreForDiff = Record<string, unknown> & {
  loadOptions?: {
    telemetrySampleRate?: unknown;
  };
  bundledModuleData?: {
    uiV2?: {
      loadOptions?: { themeConfigMap?: Record<string, unknown> };
      mobileUiLoadOptions?: { themeConfigMap?: Record<string, unknown> };
    };
  };
  prefixModules?: unknown;
  csp?: unknown;
};

function transformCoreForDiff(module: unknown): CoreForDiff | undefined {
  if (module === null || typeof module !== 'object') return undefined;
  const obj = JSON.parse(JSON.stringify(module)) as CoreForDiff;
  delete obj.csp;
  delete obj.loadOptions?.telemetrySampleRate;
  delete obj.bundledModuleData?.uiV2?.loadOptions?.themeConfigMap;
  delete obj.bundledModuleData?.uiV2?.mobileUiLoadOptions?.themeConfigMap;
  delete obj.prefixModules;
  return obj;
}

function prefixModulesJson(core: unknown): string {
  const modules = (core as { prefixModules?: unknown })?.prefixModules;
  return JSON.stringify(modules ?? [], null, 2);
}

function themeConfigMapFromCore(core: unknown): Record<string, unknown> {
  const c = core as CoreForDiff | null | undefined;
  return {
    ...(c?.bundledModuleData?.uiV2?.loadOptions?.themeConfigMap ?? {}),
    ...(c?.bundledModuleData?.uiV2?.mobileUiLoadOptions?.themeConfigMap ?? {}),
  };
}

function truncatePatch(patch: string): { patch: string; truncated: boolean } {
  if (patch.length <= MAX_PATCH_CHARS) return { patch, truncated: false };
  return {
    patch: `${patch.slice(0, MAX_PATCH_CHARS)}\n… (diff truncated)`,
    truncated: true,
  };
}

function buildJsonPatch(before: unknown, after: unknown): { patch: string; truncated: boolean } {
  const beforeText = JSON.stringify(before ?? {}, null, 2);
  const afterText = JSON.stringify(after ?? {}, null, 2);
  const parts = diffJson(beforeText, afterText);
  const patch = parts.map((part) => part.value).join('');
  return truncatePatch(patch);
}

function buildCssPatch(before: string, after: string): { patch: string; truncated: boolean } {
  const parts = diffCss(before, after);
  const patch = parts.map((part) => part.value).join('');
  return truncatePatch(patch);
}

function buildLinesPatch(before: string, after: string): { patch: string; truncated: boolean } {
  const parts = diffLines(before, after);
  const patch = parts.map((part) => part.value).join('');
  return truncatePatch(patch);
}

function messageLocalesChanged(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): string[] {
  const cur = before ?? {};
  const pend = after ?? {};
  const locales = new Set([...Object.keys(cur), ...Object.keys(pend)]);
  return [...locales].filter((locale) => !isEqual(cur[locale], pend[locale])).sort();
}

function uiV2KeysChanged(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): string[] {
  const cur = before ?? {};
  const pend = after ?? {};
  const keys = new Set([...Object.keys(cur), ...Object.keys(pend)]);
  return [...keys].filter((key) => !isEqual(cur[key], pend[key])).sort();
}

function themeSlugsChanged(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): string[] {
  const slugs = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...slugs].filter((slug) => !isEqual(before[slug], after[slug])).sort();
}

function coreHighlights(before: CoreForDiff | undefined, after: CoreForDiff | undefined): string[] {
  const highlights: string[] = [];
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  for (const key of [...keys].sort()) {
    if (!isEqual(before?.[key], after?.[key])) {
      highlights.push(key);
    }
  }
  return highlights.slice(0, 12);
}

function moduleDiff(
  key: string,
  before: unknown,
  after: unknown,
  patchBuilder: (a: unknown, b: unknown) => { patch: string; truncated: boolean },
  highlights: string[],
): ConsentModuleDiff {
  const changesMade = !isEqual(before, after);
  const { patch, truncated } = changesMade
    ? patchBuilder(before, after)
    : { patch: '', truncated: false };
  return { key, changesMade, patch, truncated, highlights };
}

/**
 * Diff pending consent bundle configuration against the last deploy.
 *
 * @param inputs - Pending and deployed configuration
 * @returns Module-level diffs aligned with the admin dashboard review modal
 */
export function diffConsentBundleDeploy(
  inputs: ConsentBundleDeployDiffInputs,
): ConsentBundleDeployDiff {
  const { pending, deployedCore, deployedModules, firstDeploy } = inputs;
  const modules: ConsentModuleDiff[] = [];

  const pendingCore = transformCoreForDiff(pending.core);
  const deployedCoreTransformed = transformCoreForDiff(deployedCore);

  modules.push(
    moduleDiff(
      ConsentDeployModuleKey.Core,
      deployedCoreTransformed,
      pendingCore,
      (a, b) => buildJsonPatch(a, b),
      coreHighlights(deployedCoreTransformed, pendingCore),
    ),
  );

  modules.push(
    moduleDiff(
      ConsentDeployModuleKey.Scripts,
      prefixModulesJson(deployedCore),
      prefixModulesJson(pending.core),
      (a, b) => buildLinesPatch(String(a), String(b)),
      [],
    ),
  );

  if (inputs.useIabFramework) {
    modules.push(
      moduleDiff(
        ConsentDeployModuleKey.Tcf,
        deployedModules.tcf,
        pending.tcf,
        (a, b) => buildJsonPatch(a, b),
        [],
      ),
    );
  }

  modules.push(
    moduleDiff(
      ConsentDeployModuleKey.NativeApp,
      deployedModules.nativeApp,
      pending.nativeApp,
      (a, b) => buildJsonPatch(a, b),
      [],
    ),
  );

  const messageHighlights = messageLocalesChanged(
    deployedModules.messages as Record<string, unknown> | undefined,
    pending.messages as Record<string, unknown> | undefined,
  );
  modules.push(
    moduleDiff(
      ConsentDeployModuleKey.Messages,
      deployedModules.messages,
      pending.messages,
      (a, b) => buildJsonPatch(a, b),
      messageHighlights,
    ),
  );

  const pendingCoreUiV2 = (pendingCore as CoreForDiff | undefined)?.bundledModuleData?.uiV2;
  const showUiV2Themes = pendingCoreUiV2 != null;

  if (!showUiV2Themes) {
    modules.push(
      moduleDiff(
        ConsentDeployModuleKey.Stylesheet,
        deployedModules.stylesheet ?? '',
        pending.stylesheet ?? '',
        (a, b) => buildCssPatch(String(a), String(b)),
        [],
      ),
    );
  }

  const uiV2Highlights = uiV2KeysChanged(
    deployedModules.uiV2Messages as Record<string, unknown> | undefined,
    pending.uiV2Messages as Record<string, unknown> | undefined,
  );
  if (pending.uiV2Messages !== undefined && pending.uiV2Messages !== null) {
    modules.push(
      moduleDiff(
        ConsentDeployModuleKey.UiV2Messages,
        deployedModules.uiV2Messages,
        pending.uiV2Messages,
        (a, b) => buildJsonPatch(a, b),
        uiV2Highlights,
      ),
    );
  }

  if (showUiV2Themes) {
    const themeHighlights = themeSlugsChanged(
      themeConfigMapFromCore(deployedCore),
      themeConfigMapFromCore(pending.core),
    );
    modules.push(
      moduleDiff(
        ConsentDeployModuleKey.UiV2Themes,
        themeConfigMapFromCore(deployedCore),
        themeConfigMapFromCore(pending.core),
        (a, b) => buildJsonPatch(a, b),
        themeHighlights,
      ),
    );
  }

  const hasChanges = firstDeploy || modules.some((mod) => mod.changesMade);

  return {
    firstDeploy,
    lastDeployedAt: inputs.lastDeployedAt,
    hasChanges,
    modules: modules.filter((mod) => firstDeploy || mod.changesMade),
  };
}
