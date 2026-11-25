import type {
  PreviewFieldChangeKind,
  PreviewImplicitEffectKind,
  PreviewItemAction,
} from './enums.js';

/** A plain JSON-like object */
export type PlainObject = Record<string, unknown>;

/** How a single field differs between the local file and the remote organization */
export interface FieldChange {
  /** Dotted path to the field, for example `owners` or `datapoints[users].description` */
  path: string;
  /** Current remote value. Undefined when the remote has no value. */
  before: unknown;
  /** Value the push will write */
  after: unknown;
  /** `changed` replaces a value, `added` is a list item that does not exist remotely */
  kind: PreviewFieldChangeKind;
}

/** What a push would do to one item */
export type ItemAction = PreviewItemAction;

/** The plan for one item in a resource list */
export interface ItemPlan {
  /** Human-readable label, usually the title or name */
  label: string;
  /** What push would do */
  action: ItemAction;
  /** Field-level differences. Empty for creates and unchanged items. */
  fields: FieldChange[];
  /** Fields push writes but pull cannot read, so their current value is unknown */
  writeOnly: string[];
  /** Extra context, for example why an item is skipped */
  note?: string;
  /** Full local object when the item would be created */
  created?: PlainObject;
}

/** The plan for one top-level resource such as `vendors` */
export interface ResourcePlan {
  /** Top-level YAML key */
  resource: string;
  /** Plans for each item defined in the file */
  items: ItemPlan[];
}

/** A write push performs that is not visible as an item in the file */
export interface ImplicitEffect {
  /** Resource the effect belongs to */
  resource: string;
  /** What happens */
  kind: PreviewImplicitEffectKind;
  /** Human-readable description */
  description: string;
}

/** Counts across a whole plan */
export interface PlanSummary {
  /** Items that would be created */
  create: number;
  /** Items that would be updated */
  update: number;
  /** Items with no detected change */
  unchanged: number;
  /** Items push cannot apply */
  skipped: number;
  /** Hidden writes such as auto-created identifiers or deletions */
  effects: number;
}

/** The full preview for one push */
export interface PushPlan {
  /** Per-resource plans in the order they appear in the file */
  resources: ResourcePlan[];
  /** Writes that happen as a side effect of the push */
  effects: ImplicitEffect[];
  /** Problems that will likely make the push fail or behave unexpectedly */
  warnings: string[];
  /** Counts */
  summary: PlanSummary;
  /** Top-level keys in the file that push does not apply */
  ignoredResources: string[];
}

/** Options that change what push writes */
export interface PlanPushOptions {
  /** When true, attribute values missing from the file are deleted remotely */
  deleteExtraAttributeValues?: boolean;
}
