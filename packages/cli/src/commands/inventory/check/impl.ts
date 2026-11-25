import {
  checkTranscendInput,
  parseTranscendYaml,
  resolveTranscendYamlCheckRules,
  TRANSCEND_YAML_CHECK_ALL_RULES,
  TranscendYamlCheckRule,
  type TranscendYamlFindingSeverity,
} from '@transcend-io/sdk';
import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { parseVariablesFromString } from '../../../lib/helpers/parseVariablesFromString.js';

/** Version of the JSON output shape */
export const INVENTORY_CHECK_RESULT_VERSION = 1;

/** Overall result of `transcend inventory check` */
export enum InventoryCheckStatus {
  /** No error-level findings */
  Passed = 'passed',
  /** At least one error-level finding */
  Failed = 'failed',
}

/** A finding in the check output */
export interface InventoryCheckFinding {
  /** `schema` for file and decode problems, otherwise the rule name */
  rule: 'schema' | TranscendYamlCheckRule;
  /** Only errors fail the check */
  severity: TranscendYamlFindingSeverity;
  /** Key path in the yml, empty when the whole file is the problem */
  path: string;
  /** Human readable explanation */
  message: string;
}

/** JSON output of `transcend inventory check` */
export interface InventoryCheckResult {
  /** Output shape version */
  version: typeof INVENTORY_CHECK_RESULT_VERSION;
  /** Checked file path */
  file: string;
  /** Opt-in rules that ran */
  rules: TranscendYamlCheckRule[];
  /** Failed when any finding has error severity */
  status: InventoryCheckStatus;
  /** All findings */
  findings: InventoryCheckFinding[];
}

/** CLI flags for `transcend inventory check`. */
export interface InventoryCheckCommandFlags {
  /** Path to the yml file */
  file: string;
  /** Opt-in rules to run, or `*` for every rule */
  rules?: (TranscendYamlCheckRule | typeof TRANSCEND_YAML_CHECK_ALL_RULES)[];
  /** Template variables */
  variables: string;
  /** Emit JSON on stdout */
  json: boolean;
}

/**
 * Validate a transcend.yml without credentials or network access.
 *
 * @param this - CLI context
 * @param flags - Command flags
 */
export async function check(
  this: LocalContext,
  { file = './transcend.yml', rules = [], variables = '', json }: InventoryCheckCommandFlags,
): Promise<void> {
  doneInputValidation(this.process);

  const ruleNames = resolveTranscendYamlCheckRules(rules);
  const vars = parseVariablesFromString(variables);
  const findings: InventoryCheckFinding[] = [];

  if (!this.fs.existsSync(file)) {
    findings.push({
      rule: 'schema',
      severity: 'error',
      path: '',
      message: `The file path does not exist on disk: ${file}. You can specify the file path using --file=./examples/transcend.yml`,
    });
  } else {
    try {
      // Same reader as inventory push
      const input = parseTranscendYaml(this.fs.readFileSync(file, 'utf8'), vars, file);
      findings.push(...checkTranscendInput(input, ruleNames));
    } catch (err) {
      findings.push({
        rule: 'schema',
        severity: 'error',
        path: '',
        message: `The shape of your yaml file is invalid with the following errors: ${err.message}`,
      });
    }
  }

  const result: InventoryCheckResult = {
    version: INVENTORY_CHECK_RESULT_VERSION,
    file,
    rules: ruleNames,
    status: findings.some(({ severity }) => severity === 'error')
      ? InventoryCheckStatus.Failed
      : InventoryCheckStatus.Passed,
    findings,
  };

  if (json) {
    this.process.stdout.write(`${JSON.stringify(result)}\n`);
  } else {
    findings.forEach(({ rule, severity, path, message }) => {
      const text = `${severity} [${rule}] ${path ? `${path}: ` : ''}${message}`;
      if (severity === 'warning') {
        this.logger.warn(colors.yellow(text));
      } else {
        this.logger.error(colors.red(text));
      }
    });
    if (result.status === InventoryCheckStatus.Passed) {
      this.logger.info(colors.green(`transcend.yml checks passed for "${file}".`));
    } else {
      this.logger.error(colors.red(`transcend.yml checks failed for "${file}".`));
    }
  }

  if (result.status === InventoryCheckStatus.Failed) {
    this.process.exitCode = 1;
  }
}
