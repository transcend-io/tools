import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  generateHelpTextForAllCommands,
  type Application,
  type CommandContext,
} from '@stricli/core';
import { fdir } from 'fdir';

import { app } from '../src/app';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const commandsRoot = join(packageRoot, 'src/commands');
const readmePath = join(packageRoot, 'README.md');

// eslint-disable-next-line new-cap
const docFiles = new fdir().withRelativePaths().glob('**/readme.ts').crawl(commandsRoot).sync();

// For each src/commands/**/readme.ts file, create a key-value pair of the command and the exported Markdown documentation
const additionalDocumentation: Record<string, string> = Object.fromEntries(
  await Promise.all(
    docFiles.map(async (file) => {
      const command = `transcend ${file.split('/').slice(0, -1).join(' ')}`;
      const readme = (await import(new URL(`../src/commands/${file}`, import.meta.url).href))
        .default;
      return [command, readme];
    }),
  ),
);

const helpTextForAllCommands = generateHelpTextForAllCommands(app as Application<CommandContext>);

const formattedMarkdown: string = helpTextForAllCommands
  .map(([command, helpText]) => {
    let commandDocumentation = `### \`${command}\`\n\n\`\`\`txt\n${helpText}\`\`\``;
    if (additionalDocumentation[command]) {
      commandDocumentation += `\n\n${additionalDocumentation[command]}`;
    }
    return commandDocumentation;
  })
  .join('\n');

const readme = fs.readFileSync(readmePath, 'utf8');

const newReadme = readme.replace(
  /<!-- COMMANDS_START -->[\s\S]*?<!-- COMMANDS_END -->/g,
  `<!-- COMMANDS_START -->\n${formattedMarkdown}\n<!-- COMMANDS_END -->`,
);

fs.writeFileSync(readmePath, newReadme);

execSync('doctoc README.md --title "\n## Table of Contents" --maxlevel 3', {
  cwd: packageRoot,
  stdio: 'inherit',
});
execSync('oxfmt --write README.md', { cwd: packageRoot, stdio: 'inherit' });
