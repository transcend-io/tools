import { RequestAction } from '@transcend-io/privacy-types';

import type { TranscendInput } from '../codecs.js';
import { normalizeDeletionDependencies } from '../normalizeDeletionDependencies.js';
import { isPlainObject, type NestedList, type Shape } from './compare.js';
import { PreviewListResourceMode, PreviewResourceKind } from './enums.js';
import type { PlainObject } from './types.js';

/** Top-level YAML keys that the preview knows about. `enrichers` is folded into `preflights`. */
export type PushResourceKey = Exclude<keyof TranscendInput, 'enrichers'>;

/** A resource that is a list of items matched by identity */
export interface ListResourceDefinition extends Shape {
  /** Resource kind */
  kind: PreviewResourceKind.List;
  /**
   * `upsert` creates missing items and updates existing ones.
   * `createOnly` never touches an existing item.
   * `updateOnly` fails for items that do not exist.
   */
  mode: PreviewListResourceMode;
  /** Identity of an item. Must match the key the sync function matches on. */
  identity: (item: PlainObject) => string | undefined;
  /** Label shown to the user */
  label: (item: PlainObject) => string;
  /** Custom matcher for resources that use more than a single key */
  match?: (local: PlainObject, remoteItems: PlainObject[]) => PlainObject | undefined;
}

/** A resource that is a single object per organization */
export interface SingletonResourceDefinition extends Shape {
  /** Resource kind */
  kind: PreviewResourceKind.Singleton;
}

/** A resource push does not apply */
export interface PullOnlyResourceDefinition {
  /** Resource kind */
  kind: PreviewResourceKind.PullOnly;
}

/** How the preview treats one top-level YAML key */
export type ResourceDefinition =
  | ListResourceDefinition
  | SingletonResourceDefinition
  | PullOnlyResourceDefinition;

const str = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

const by =
  (field: string) =>
  (item: PlainObject): string | undefined =>
    str(item[field]);

const pair =
  (first: string, second: string) =>
  (item: PlainObject): string | undefined => {
    const a = str(item[first]);
    const b = str(item[second]);
    return a !== undefined && b !== undefined ? `${a}::${b}` : undefined;
  };

const listOf = (
  field: string,
  rest: Omit<ListResourceDefinition, 'kind' | 'identity' | 'label' | 'mode'> & {
    /** Mode override */
    mode?: ListResourceDefinition['mode'];
    /** Identity override */
    identity?: ListResourceDefinition['identity'];
    /** Label override */
    label?: ListResourceDefinition['label'];
  } = {},
): ListResourceDefinition => ({
  kind: PreviewResourceKind.List,
  mode: PreviewListResourceMode.Upsert,
  identity: by(field),
  label: (item) => str(item[field]) ?? '(unnamed)',
  ...rest,
});

/** Attribute assignments like `{ key, values }` are matched by key */
const ATTRIBUTES_LIST: NestedList = { identity: by('key') };

/** Data categories and purposes default to the name `Other` when none is given */
const defaultOtherName = (item: PlainObject, field: string): PlainObject => {
  const value = item[field];
  if (!Array.isArray(value)) {
    return item;
  }
  return {
    ...item,
    [field]: value.map((entry) =>
      isPlainObject(entry) ? { ...entry, name: entry.name || 'Other' } : entry,
    ),
  };
};

const FIELDS_LIST: NestedList = {
  identity: by('key'),
  // Pull writes guessed categories, push never syncs them. Push uses `key` as the name.
  ignoreFields: ['guessed-categories', 'title'],
  canonicalize: (item) => defaultOtherName(defaultOtherName(item, 'categories'), 'purposes'),
  nested: { attributes: ATTRIBUTES_LIST },
};

/** Datapoints are matched by path and key */
export const datapointIdentity = (item: PlainObject): string | undefined => {
  const key = str(item.key);
  return key === undefined ? undefined : `${strings(item.path).join('/')}::${key}`;
};

const DATAPOINTS_LIST: NestedList = {
  identity: datapointIdentity,
  orderedFields: ['path'],
  nested: { fields: FIELDS_LIST, attributes: ATTRIBUTES_LIST },
};

/** Both the flat and the per-workflow forms become the API shape before comparing */
const normalizeSiloDependencies = (item: PlainObject): PlainObject => {
  const dependencies = item['deletion-dependencies'];
  if (!Array.isArray(dependencies)) {
    return item;
  }
  try {
    return {
      ...item,
      'deletion-dependencies': normalizeDeletionDependencies(
        dependencies as Parameters<typeof normalizeDeletionDependencies>[0],
        str(item.title) ?? '',
      ),
    };
  } catch {
    return item;
  }
};

/** Consent variant and theme configuration is stored as a JSON string */
const parseConfiguration = (item: PlainObject): PlainObject => {
  const { configuration } = item;
  if (typeof configuration !== 'string') {
    return item;
  }
  try {
    return { ...item, configuration: JSON.parse(configuration) };
  } catch {
    return item;
  }
};

/** Pull leaves out `privacy-actions` when an enricher handles every action */
const dropAllPrivacyActions = (item: PlainObject): PlainObject => {
  const actions = item['privacy-actions'];
  if (Array.isArray(actions) && new Set(actions).size === Object.values(RequestAction).length) {
    const { 'privacy-actions': _removed, ...rest } = item;
    return rest;
  }
  return item;
};

const regionSetKey = (value: unknown): string => [...strings(value)].sort().join(',');

/**
 * Match a workflow config the same way push does:
 * internal-name, then title, action-type, data-subject-type (when set), region-list.
 *
 * @param local - Workflow config from the file
 * @param remoteItems - Workflow configs pulled from the organization
 * @returns The matching remote config, if any
 */
export function matchWorkflowConfig(
  local: PlainObject,
  remoteItems: PlainObject[],
): PlainObject | undefined {
  const internalName = str(local['internal-name']);
  let candidates = remoteItems;
  if (internalName) {
    candidates = candidates.filter((item) => item['internal-name'] === internalName);
    if (candidates.length <= 1) {
      return candidates[0];
    }
  }
  const steps: ((item: PlainObject) => boolean)[] = [
    (item) => item.title === local.title,
    (item) => item['action-type'] === local['action-type'],
    ...(str(local['data-subject-type'])
      ? [(item: PlainObject) => item['data-subject-type'] === local['data-subject-type']]
      : []),
    (item) => regionSetKey(item['region-list']) === regionSetKey(local['region-list']),
  ];
  for (const step of steps) {
    candidates = candidates.filter(step);
    if (candidates.length <= 1) {
      return candidates[0];
    }
  }
  // Without an internal-name, push prefers an unnamed candidate
  return internalName
    ? candidates[0]
    : (candidates.find((item) => !item['internal-name']) ?? candidates[0]);
}

const actionItemKey = (item: PlainObject): string =>
  `${str(item.title) ?? ''}-${[...strings(item.collections)].sort().join('-')}`;

/**
 * Match an action item by its customer experience id, then by title and collections.
 *
 * @param local - Action item from the file
 * @param remoteItems - Action items pulled from the organization
 * @returns The matching remote action item, if any
 */
export function matchActionItem(
  local: PlainObject,
  remoteItems: PlainObject[],
): PlainObject | undefined {
  const experienceId = str(local.customerExperienceActionItemId);
  const byExperience = experienceId
    ? remoteItems.find((item) => item.customerExperienceActionItemId === experienceId)
    : undefined;
  return byExperience ?? remoteItems.find((item) => actionItemKey(item) === actionItemKey(local));
}

/**
 * How the preview treats every top-level YAML key.
 * Typed as a full record so a new key cannot ship without a preview definition.
 */
export const RESOURCE_DEFINITIONS: Record<PushResourceKey, ResourceDefinition> = {
  'api-keys': { kind: PreviewResourceKind.PullOnly },
  assessments: { kind: PreviewResourceKind.PullOnly },
  'assessment-templates': { kind: PreviewResourceKind.PullOnly },
  'system-discovery': { kind: PreviewResourceKind.PullOnly },

  templates: listOf('title', { mode: PreviewListResourceMode.CreateOnly }),
  teams: listOf('name'),
  preflights: listOf('title', {
    // Pull cannot read webhook headers
    writeOnlyFields: ['headers'],
    canonicalize: dropAllPrivacyActions,
  }),
  attributes: listOf('name', {
    nested: { values: { identity: by('name') } },
  }),
  'business-entities': listOf('title', { nested: { attributes: ATTRIBUTES_LIST } }),
  vendors: listOf('title', { nested: { attributes: ATTRIBUTES_LIST } }),
  'data-categories': listOf('name', {
    identity: pair('name', 'category'),
    nested: { attributes: ATTRIBUTES_LIST },
  }),
  'processing-purposes': listOf('name', {
    identity: pair('name', 'purpose'),
    nested: { attributes: ATTRIBUTES_LIST },
  }),
  'data-subjects': listOf('type'),
  actions: listOf('type', {
    mode: PreviewListResourceMode.UpdateOnly,
    // Push converts a block list into an allow list that pull returns
    writeOnlyFields: ['regionBlockList'],
  }),
  identifiers: listOf('name'),
  'data-silos': listOf('title', {
    // Pull-only fields. Pull cannot read webhook headers.
    ignoreFields: ['discoveredBy', 'businessEntities'],
    writeOnlyFields: ['headers'],
    canonicalize: normalizeSiloDependencies,
    nested: { datapoints: DATAPOINTS_LIST, attributes: ATTRIBUTES_LIST },
  }),
  'data-flows': listOf('value', {
    identity: pair('value', 'type'),
    label: (item) => `${str(item.value) ?? '(unnamed)'} (${str(item.type) ?? '?'})`,
    // Push does not write owners or teams yet
    ignoreFields: ['owners', 'teams'],
    nested: { attributes: ATTRIBUTES_LIST },
  }),
  cookies: listOf('name', {
    identity: (item) =>
      str(item.name) ? `${str(item.name)}::${item.isRegex ? 'regex' : 'exact'}` : undefined,
    // Push does not write owners or teams yet
    ignoreFields: ['owners', 'teams'],
    nested: { attributes: ATTRIBUTES_LIST },
  }),
  'consent-manager': {
    kind: PreviewResourceKind.Singleton,
    // Pull returns these but push does not apply them. `version` is not pulled.
    ignoreFields: ['bundleUrls', 'syncEndpoint', 'syncGroups'],
    writeOnlyFields: ['version'],
    nested: {
      experiences: { identity: by('name') },
      consentVariants: {
        identity: by('slug'),
        ignoreFields: ['id'],
        canonicalize: parseConfiguration,
      },
      consentThemes: {
        identity: by('slug'),
        ignoreFields: ['id'],
        canonicalize: parseConfiguration,
      },
    },
  },
  'privacy-center': {
    kind: PreviewResourceKind.Singleton,
    nested: { footerLinks: { identity: by('title') } },
  },
  policies: listOf('title', {
    // Pull cannot read scheduled effective dates
    writeOnlyFields: ['effectiveOn', 'disableEffectiveOn'],
  }),
  messages: listOf('id', {
    // Push does not write the description
    ignoreFields: ['description'],
  }),
  partitions: listOf('name', {
    mode: PreviewListResourceMode.CreateOnly,
    // The partition secret is pull-only
    ignoreFields: ['partition'],
  }),
  'processing-activities': listOf('title', { nested: { attributes: ATTRIBUTES_LIST } }),
  purposes: listOf('trackingType', {
    nested: {
      'preference-topics': {
        identity: by('slug'),
        // Topic color is pull-only
        ignoreFields: ['color'],
        nested: { options: { identity: by('slug') } },
      },
    },
  }),
  'preference-options': listOf('slug'),
  'preference-workflow-configs': listOf('name'),
  'workflow-configs': listOf('title', {
    identity: (item) => str(item['internal-name']) ?? str(item.title),
    label: (item) => str(item['internal-name']) ?? str(item.title) ?? '(unnamed)',
    match: matchWorkflowConfig,
  }),
  'action-items': listOf('title', {
    label: (item) => str(item.title) ?? '(unnamed)',
    match: matchActionItem,
    nested: { attributes: ATTRIBUTES_LIST },
  }),
  'action-item-collections': listOf('title'),
};
