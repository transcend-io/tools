import { expect, describe, it } from 'vitest';

import { mergeTranscendInputs, TranscendInput } from '../../index.js';

describe('mergeTranscendInputs', () => {
  const test: TranscendInput = {
    'data-silos': [
      {
        title: 'Test A',
        integrationName: 'server',
      },
    ],
  };

  const test2: TranscendInput = {
    'data-silos': [
      {
        title: 'Test B',
        integrationName: 'server',
      },
    ],
    preflights: [
      {
        title: 'Test Enricher A',
        url: 'https://test.trancsend.io',
        'input-identifier': 'email',
        'output-identifiers': ['email'],
      },
    ],
    templates: [
      {
        title: 'Test Template A',
      },
    ],
    'api-keys': [
      {
        title: 'Test API Key A',
      },
    ],
  };

  const merged: TranscendInput = {
    'data-silos': [
      {
        title: 'Test A',
        integrationName: 'server',
      },
      {
        title: 'Test B',
        integrationName: 'server',
      },
    ],
    preflights: [
      {
        title: 'Test Enricher A',
        url: 'https://test.trancsend.io',
        'input-identifier': 'email',
        'output-identifiers': ['email'],
      },
    ],
    templates: [
      {
        title: 'Test Template A',
      },
    ],
    'api-keys': [
      {
        title: 'Test API Key A',
      },
    ],
  };

  const mergedReverse: TranscendInput = {
    'data-silos': [
      {
        title: 'Test B',
        integrationName: 'server',
      },
      {
        title: 'Test A',
        integrationName: 'server',
      },
    ],
    preflights: [
      {
        title: 'Test Enricher A',
        url: 'https://test.trancsend.io',
        'input-identifier': 'email',
        'output-identifiers': ['email'],
      },
    ],
    templates: [
      {
        title: 'Test Template A',
      },
    ],
    'api-keys': [
      {
        title: 'Test API Key A',
      },
    ],
  };

  it('should merge together', () => {
    expect(mergeTranscendInputs(test, test2)).to.deep.equal(merged);
  });

  it('should merge together in swapped order', () => {
    expect(mergeTranscendInputs(test2, test)).to.deep.equal(mergedReverse);
  });

  it('should merge legacy enrichers into preflights', () => {
    expect(
      mergeTranscendInputs(
        {
          enrichers: [
            {
              title: 'Legacy',
              'output-identifiers': ['email'],
            },
          ],
        },
        {
          preflights: [
            {
              title: 'Canonical',
              'output-identifiers': ['email'],
            },
          ],
        },
      ),
    ).to.deep.equal({
      preflights: [
        {
          title: 'Canonical',
          'output-identifiers': ['email'],
        },
        {
          title: 'Legacy',
          'output-identifiers': ['email'],
        },
      ],
    });
  });
});
