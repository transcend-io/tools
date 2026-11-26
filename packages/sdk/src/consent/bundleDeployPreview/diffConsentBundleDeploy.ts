import { LOCALE_KEY } from '@transcend-io/internationalization';
import { diffCss, diffJson, diffLines } from 'diff';
import { isEqual } from 'lodash-es';

import {
  ConsentDeployModuleKey,
  type ConsentBundleDeployDiff,
  type ConsentBundleDeployDiffInputs,
  type ConsentDeployModuleKeyValue,
  type ConsentModuleDiff,
  type PendingConsentBundleConfig,
} from './types.js';

const MAX_PATCH_CHARS = 12_000;

export { ConsentDeployModuleKey } from './types.js';

type CoreForDiff = Record<string, unknown> & {
  loadOptions?: {
    telemetrySampleRate?: unknown;
  };
  bundledModuleData?: {
    uiV2?: {
      loadOptions?: { themeConfigMap?: Record<string, unknown>; deploymentId?: unknown };
      mobileUiLoadOptions?: { themeConfigMap?: Record<string, unknown>; deploymentId?: unknown };
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
  // Changes on every deploy, so it would always show as a pending change
  delete obj.bundledModuleData?.uiV2?.loadOptions?.deploymentId;
  delete obj.bundledModuleData?.uiV2?.mobileUiLoadOptions?.deploymentId;
  delete obj.prefixModules;
  return obj;
}

const UI_V2_PREFIX = 'uiV2-';
const VALID_LOCALES = new Set<string>(Object.values(LOCALE_KEY));

/** UI v2 messages in the nested shape: variant -> locale -> message id -> value */
type UiV2MessagesNested = Record<string, Record<string, unknown>>;

/**
 * Parse a flat key `uiV2-{variant}-{locale}` into its parts.
 * Variant and locale can both contain hyphens (`default-consent`, `pt-BR`), so
 * the longest locale suffix that is a real locale wins.
 */
function parseUiV2Key(key: string): { variant: string; locale: string } | null {
  if (!key.startsWith(UI_V2_PREFIX)) return null;
  const parts = key.slice(UI_V2_PREFIX.length).split('-');
  for (let localeParts = parts.length - 1; localeParts >= 1; localeParts -= 1) {
    const locale = parts.slice(parts.length - localeParts).join('-');
    const variant = parts.slice(0, parts.length - localeParts).join('-');
    if (variant && VALID_LOCALES.has(locale)) return { variant, locale };
  }
  return null;
}

/**
 * Bring UI v2 messages to one shape before comparing.
 * The CDN gives flat keys (`uiV2-default-consent-en`). Saved config is nested.
 */
function normalizeUiV2Messages(messages: unknown): UiV2MessagesNested {
  if (messages === null || typeof messages !== 'object') return {};
  const record = messages as Record<string, unknown>;
  if (!Object.keys(record).some((key) => key.startsWith(UI_V2_PREFIX))) {
    return record as UiV2MessagesNested;
  }
  const nested: UiV2MessagesNested = {};
  for (const [key, value] of Object.entries(record)) {
    const parsed = parseUiV2Key(key);
    if (!parsed) continue;
    nested[parsed.variant] ??= {};
    nested[parsed.variant]![parsed.locale] = value;
  }
  return nested;
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

/** Changed variant and locale pairs, formatted `variant/locale` */
function uiV2KeysChanged(before: UiV2MessagesNested, after: UiV2MessagesNested): string[] {
  const variants = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed: string[] = [];
  for (const variant of variants) {
    const cur = before[variant] ?? {};
    const pend = after[variant] ?? {};
    const locales = new Set([...Object.keys(cur), ...Object.keys(pend)]);
    for (const locale of locales) {
      if (!isEqual(cur[locale], pend[locale])) changed.push(`${variant}/${locale}`);
    }
  }
  return changed.sort();
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
  key: ConsentDeployModuleKeyValue,
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

  const deployedUiV2 = normalizeUiV2Messages(deployedModules.uiV2Messages);
  const pendingUiV2 = normalizeUiV2Messages(pending.uiV2Messages);
  if (pending.uiV2Messages !== undefined && pending.uiV2Messages !== null) {
    const uiV2Highlights = uiV2KeysChanged(deployedUiV2, pendingUiV2);
    modules.push(
      moduleDiff(
        ConsentDeployModuleKey.UiV2Messages,
        deployedUiV2,
        pendingUiV2,
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
