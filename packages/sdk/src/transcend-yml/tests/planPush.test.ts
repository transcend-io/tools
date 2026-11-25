import {
  ActionItemCode,
  AttributeKeyType,
  RequestAction,
  UiVariantStatus,
} from '@transcend-io/privacy-types';
import { describe, expect, it } from 'vitest';

import type { TranscendInput } from '../codecs.js';
import {
  formatValue,
  planHasChanges,
  planPush,
  renderPushPlan,
  summarizePushPlan,
  type PushPlan,
} from '../preview/index.js';

const itemsOf = (plan: PushPlan, resource = 0) => plan.resources[resource]?.items ?? [];

const itemAt = (plan: PushPlan, index = 0) => {
  const found = itemsOf(plan)[index];
  if (!found) {
    throw new Error(`No item at ${index}`);
  }
  return found;
};

const silo = (overrides: Record<string, unknown> = {}): TranscendInput['data-silos'] => [
  { title: 'Redshift', integrationName: 'server', ...overrides },
];

describe('planPush', () => {
  it('marks missing items as create and matching items as unchanged', () => {
    const plan = planPush(
      { vendors: [{ title: 'Stripe' }, { title: 'Segment', description: 'CDP' }] },
      { vendors: [{ title: 'Segment', description: 'CDP' }] },
    );
    expect(plan.summary).toMatchObject({ create: 1, update: 0, unchanged: 1 });
    expect(itemsOf(plan).map(({ label, action }) => [label, action])).toEqual([
      ['Stripe', 'create'],
      ['Segment', 'unchanged'],
    ]);
  });

  it('reports field-level before and after values for updates', () => {
    const plan = planPush(
      { vendors: [{ title: 'Segment', description: 'Customer data platform' }] },
      { vendors: [{ title: 'Segment', description: 'CDP' }] },
    );
    const item = itemAt(plan);
    expect(item.action).toBe('update');
    expect(item.fields).toEqual([
      { path: 'description', before: 'CDP', after: 'Customer data platform', kind: 'changed' },
    ]);
  });

  it('ignores fields that are omitted from the local file', () => {
    const plan = planPush(
      { vendors: [{ title: 'Segment' }] },
      { vendors: [{ title: 'Segment', description: 'CDP', owners: ['a@acme.com'] }] },
    );
    expect(plan.summary.update).toBe(0);
  });

  it('treats empty values and unordered lists as unchanged', () => {
    const plan = planPush(
      { vendors: [{ title: 'Segment', description: '', owners: ['b@acme.com', 'a@acme.com'] }] },
      { vendors: [{ title: 'Segment', owners: ['a@acme.com', 'b@acme.com'] }] },
    );
    expect(plan.summary.update).toBe(0);
  });

  it('matches attribute assignments by key and compares values as a set', () => {
    const plan = planPush(
      {
        vendors: [{ title: 'Segment', attributes: [{ key: 'Tier', values: ['Gold', 'Silver'] }] }],
      },
      { vendors: [{ title: 'Segment', attributes: [{ key: 'Tier', values: ['Silver'] }] }] },
    );
    expect(itemAt(plan).fields[0]).toMatchObject({ path: 'attributes[Tier].values' });
  });

  it('keeps data categories with the same name but a different category apart', () => {
    const plan = planPush(
      { 'data-categories': [{ name: 'Email', category: 'CONTACT' }] },
      { 'data-categories': [{ name: 'Email', category: 'OTHER' }] },
    );
    expect(plan.summary.create).toBe(1);
  });

  it('keeps data flows and cookies apart by their second key', () => {
    const plan = planPush(
      {
        'data-flows': [{ value: 'a.com', type: 'HOST' }],
        cookies: [{ name: 'sid', isRegex: true }],
      },
      {
        'data-flows': [{ value: 'a.com', type: 'REGEX' }],
        cookies: [{ name: 'sid' }],
      },
    );
    expect(plan.summary.create).toBe(2);
  });

  it('skips fields that push never writes', () => {
    const plan = planPush(
      { 'data-flows': [{ value: 'a.com', type: 'HOST', owners: ['a@acme.com'] }] },
      { 'data-flows': [{ value: 'a.com', type: 'HOST' }] },
    );
    expect(plan.summary.update).toBe(0);
  });

  it('reports write-only fields without calling the item changed', () => {
    const plan = planPush(
      {
        preflights: [
          {
            title: 'Check',
            'output-identifiers': ['email'],
            headers: [{ name: 'x', value: 'y' }],
          },
        ],
      },
      { preflights: [{ title: 'Check', 'output-identifiers': ['email'] }] },
    );
    const item = itemAt(plan);
    expect(item.action).toBe('unchanged');
    expect(item.writeOnly).toEqual(['headers']);
  });

  it('treats consent-manager webhookHeaders as write-only in push preview', () => {
    const secret = 'do-not-log-this-token';
    const plan = planPush(
      {
        'consent-manager': {
          webhookUrl: 'https://example.com/consent-deploy',
          webhookHeaders: [{ name: 'x-transcend-token', value: secret, isSecret: true }],
        },
      },
      {
        'consent-manager': {
          webhookUrl: 'https://example.com/consent-deploy',
        },
      },
    );
    const item = plan.resources.find((r) => r.resource === 'consent-manager')?.items[0];
    expect(item?.writeOnly).toEqual(['webhookHeaders']);
    expect(JSON.stringify(item)).not.toContain(secret);
    const text = renderPushPlan(plan);
    expect(text).toContain('webhookHeaders');
    expect(text).not.toContain(secret);
  });

  it('treats listing every privacy action the same as omitting them', () => {
    const plan = planPush(
      {
        preflights: [
          {
            title: 'Check',
            'output-identifiers': [],
            'privacy-actions': Object.values(RequestAction),
          },
        ],
      },
      { preflights: [{ title: 'Check', 'output-identifiers': [] }] },
    );
    expect(plan.summary).toMatchObject({ create: 0, update: 0, unchanged: 1 });
  });

  describe('resource modes', () => {
    it('never updates existing create-only items', () => {
      const plan = planPush(
        { templates: [{ title: 'Welcome' }, { title: 'New' }] },
        { templates: [{ title: 'Welcome' }] },
      );
      expect(itemsOf(plan).map(({ action }) => action)).toEqual(['unchanged', 'create']);
    });

    it('warns when an update-only item does not exist', () => {
      const plan = planPush({ actions: [{ type: 'ACCESS', waitingPeriod: 1 }] }, { actions: [] });
      expect(itemAt(plan).action).toBe('skipped');
      expect(plan.warnings[0]).toContain('push will fail');
    });
  });

  describe('matching', () => {
    it('warns about duplicate and unmatchable items', () => {
      const plan = planPush({ vendors: [{ title: 'A' }, { title: 'A' }] }, { vendors: [] });
      expect(plan.warnings).toEqual(['vendors: "A" is listed more than once in the file.']);
    });

    it('matches workflow configs by internal-name first', () => {
      const plan = planPush(
        {
          'workflow-configs': [
            { title: 'Renamed', 'action-type': 'ACCESS', 'internal-name': 'access-v2' },
          ],
        },
        {
          'workflow-configs': [
            { title: 'Access', 'action-type': 'ACCESS', 'internal-name': 'access-v2' },
            { title: 'Renamed', 'action-type': 'ACCESS' },
          ],
        },
      );
      expect(itemAt(plan).action).toBe('update');
      expect(itemAt(plan).fields[0]).toMatchObject({ path: 'title' });
    });

    it('creates a workflow config when its internal-name has no match', () => {
      const plan = planPush(
        {
          'workflow-configs': [
            { title: 'Access', 'action-type': 'ACCESS', 'internal-name': 'new-name' },
          ],
        },
        { 'workflow-configs': [{ title: 'Access', 'action-type': 'ACCESS' }] },
      );
      expect(plan.summary.create).toBe(1);
    });

    it('matches workflow configs by title, action, and region list without an internal-name', () => {
      const plan = planPush(
        {
          'workflow-configs': [
            { title: 'Access', 'action-type': 'ACCESS', 'region-list': ['US', 'GB'] },
          ],
        },
        {
          'workflow-configs': [
            { title: 'Access', 'action-type': 'ACCESS', 'region-list': ['EU'] },
            { title: 'Access', 'action-type': 'ACCESS', 'region-list': ['GB', 'US'] },
          ],
        },
      );
      expect(plan.summary).toMatchObject({ create: 0, unchanged: 1 });
    });

    it('matches action items by title and sorted collections', () => {
      const plan = planPush(
        {
          'action-items': [
            {
              title: 'Do it',
              type: ActionItemCode.ActionMissingSilos,
              collections: ['b', 'a'],
              notes: 'n',
            },
          ],
        },
        {
          'action-items': [
            { title: 'Do it', type: ActionItemCode.ActionMissingSilos, collections: ['a', 'b'] },
          ],
        },
      );
      expect(plan.summary.update).toBe(1);
    });
  });

  describe('nested lists', () => {
    it('matches datapoints by path and key and fields by key', () => {
      const plan = planPush(
        {
          'data-silos': silo({
            datapoints: [
              {
                key: 'users',
                path: ['public'],
                fields: [
                  { key: 'email', categories: [{ category: 'CONTACT' }] },
                  { key: 'phone', description: 'new' },
                ],
              },
            ],
          }),
        },
        {
          'data-silos': silo({
            datapoints: [
              {
                key: 'users',
                path: ['public'],
                fields: [{ key: 'email', categories: [{ name: 'Other', category: 'CONTACT' }] }],
              },
            ],
          }),
        },
      );
      const item = itemAt(plan);
      expect(item.fields.map(({ path }) => path)).toEqual([
        'datapoints[public::users].fields[phone]',
      ]);
    });

    it('lists a new datapoint as added', () => {
      const plan = planPush(
        { 'data-silos': silo({ datapoints: [{ key: 'orders' }] }) },
        { 'data-silos': silo({ datapoints: [{ key: 'users' }] }) },
      );
      expect(itemAt(plan).fields[0]).toMatchObject({ kind: 'added' });
    });

    it('treats both deletion-dependency forms as the same value', () => {
      const plan = planPush(
        { 'data-silos': silo({ 'deletion-dependencies': ['B'] }) },
        { 'data-silos': silo({ 'deletion-dependencies': [{ titles: ['B'] }] }) },
      );
      expect(plan.summary.update).toBe(0);
    });

    it('compares consent variant configuration as JSON, not as a string', () => {
      const variant = {
        id: 'x',
        name: 'v',
        slug: 'v',
        locales: [],
        status: UiVariantStatus.Active,
      };
      const plan = planPush(
        {
          'consent-manager': {
            consentVariants: [{ ...variant, configuration: '{"a":1,"b":2}' }],
          },
        },
        {
          'consent-manager': {
            consentVariants: [{ ...variant, configuration: '{"b":2,"a":1}' }],
          },
        },
      );
      expect(plan.summary.update).toBe(0);
    });
  });

  describe('side effects', () => {
    it('reports referenced identifiers and data subjects that do not exist', () => {
      const plan = planPush(
        {
          preflights: [
            {
              title: 'Check',
              'input-identifier': 'email',
              'output-identifiers': ['userId'],
              'data-subjects': ['customer'],
            },
          ],
        },
        { identifiers: [{ name: 'email', type: 'email' }], 'data-subjects': [] },
      );
      expect(plan.effects.map(({ description }) => description)).toEqual([
        'Identifier "userId" is referenced but does not exist, so push creates it.',
        'Data subject "customer" is referenced but does not exist, so push creates it.',
      ]);
    });

    it('does not report declared identifiers twice', () => {
      const plan = planPush(
        {
          identifiers: [{ name: 'userId', type: 'custom' }],
          preflights: [{ title: 'Check', 'output-identifiers': ['userId'] }],
        },
        { identifiers: [] },
      );
      expect(plan.effects).toEqual([]);
      expect(plan.summary.create).toBe(2);
    });

    it('reports cleared deletion-dependencies and privacy-actions', () => {
      const plan = planPush(
        { 'data-silos': silo({ datapoints: [{ key: 'users' }] }) },
        {
          'data-silos': silo({
            'deletion-dependencies': ['Other'],
            datapoints: [{ key: 'users', 'privacy-actions': ['ACCESS'] }],
          }),
        },
      );
      expect(plan.effects.map(({ kind }) => kind)).toEqual(['clear', 'clear']);
    });

    it('does not report clears for new data silos', () => {
      const plan = planPush({ 'data-silos': silo() }, { 'data-silos': [] });
      expect(plan.effects).toEqual([]);
    });

    it('reports footer links that push deletes', () => {
      const plan = planPush(
        { 'privacy-center': { footerLinks: [{ title: 'Keep' }] } },
        { 'privacy-center': { footerLinks: [{ title: 'Keep' }, { title: 'Drop' }] } },
      );
      expect(plan.effects).toHaveLength(1);
      expect(plan.effects[0]).toMatchObject({ kind: 'delete' });
    });

    it('reports attribute value deletes only with deleteExtraAttributeValues', () => {
      const local: TranscendInput = {
        attributes: [
          { name: 'Tier', type: AttributeKeyType.MultiSelect, values: [{ name: 'Gold' }] },
        ],
      };
      const remote: TranscendInput = {
        attributes: [
          {
            name: 'Tier',
            type: AttributeKeyType.MultiSelect,
            values: [{ name: 'Gold' }, { name: 'Bronze' }],
          },
        ],
      };
      expect(planPush(local, remote).effects).toEqual([]);
      expect(planPush(local, remote, { deleteExtraAttributeValues: true }).effects).toHaveLength(1);
    });
  });

  it('lists pull-only resources as ignored', () => {
    const plan = planPush({ assessments: [], 'api-keys': [{ title: 'k' }] }, {});
    expect(plan.ignoredResources).toEqual(['assessments', 'api-keys']);
  });

  it('reports a missing singleton as a create', () => {
    const plan = planPush({ 'consent-manager': { domains: ['a.com'] } }, {});
    expect(plan.summary.create).toBe(1);
  });

  it('folds legacy enrichers into preflights', () => {
    const plan = planPush(
      { enrichers: [{ title: 'Old', 'output-identifiers': [] }] },
      { preflights: [{ title: 'Old', 'output-identifiers': [] }] },
    );
    expect(plan.summary).toMatchObject({ create: 0, unchanged: 1 });
  });

  describe('planHasChanges', () => {
    it('is false when everything matches', () => {
      expect(
        planHasChanges(planPush({ vendors: [{ title: 'A' }] }, { vendors: [{ title: 'A' }] })),
      ).toBe(false);
    });

    it('is true for creates, updates, and side effects', () => {
      expect(planHasChanges(planPush({ vendors: [{ title: 'A' }] }, {}))).toBe(true);
    });
  });
});

describe('summarizePushPlan', () => {
  it('includes totals and changed items', () => {
    const plan = planPush({ vendors: [{ title: 'New' }] }, { vendors: [{ title: 'Old' }] });
    const summary = summarizePushPlan(plan);
    expect(summary).toContain('1 to create');
    expect(summary).toContain('vendors');
  });
});

describe('renderPushPlan', () => {
  it('formats undefined and long values for display', () => {
    expect(formatValue(undefined)).toBe('(not set)');
    expect(formatValue('x'.repeat(100))).toContain('...');
  });

  it('renders creates, updates, list changes, and a summary', () => {
    const plan = planPush(
      {
        vendors: [
          { title: 'Stripe' },
          { title: 'Segment', description: 'New', owners: ['a@acme.com', 'b@acme.com'] },
          { title: 'Same' },
        ],
      },
      {
        vendors: [
          { title: 'Segment', description: 'Old', owners: ['a@acme.com'] },
          { title: 'Same' },
        ],
      },
    );
    expect(renderPushPlan(plan, { title: 'Preview for acme' })).toBe(
      [
        'Preview for acme',
        '',
        'vendors',
        '  + create  "Stripe"',
        '  ~ update  "Segment"',
        '      description: "Old" -> "New"',
        '      owners: +"b@acme.com"',
        '  = 1 unchanged',
        '',
        '1 to create, 1 to update, 1 unchanged',
        '',
      ].join('\n'),
    );
  });

  it('renders side effects, ignored resources, and warnings', () => {
    const plan = planPush(
      {
        assessments: [],
        actions: [{ type: 'ACCESS' }],
        'privacy-center': { footerLinks: [] },
      },
      { 'privacy-center': { footerLinks: [{ title: 'Drop' }] } },
    );
    const text = renderPushPlan(plan);
    expect(text).toContain('Side effects');
    expect(text).toContain('delete  Footer link "Drop"');
    expect(text).toContain('Ignored (push does not apply these): assessments');
    expect(text).toContain('Warnings');
  });
});
