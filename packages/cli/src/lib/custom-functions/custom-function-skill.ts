import CUSTOM_FUNCTION_SETUP_REFERENCE_MD from '../../../../../skills/transcend-custom-functions/references/setup.md';
import CUSTOM_FUNCTION_WRITING_REFERENCE_MD from '../../../../../skills/transcend-custom-functions/references/writing-custom-functions.md';
import CUSTOM_FUNCTION_SKILL_MD from '../../../../../skills/transcend-custom-functions/SKILL.md';

/** Namespaced directory and frontmatter name for the installed Agent Skill. */
export const CUSTOM_FUNCTION_SKILL_NAME = 'transcend-custom-functions';

export {
  CUSTOM_FUNCTION_SETUP_REFERENCE_MD,
  CUSTOM_FUNCTION_SKILL_MD,
  CUSTOM_FUNCTION_WRITING_REFERENCE_MD,
};

/** One generated file in the installed Agent Skill. */
export interface CustomFunctionSkillFile {
  /** Path relative to the skill directory. */
  path: string;
  /** Complete Markdown contents. */
  contents: string;
}

/** Complete portable Agent Skill file set. */
export const CUSTOM_FUNCTION_SKILL_FILES: readonly CustomFunctionSkillFile[] = [
  { path: 'SKILL.md', contents: CUSTOM_FUNCTION_SKILL_MD },
  { path: 'references/setup.md', contents: CUSTOM_FUNCTION_SETUP_REFERENCE_MD },
  {
    path: 'references/writing-custom-functions.md',
    contents: CUSTOM_FUNCTION_WRITING_REFERENCE_MD,
  },
];
