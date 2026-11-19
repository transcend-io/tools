import { normalizeTranscendInput, type TranscendInput } from '../codecs.js';
import { compareObjects, isPlainObject, normalizeEmpty } from './compare.js';
import {
  PreviewImplicitEffectKind,
  PreviewItemAction,
  PreviewListResourceMode,
  PreviewResourceKind,
} from './enums.js';
import {
  datapointIdentity,
  RESOURCE_DEFINITIONS,
  type ListResourceDefinition,
  type PushResourceKey,
  type SingletonResourceDefinition,
} from './resourceDefinitions.js';
import type {
  ImplicitEffect,
  ItemPlan,
  PlainObject,
  PlanPushOptions,
  PushPlan,
  ResourcePlan,
} from './types.js';

/**
 * Coerce a YAML value to a list of plain objects.
 *
 * @param value - Top-level or nested list value
 * @returns Plain objects from the list
 */
const asItems = (value: unknown): PlainObject[] =>
  Array.isArray(value) ? value.filter(isPlainObject) : [];

/**
 * Coerce a YAML value to a list of strings.
 *
 * @param value - List field value
 * @returns String entries from the list
 */
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

/**
 * Narrow a string key to a known push resource key.
 *
 * @param key - Top-level YAML key
 * @returns Typed resource key
 */
const asKey = (key: string): PushResourceKey => key as PushResourceKey;

/**
 * Plan one list resource such as `vendors`.
 *
 * @param resource - Top-level YAML key
 * @param definition - How the resource is matched and compared
 * @param localItems - Items from the user's file
 * @param remoteItems - Items pulled from the organization
 * @param warnings - Collector for problems found while planning
 * @returns The resource plan
 */
function planList(
  resource: string,
  definition: ListResourceDefinition,
  localItems: PlainObject[],
  remoteItems: PlainObject[],
  warnings: string[],
): ResourcePlan {
  const remoteByIdentity = new Map<string, PlainObject>();
  remoteItems.forEach((item) => {
    const id = definition.identity(definition.canonicalize ? definition.canonicalize(item) : item);
    if (id !== undefined && !remoteByIdentity.has(id)) {
      remoteByIdentity.set(id, item);
    }
  });

  const seen = new Set<string>();
  const items = localItems.map((local): ItemPlan => {
    const label = definition.label(local);
    const identity = definition.identity(
      definition.canonicalize ? definition.canonicalize(local) : local,
    );
    if (identity === undefined) {
      warnings.push(`${resource}: "${label}" is missing the fields used to match it.`);
    } else if (seen.has(identity)) {
      warnings.push(`${resource}: "${label}" is listed more than once in the file.`);
    } else {
      seen.add(identity);
    }

    const remote = definition.match
      ? definition.match(local, remoteItems)
      : identity === undefined
        ? undefined
        : remoteByIdentity.get(identity);

    if (!remote) {
      if (definition.mode === PreviewListResourceMode.UpdateOnly) {
        warnings.push(
          `${resource}: "${label}" does not exist in the organization and push will fail.`,
        );
        return {
          label,
          action: PreviewItemAction.Skipped,
          fields: [],
          writeOnly: [],
          note: 'does not exist; push only updates existing items',
        };
      }
      return { label, action: PreviewItemAction.Create, fields: [], writeOnly: [] };
    }

    if (definition.mode === PreviewListResourceMode.CreateOnly) {
      return {
        label,
        action: PreviewItemAction.Unchanged,
        fields: [],
        writeOnly: [],
        note: 'already exists; push does not update existing items',
      };
    }

    const { fields, writeOnly } = compareObjects(local, remote, definition);
    return {
      label,
      action: fields.length > 0 ? PreviewItemAction.Update : PreviewItemAction.Unchanged,
      fields,
      writeOnly,
    };
  });
  return { resource, items };
}

/**
 * Plan a single-object resource such as `privacy-center`.
 *
 * @param resource - Top-level YAML key
 * @param definition - How the object is compared
 * @param local - Object from the user's file
 * @param remote - Object pulled from the organization
 * @returns The resource plan
 */
function planSingleton(
  resource: string,
  definition: SingletonResourceDefinition,
  local: PlainObject,
  remote: PlainObject | undefined,
): ResourcePlan {
  if (!remote) {
    return {
      resource,
      items: [{ label: resource, action: PreviewItemAction.Create, fields: [], writeOnly: [] }],
    };
  }
  const { fields, writeOnly } = compareObjects(local, remote, definition);
  return {
    resource,
    items: [
      {
        label: resource,
        action: fields.length > 0 ? PreviewItemAction.Update : PreviewItemAction.Unchanged,
        fields,
        writeOnly,
      },
    ],
  };
}

/**
 * Find identifiers and data subjects the file references but that do not exist yet.
 * Push creates these without them being listed as items.
 *
 * @param local - Local file
 * @param remote - Remote snapshot
 * @returns Implicit creates
 */
function planReferencedCreates(local: TranscendInput, remote: TranscendInput): ImplicitEffect[] {
  const effects: ImplicitEffect[] = [];

  const declaredIdentifiers = new Set(asItems(local.identifiers).map((item) => item.name));
  const existingIdentifiers = new Set(asItems(remote.identifiers).map((item) => item.name));
  const referencedIdentifiers = new Set<string>([
    ...asItems(local.preflights).flatMap((preflight) => [
      ...(typeof preflight['input-identifier'] === 'string' ? [preflight['input-identifier']] : []),
      ...strings(preflight['output-identifiers']),
    ]),
    ...asItems(local['data-silos']).flatMap((silo) => strings(silo['identity-keys'])),
  ]);
  referencedIdentifiers.forEach((name) => {
    if (!declaredIdentifiers.has(name) && !existingIdentifiers.has(name)) {
      effects.push({
        resource: 'identifiers',
        kind: PreviewImplicitEffectKind.Create,
        description: `Identifier "${name}" is referenced but does not exist, so push creates it.`,
      });
    }
  });

  const declaredSubjects = new Set(asItems(local['data-subjects']).map((item) => item.type));
  const existingSubjects = new Set(asItems(remote['data-subjects']).map((item) => item.type));
  const referencedSubjects = new Set<string>([
    ...asItems(local['data-silos']).flatMap((silo) => strings(silo['data-subjects'])),
    ...asItems(local['processing-activities']).flatMap((activity) =>
      strings(activity.dataSubjectTypes),
    ),
    ...asItems(local.preflights).flatMap((preflight) => strings(preflight['data-subjects'])),
  ]);
  referencedSubjects.forEach((type) => {
    if (!declaredSubjects.has(type) && !existingSubjects.has(type)) {
      effects.push({
        resource: 'data-subjects',
        kind: PreviewImplicitEffectKind.Create,
        description: `Data subject "${type}" is referenced but does not exist, so push creates it.`,
      });
    }
  });
  return effects;
}

/**
 * Find data silo fields that push clears when the file does not set them.
 *
 * @param local - Local file
 * @param remote - Remote snapshot
 * @returns Implicit clears
 */
function planSiloClears(local: TranscendInput, remote: TranscendInput): ImplicitEffect[] {
  const effects: ImplicitEffect[] = [];
  const remoteSilos = new Map(asItems(remote['data-silos']).map((silo) => [silo.title, silo]));
  asItems(local['data-silos']).forEach((silo) => {
    const remoteSilo = remoteSilos.get(silo.title);
    if (!remoteSilo) {
      return;
    }
    if (
      silo['deletion-dependencies'] === undefined &&
      normalizeEmpty(remoteSilo['deletion-dependencies']) !== undefined
    ) {
      effects.push({
        resource: 'data-silos',
        kind: PreviewImplicitEffectKind.Clear,
        description: `Data silo "${String(silo.title)}": existing deletion-dependencies are cleared because the file does not set them.`,
      });
    }
    const remoteDatapoints = new Map(
      asItems(remoteSilo.datapoints).map((datapoint) => [datapointIdentity(datapoint), datapoint]),
    );
    asItems(silo.datapoints).forEach((datapoint) => {
      const remoteDatapoint = remoteDatapoints.get(datapointIdentity(datapoint));
      if (
        remoteDatapoint &&
        datapoint['privacy-actions'] === undefined &&
        normalizeEmpty(remoteDatapoint['privacy-actions']) !== undefined
      ) {
        effects.push({
          resource: 'data-silos',
          kind: PreviewImplicitEffectKind.Clear,
          description: `Datapoint "${String(datapoint.key)}" in "${String(silo.title)}": enabled privacy-actions are cleared because the file does not set them.`,
        });
      }
    });
  });
  return effects;
}

/**
 * Find remote items that push deletes because they are absent from the file.
 *
 * @param local - Local file
 * @param remote - Remote snapshot
 * @param options - Push options
 * @returns Implicit deletes
 */
function planDeletes(
  local: TranscendInput,
  remote: TranscendInput,
  options: PlanPushOptions,
): ImplicitEffect[] {
  const effects: ImplicitEffect[] = [];

  const localLinks = asItems(local['privacy-center']?.footerLinks);
  if (local['privacy-center']?.footerLinks !== undefined) {
    const kept = new Set(localLinks.map((link) => link.title));
    asItems(remote['privacy-center']?.footerLinks).forEach((link) => {
      if (!kept.has(link.title)) {
        effects.push({
          resource: 'privacy-center',
          kind: PreviewImplicitEffectKind.Delete,
          description: `Footer link "${String(link.title)}" is deleted because it is not in the file.`,
        });
      }
    });
  }

  if (options.deleteExtraAttributeValues) {
    const remoteAttributes = new Map(asItems(remote.attributes).map((attr) => [attr.name, attr]));
    asItems(local.attributes).forEach((attribute) => {
      const kept = new Set(asItems(attribute.values).map((value) => value.name));
      asItems(remoteAttributes.get(attribute.name)?.values).forEach((value) => {
        if (!kept.has(value.name)) {
          effects.push({
            resource: 'attributes',
            kind: PreviewImplicitEffectKind.Delete,
            description: `Attribute "${String(attribute.name)}": value "${String(value.name)}" is deleted because it is not in the file.`,
          });
        }
      });
    });
  }
  return effects;
}

/**
 * Compute what `transcend inventory push` would do, without writing anything.
 * Pure: compares the local file with a remote snapshot pulled into the same YAML shape.
 *
 * @param localInput - The parsed transcend.yml
 * @param remoteInput - A snapshot of the organization pulled into the YAML shape
 * @param options - Push options that change what is written
 * @returns The plan
 */
export function planPush(
  localInput: TranscendInput,
  remoteInput: TranscendInput,
  options: PlanPushOptions = {},
): PushPlan {
  const local = normalizeTranscendInput(localInput);
  const remote = normalizeTranscendInput(remoteInput);
  const warnings: string[] = [];
  const resources: ResourcePlan[] = [];
  const ignoredResources: string[] = [];

  Object.entries(local).forEach(([key, value]) => {
    const definition = RESOURCE_DEFINITIONS[asKey(key)];
    if (!definition || value === undefined) {
      return;
    }
    if (definition.kind === PreviewResourceKind.PullOnly) {
      ignoredResources.push(key);
      return;
    }
    const remoteValue = (remote as Record<string, unknown>)[key];
    if (definition.kind === PreviewResourceKind.Singleton) {
      if (isPlainObject(value)) {
        resources.push(
          planSingleton(
            key,
            definition,
            value,
            isPlainObject(remoteValue) ? remoteValue : undefined,
          ),
        );
      }
      return;
    }
    resources.push(planList(key, definition, asItems(value), asItems(remoteValue), warnings));
  });

  const effects = [
    ...planReferencedCreates(local, remote),
    ...planSiloClears(local, remote),
    ...planDeletes(local, remote, options),
  ];

  const allItems = resources.flatMap(({ items }) => items);
  const count = (action: ItemPlan['action']): number =>
    allItems.filter((item) => item.action === action).length;

  return {
    resources,
    effects,
    warnings,
    ignoredResources,
    summary: {
      create: count(PreviewItemAction.Create),
      update: count(PreviewItemAction.Update),
      unchanged: count(PreviewItemAction.Unchanged),
      skipped: count(PreviewItemAction.Skipped),
      effects: effects.length,
    },
  };
}

/**
 * Check whether a plan would write anything.
 *
 * @param plan - A push plan
 * @returns True when at least one create, update, or hidden write is planned
 */
export function planHasChanges(plan: PushPlan): boolean {
  return plan.summary.create + plan.summary.update + plan.summary.effects > 0;
}
