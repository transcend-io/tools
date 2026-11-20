/** How a single field diff is classified */
export enum PreviewFieldChangeKind {
  /** Remote value is replaced */
  Changed = 'changed',
  /** A list item does not exist remotely */
  Added = 'added',
}

/** What push would do to one item */
export enum PreviewItemAction {
  /** Item does not exist remotely */
  Create = 'create',
  /** Item exists and fields differ */
  Update = 'update',
  /** Item matches the remote snapshot */
  Unchanged = 'unchanged',
  /** Push cannot apply this item */
  Skipped = 'skipped',
}

/** What a side effect does */
export enum PreviewImplicitEffectKind {
  /** Push creates a resource that is not listed as an item */
  Create = 'create',
  /** Push clears a field when the file omits it */
  Clear = 'clear',
  /** Push removes a remote item missing from the file */
  Delete = 'delete',
}

/** How a top-level YAML key is shaped for preview */
export enum PreviewResourceKind {
  /** List of items matched by identity */
  List = 'list',
  /** Single object per organization */
  Singleton = 'singleton',
  /** Key exists in pull output but push does not apply it */
  PullOnly = 'pullOnly',
}

/** How push applies changes to a list resource */
export enum PreviewListResourceMode {
  /** Create missing items and update existing ones */
  Upsert = 'upsert',
  /** Create new items only; existing items are left alone */
  CreateOnly = 'createOnly',
  /** Update existing items only; missing items fail the push */
  UpdateOnly = 'updateOnly',
}
