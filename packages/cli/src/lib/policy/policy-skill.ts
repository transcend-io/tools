import POLICY_AUTHORING_REFERENCE_MD from '../../../../../skills/transcend-policy-engine/references/authoring.md';
import POLICY_PUBLISHING_REFERENCE_MD from '../../../../../skills/transcend-policy-engine/references/publishing.md';
import POLICY_SETUP_TOOLING_REFERENCE_MD from '../../../../../skills/transcend-policy-engine/references/setup-tooling.md';
import POLICY_TESTING_DEBUGGING_REFERENCE_MD from '../../../../../skills/transcend-policy-engine/references/testing-debugging.md';
import POLICY_SKILL_MD from '../../../../../skills/transcend-policy-engine/SKILL.md';
import type { AgentSkillFile } from '../scaffolding/agent-skill.js';

/** Namespaced directory and frontmatter name for the installed Agent Skill. */
export const POLICY_SKILL_NAME = 'transcend-policy-engine';

export {
  POLICY_AUTHORING_REFERENCE_MD,
  POLICY_PUBLISHING_REFERENCE_MD,
  POLICY_SETUP_TOOLING_REFERENCE_MD,
  POLICY_SKILL_MD,
  POLICY_TESTING_DEBUGGING_REFERENCE_MD,
};

/** Complete portable Policy Engine Agent Skill file set. */
export const POLICY_SKILL_FILES: readonly AgentSkillFile[] = [
  { path: 'SKILL.md', contents: POLICY_SKILL_MD },
  { path: 'references/setup-tooling.md', contents: POLICY_SETUP_TOOLING_REFERENCE_MD },
  { path: 'references/authoring.md', contents: POLICY_AUTHORING_REFERENCE_MD },
  { path: 'references/testing-debugging.md', contents: POLICY_TESTING_DEBUGGING_REFERENCE_MD },
  { path: 'references/publishing.md', contents: POLICY_PUBLISHING_REFERENCE_MD },
];
