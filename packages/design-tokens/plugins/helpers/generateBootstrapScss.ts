import { HEADER } from './constants';
import { valueToCss } from './valueToCss';

interface ResolvedToken {
  $type: string;
  $value: unknown;
  $description?: string;
  aliasOf?: string;
}

/**
 * Maps Bootstrap theme-color variable names to the semantic token IDs that
 * should supply their values. Only light-mode mappings are needed because
 * Bootstrap compiles a single set of Sass variables.
 */
const BOOTSTRAP_VARIABLE_MAP: Record<string, string> = {
  primary: 'background.brand.bold.default',
  secondary: 'background.neutral.default',
  dark: 'text.subtle',
  danger: 'background.danger.bold.default',
  success: 'background.success.bold.default',
  warning: 'background.warning.bold.default',
};

/**
 * Generate a Sass partial that defines Bootstrap theme-color variables
 * from resolved semantic token values. The output is meant to be imported
 * before `bootstrap/scss/bootstrap.scss`.
 */
export function generateBootstrapScss(lightTokens: Record<string, ResolvedToken>): string {
  const lines = [
    `// ${HEADER.replace('// ', '').trim()}`,
    '// Maps Bootstrap theme-color Sass variables to design-token values.',
    '// Import this partial before bootstrap/scss/bootstrap.scss.',
    '',
  ];

  for (const [varName, tokenId] of Object.entries(BOOTSTRAP_VARIABLE_MAP)) {
    const token = lightTokens[tokenId];
    if (!token) {
      throw new Error(
        `Bootstrap variable $${varName} references token "${tokenId}" ` +
          `which was not found in the resolved light-mode tokens.`,
      );
    }
    const cssValue = valueToCss(token.$value);
    lines.push(`$${varName}: ${cssValue};`);
  }

  return `${lines.join('\n')}\n`;
}
