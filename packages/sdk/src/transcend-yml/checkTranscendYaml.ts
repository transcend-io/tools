import type { TranscendInput } from './codecs.js';
import { TranscendYamlCheckRule } from './enums.js';

/** Sentinel for running every opt-in rule in `parseTranscendYamlCheckRules` */
export const TRANSCEND_YAML_CHECK_ALL_RULES = '*';

/** Severity of a finding. Only `error` fails the check. */
export type TranscendYamlFindingSeverity = 'error' | 'warning';

/** A single problem found in a transcend.yml */
export interface TranscendYamlFinding {
  /** The rule that produced the finding */
  rule: TranscendYamlCheckRule;
  /** How serious the finding is */
  severity: TranscendYamlFindingSeverity;
  /** Key path in the yml, such as `consent-sites[2].owners` */
  path: string;
  /** Human readable explanation */
  message: string;
}

/** Owner values that do not name a real person or team (compared case-insensitively) */
export const PLACEHOLDER_OWNER_VALUES = ['', 'unassigned', 'tbd', 'todo'] as const;

/**
 * Whether an owner or team value names a real owner.
 * Empty strings and placeholders such as UNASSIGNED, TBD, and TODO do not count.
 *
 * @param value - Owner email or team name
 * @returns True when the value is a real owner
 */
export function isRealOwnerValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return !(PLACEHOLDER_OWNER_VALUES as readonly string[]).includes(normalized);
}

/**
 * Normalize a host for comparison with the consent manager domains.
 * Lowercases the host and drops a leading `www.`.
 * Hosts with a port are only lowercased, so they must match exactly as listed.
 *
 * @param host - Host from the yml
 * @returns Host to compare
 */
export function normalizeConsentHost(host: string): string {
  const lowered = host.trim().toLowerCase();
  if (/:\d+$/.test(lowered)) {
    return lowered;
  }
  return lowered.startsWith('www.') ? lowered.slice('www.'.length) : lowered;
}

/**
 * Every `consent-sites` row needs at least one real owner or real team.
 *
 * @param input - Parsed transcend.yml
 * @returns Findings
 */
export function checkConsentSitesHaveOwners(
  input: Pick<TranscendInput, 'consent-sites'>,
): TranscendYamlFinding[] {
  const findings: TranscendYamlFinding[] = [];
  (input['consent-sites'] ?? []).forEach((site, index) => {
    const hasOwner =
      (site.owners ?? []).some(isRealOwnerValue) || (site.teams ?? []).some(isRealOwnerValue);
    if (!hasOwner) {
      findings.push({
        rule: TranscendYamlCheckRule.ConsentSitesHaveOwners,
        severity: 'error',
        path: `consent-sites[${index}]`,
        message: `Consent site "${site.host}" has no real owner or team. Add an owner email or a team name.`,
      });
    }
  });
  return findings;
}

/**
 * Every `consent-sites` host must appear in `consent-manager.domains`.
 * The match ignores case and a leading `www.`. Hosts with a port match exactly as listed.
 *
 * @param input - Parsed transcend.yml
 * @returns Findings
 */
export function checkConsentSitesInDomains(
  input: Pick<TranscendInput, 'consent-sites' | 'consent-manager'>,
): TranscendYamlFinding[] {
  const domains = new Set(
    (input['consent-manager']?.domains ?? []).map((domain) => normalizeConsentHost(domain)),
  );
  const findings: TranscendYamlFinding[] = [];
  (input['consent-sites'] ?? []).forEach((site, index) => {
    if (!domains.has(normalizeConsentHost(site.host))) {
      findings.push({
        rule: TranscendYamlCheckRule.ConsentSitesInDomains,
        severity: 'error',
        path: `consent-sites[${index}].host`,
        message: `Consent site host "${site.host}" is not listed in consent-manager.domains.`,
      });
    }
  });
  return findings;
}

/**
 * Find the second and later occurrences of each key.
 *
 * @param keys - Keys in file order
 * @returns The duplicate entries with their index and the index of the first occurrence
 */
function findDuplicates(keys: string[]): {
  /** Index of the repeated entry */
  index: number;
  /** Index of the first entry with the same key */
  firstIndex: number;
}[] {
  const seen = new Map<string, number>();
  const duplicates: { index: number; firstIndex: number }[] = [];
  keys.forEach((key, index) => {
    const firstIndex = seen.get(key);
    if (firstIndex === undefined) {
      seen.set(key, index);
    } else {
      duplicates.push({ index, firstIndex });
    }
  });
  return duplicates;
}

/**
 * No duplicate hosts in `consent-sites`. Hosts compare case-insensitively.
 *
 * @param input - Parsed transcend.yml
 * @returns Findings
 */
export function checkUniqueConsentSiteHosts(
  input: Pick<TranscendInput, 'consent-sites'>,
): TranscendYamlFinding[] {
  const sites = input['consent-sites'] ?? [];
  return findDuplicates(sites.map((site) => site.host.trim().toLowerCase())).map(
    ({ index, firstIndex }) => ({
      rule: TranscendYamlCheckRule.UniqueConsentSiteHosts,
      severity: 'error',
      path: `consent-sites[${index}].host`,
      message: `Consent site host "${sites[index]!.host}" is already defined at consent-sites[${firstIndex}].`,
    }),
  );
}

/**
 * No duplicate `data-flows` (value and type) or `cookies` (name and isRegex).
 *
 * @param input - Parsed transcend.yml
 * @returns Findings
 */
export function checkUniqueTrackers(
  input: Pick<TranscendInput, 'data-flows' | 'cookies'>,
): TranscendYamlFinding[] {
  const findings: TranscendYamlFinding[] = [];
  const dataFlows = input['data-flows'] ?? [];
  findDuplicates(dataFlows.map((flow) => `${flow.type}|${flow.value}`)).forEach(
    ({ index, firstIndex }) => {
      findings.push({
        rule: TranscendYamlCheckRule.UniqueTrackers,
        severity: 'error',
        path: `data-flows[${index}]`,
        message: `Data flow "${dataFlows[index]!.value}" (${dataFlows[index]!.type}) is already defined at data-flows[${firstIndex}].`,
      });
    },
  );
  const cookies = input.cookies ?? [];
  findDuplicates(
    cookies.map((cookie) => `${cookie.isRegex ? 'regex' : 'literal'}|${cookie.name}`),
  ).forEach(({ index, firstIndex }) => {
    findings.push({
      rule: TranscendYamlCheckRule.UniqueTrackers,
      severity: 'error',
      path: `cookies[${index}]`,
      message: `Cookie "${cookies[index]!.name}" is already defined at cookies[${firstIndex}].`,
    });
  });
  return findings;
}

/**
 * Expand selected rules to the list that `checkTranscendInput` should run.
 *
 * @param rules - Rule names from the CLI, or `*` for every rule
 * @returns Rule names to run
 */
export function resolveTranscendYamlCheckRules(
  rules: readonly (TranscendYamlCheckRule | typeof TRANSCEND_YAML_CHECK_ALL_RULES)[],
): TranscendYamlCheckRule[] {
  return rules.includes(TRANSCEND_YAML_CHECK_ALL_RULES)
    ? Object.values(TranscendYamlCheckRule)
    : (rules as TranscendYamlCheckRule[]);
}

/**
 * Parse a comma separated list of rule names.
 * Throws when a name is not a known rule.
 * Pass `*` alone or with other names to run every rule.
 *
 * @param value - Comma separated rule names, such as `consentSitesHaveOwners,uniqueTrackers` or `*`
 * @returns Rule names, in the given order without duplicates
 */
export function parseTranscendYamlCheckRules(value: string): TranscendYamlCheckRule[] {
  const names = value
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  if (names.includes(TRANSCEND_YAML_CHECK_ALL_RULES)) {
    return Object.values(TranscendYamlCheckRule);
  }
  const valid = new Set(Object.values(TranscendYamlCheckRule));
  const unknown = names.filter((name) => !valid.has(name as TranscendYamlCheckRule));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown rule${unknown.length === 1 ? '' : 's'}: ${unknown.join(', ')}. ` +
        `Valid rules: ${TRANSCEND_YAML_CHECK_ALL_RULES}, ${Object.values(TranscendYamlCheckRule).join(', ')}.`,
    );
  }
  return [...new Set(names)] as TranscendYamlCheckRule[];
}

/**
 * Run opt-in rules against a parsed transcend.yml. No network or credentials are used.
 *
 * @param input - Parsed transcend.yml
 * @param rules - Rules to run
 * @returns Findings in rule order
 */
export function checkTranscendInput(
  input: TranscendInput,
  rules: readonly TranscendYamlCheckRule[],
): TranscendYamlFinding[] {
  const runners: Record<TranscendYamlCheckRule, (value: TranscendInput) => TranscendYamlFinding[]> =
    {
      [TranscendYamlCheckRule.ConsentSitesHaveOwners]: checkConsentSitesHaveOwners,
      [TranscendYamlCheckRule.ConsentSitesInDomains]: checkConsentSitesInDomains,
      [TranscendYamlCheckRule.UniqueConsentSiteHosts]: checkUniqueConsentSiteHosts,
      [TranscendYamlCheckRule.UniqueTrackers]: checkUniqueTrackers,
    };
  return rules.flatMap((rule) => runners[rule](input));
}
