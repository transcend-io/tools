import { describe, expect, it } from 'vitest';

import {
  checkConsentSitesHaveOwners,
  checkConsentSitesInDomains,
  checkTranscendInput,
  checkUniqueConsentSiteHosts,
  checkUniqueTrackers,
  isRealOwnerValue,
  normalizeConsentHost,
  parseTranscendYamlCheckRules,
} from '../checkTranscendYaml.js';
import { TranscendYamlCheckRule } from '../enums.js';

describe('isRealOwnerValue', () => {
  it.each(['', '  ', 'UNASSIGNED', 'unassigned', 'Tbd', 'TODO', ' todo '])(
    'treats %j as a placeholder',
    (value) => {
      expect(isRealOwnerValue(value)).toBe(false);
    },
  );

  it.each(['dev@example.com', 'Platform Team'])('treats %j as a real owner', (value) => {
    expect(isRealOwnerValue(value)).toBe(true);
  });
});

describe('normalizeConsentHost', () => {
  it('lowercases and drops a leading www', () => {
    expect(normalizeConsentHost('WWW.Example.com')).toBe('example.com');
  });

  it('keeps hosts with a port as listed', () => {
    expect(normalizeConsentHost('www.localhost:5173')).toBe('www.localhost:5173');
    expect(normalizeConsentHost('localhost:5173')).toBe('localhost:5173');
  });
});

describe('checkConsentSitesHaveOwners', () => {
  it('passes when each site has an owner or a team', () => {
    expect(
      checkConsentSitesHaveOwners({
        'consent-sites': [
          { host: 'a.example.com', owners: ['dev@example.com'] },
          { host: 'b.example.com', teams: ['Platform'] },
          { host: 'c.example.com', owners: ['TBD'], teams: ['Platform'] },
        ],
      }),
    ).toEqual([]);
  });

  it('passes when there are no consent sites', () => {
    expect(checkConsentSitesHaveOwners({})).toEqual([]);
  });

  it('fails for missing, empty, and placeholder owners', () => {
    const findings = checkConsentSitesHaveOwners({
      'consent-sites': [
        { host: 'none.example.com' },
        { host: 'empty.example.com', owners: [], teams: [] },
        { host: 'placeholder.example.com', owners: ['UNASSIGNED', ''], teams: ['todo'] },
        { host: 'ok.example.com', owners: ['dev@example.com'] },
      ],
    });
    expect(findings.map((finding) => finding.path)).toEqual([
      'consent-sites[0]',
      'consent-sites[1]',
      'consent-sites[2]',
    ]);
    expect(findings.every((finding) => finding.severity === 'error')).toBe(true);
    expect(findings[0]).toMatchObject({ rule: 'consentSitesHaveOwners' });
  });
});

describe('checkConsentSitesInDomains', () => {
  it('passes when hosts are listed, ignoring case and www', () => {
    expect(
      checkConsentSitesInDomains({
        'consent-manager': {
          domains: ['example.com', 'App.Example.com', 'localhost:5173'],
        },
        'consent-sites': [
          { host: 'www.example.com' },
          { host: 'app.example.com' },
          { host: 'localhost:5173' },
        ],
      }),
    ).toEqual([]);
  });

  it('fails for hosts that are not listed', () => {
    const findings = checkConsentSitesInDomains({
      'consent-manager': { domains: ['example.com'] },
      'consent-sites': [{ host: 'example.com' }, { host: 'other.example.org' }],
    });
    expect(findings).toEqual([
      {
        rule: 'consentSitesInDomains',
        severity: 'error',
        path: 'consent-sites[1].host',
        message: 'Consent site host "other.example.org" is not listed in consent-manager.domains.',
      },
    ]);
  });

  it('requires hosts with a port to match exactly', () => {
    const findings = checkConsentSitesInDomains({
      'consent-manager': { domains: ['localhost'] },
      'consent-sites': [{ host: 'localhost:5173' }],
    });
    expect(findings).toHaveLength(1);
  });

  it('fails every site when the consent manager has no domains', () => {
    expect(checkConsentSitesInDomains({ 'consent-sites': [{ host: 'example.com' }] })).toHaveLength(
      1,
    );
  });
});

describe('checkUniqueConsentSiteHosts', () => {
  it('passes for distinct hosts', () => {
    expect(
      checkUniqueConsentSiteHosts({
        'consent-sites': [{ host: 'a.example.com' }, { host: 'b.example.com' }],
      }),
    ).toEqual([]);
  });

  it('fails for repeated hosts', () => {
    const findings = checkUniqueConsentSiteHosts({
      'consent-sites': [
        { host: 'a.example.com' },
        { host: 'b.example.com' },
        { host: 'A.example.com' },
      ],
    });
    expect(findings).toEqual([
      {
        rule: 'uniqueConsentSiteHosts',
        severity: 'error',
        path: 'consent-sites[2].host',
        message: 'Consent site host "A.example.com" is already defined at consent-sites[0].',
      },
    ]);
  });
});

describe('checkUniqueTrackers', () => {
  it('passes when value and type, or name and isRegex, differ', () => {
    expect(
      checkUniqueTrackers({
        'data-flows': [
          { value: 'example.com', type: 'HOST' },
          { value: 'example.com', type: 'PATH' },
        ],
        cookies: [{ name: 'session' }, { name: 'session', isRegex: true }],
      }),
    ).toEqual([]);
  });

  it('fails for duplicate data flows and cookies', () => {
    const findings = checkUniqueTrackers({
      'data-flows': [
        { value: 'example.com', type: 'HOST' },
        { value: 'example.com', type: 'HOST' },
      ],
      cookies: [{ name: 'session' }, { name: 'session', isRegex: false }],
    });
    expect(findings.map((finding) => finding.path)).toEqual(['data-flows[1]', 'cookies[1]']);
    expect(findings.every((finding) => finding.rule === 'uniqueTrackers')).toBe(true);
  });
});

describe('parseTranscendYamlCheckRules', () => {
  it('parses a comma list and drops duplicates', () => {
    expect(
      parseTranscendYamlCheckRules('consentSitesHaveOwners, uniqueTrackers,consentSitesHaveOwners'),
    ).toEqual(['consentSitesHaveOwners', 'uniqueTrackers']);
  });

  it('returns no rules for an empty string', () => {
    expect(parseTranscendYamlCheckRules('')).toEqual([]);
  });

  it('returns every rule for *', () => {
    expect(parseTranscendYamlCheckRules('*')).toEqual(Object.values(TranscendYamlCheckRule));
  });

  it('throws for unknown rules', () => {
    expect(() => parseTranscendYamlCheckRules('nope')).toThrow(/Unknown rule: nope/);
  });
});

describe('checkTranscendInput', () => {
  it('runs only the requested rules', () => {
    const input = { 'consent-sites': [{ host: 'example.com' }] };
    expect(checkTranscendInput(input, [])).toEqual([]);
    expect(
      checkTranscendInput(input, [TranscendYamlCheckRule.ConsentSitesHaveOwners]),
    ).toHaveLength(1);
    expect(
      checkTranscendInput(input, [
        TranscendYamlCheckRule.ConsentSitesHaveOwners,
        TranscendYamlCheckRule.ConsentSitesInDomains,
      ]),
    ).toHaveLength(2);
  });
});
