import * as fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  generateHelpTextForAllCommands,
  type Application,
  type CommandContext,
} from '@stricli/core';
import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import { app } from '../../app.js';

const allCommands: string[][] = generateHelpTextForAllCommands(
  app as Application<CommandContext>,
).map((command) => command[0].split(' ').slice(1));

// Helper function to convert kebab-case to camelCase
/**
 * Convert kebab-case to camelCase
 *
 * @param string_ - The string to convert to camelCase
 * @returns The camelCase string
 */
function kebabToCamelCase(string_: string): string {
  return string_.replaceAll(/-([a-z])/g, (_: string, letter: string) => letter.toUpperCase());
}

// Helper function to get all unique non-leaf node paths
/**
 * Get all unique non-leaf node paths
 *
 * @param commands - The commands to get the non-leaf nodes for
 * @returns The non-leaf nodes
 */
function getNonLeafNodes(commands: string[][]): Set<string> {
  const nonLeafNodes = new Set<string>();

  for (const command of commands) {
    // Add all intermediate paths (not the leaf)
    for (let index = 1; index < command.length; index += 1) {
      const partialPath = command.slice(0, index).join('/');
      nonLeafNodes.add(partialPath);
    }
  }

  return nonLeafNodes;
}

// Helper function to check if a file exists
/**
 * Check if a file exists
 *
 * @param filePath - The file path to check
 * @returns True if the file exists, false otherwise
 */
function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

const cliSourceRoot = path.resolve('src');

const migratedHelperRoots = [
  'lib/requests',
  'lib/cron',
  'lib/manual-enrichment',
  'lib/consent-manager',
  'lib/preference-management',
  'lib/oneTrust',
  'lib/graphql',
  'lib/data-inventory',
  'lib/code-scanning',
  'commands/policy/helpers',
  'lib/pooling',
];

const exactHelperFileExclusions = new Set(['src/lib/oneTrust/helpers/parseCliSyncOtArguments.ts']);

const exactDefaultAdapterInitializers = new Map([
  ['src/lib/code-scanning/types.ts', new Set(['defaultCodeScanningRuntime'])],
]);

/**
 * Convert a path to a stable slash-separated CLI source path.
 *
 * @param filePath - Absolute source file path.
 * @returns Path relative to the CLI package.
 */
function cliRelativePath(filePath: string): string {
  return `src/${path.relative(cliSourceRoot, filePath).split(path.sep).join('/')}`;
}

/**
 * Recursively list TypeScript source files without resolving their imports.
 *
 * @param rootDirectory - Directory to inspect.
 * @returns TypeScript files below the directory.
 */
function listTypeScriptFiles(rootDirectory: string): string[] {
  const files: string[] = [];

  for (const entry of fs.readdirSync(rootDirectory, { withFileTypes: true })) {
    const entryPath = path.join(rootDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTypeScriptFiles(entryPath));
    } else if (entry.isFile() && /\.tsx?$/u.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

/**
 * Determine whether a source path belongs to test-only code.
 *
 * @param filePath - Absolute source file path.
 * @returns Whether the file is test-only.
 */
function isTestSourceFile(filePath: string): boolean {
  const relativePath = cliRelativePath(filePath);
  const segments = relativePath.split('/');
  const fileName = segments.at(-1) ?? '';

  return (
    segments.some((segment) =>
      ['tests', '__tests__', '__mocks__', '__snapshots__'].includes(segment),
    ) || /\.(?:test|spec)\.tsx?$/u.test(fileName)
  );
}

/**
 * Determine whether a migrated-helper file is an executable worker or bin.
 *
 * @param filePath - Absolute source file path.
 * @returns Whether the file owns a process by design.
 */
function isWorkerOrBinSourceFile(filePath: string): boolean {
  const segments = cliRelativePath(filePath).split('/');
  const fileName = segments.at(-1) ?? '';

  return (
    segments.some((segment) => ['bin', 'bins', 'worker', 'workers'].includes(segment)) ||
    /(?:^|\.)worker\.tsx?$/u.test(fileName)
  );
}

/**
 * Parse a TypeScript source file without following its import graph.
 *
 * @param filePath - Source file to parse.
 * @returns Parsed source file.
 */
function parseSourceFile(filePath: string): ts.SourceFile {
  return ts.createSourceFile(
    filePath,
    fs.readFileSync(filePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

/**
 * Format an architecture violation with its source location and rule.
 *
 * @param sourceFile - Parsed source file.
 * @param node - Node that violates the rule.
 * @param rule - Stable rule identifier.
 * @param message - Human-readable violation.
 * @returns Diagnostic string.
 */
function architectureDiagnostic(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  rule: string,
  message: string,
): string {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return `${cliRelativePath(sourceFile.fileName)}:${position.line + 1} [${rule}] ${message}`;
}

/**
 * Check whether a binding name declares a particular identifier.
 *
 * @param name - Identifier or binding pattern.
 * @param identifier - Identifier to find.
 * @returns Whether the binding declares the identifier.
 */
function bindingDeclaresIdentifier(name: ts.BindingName, identifier: string): boolean {
  if (ts.isIdentifier(name)) {
    return name.text === identifier;
  }
  return name.elements.some(
    (element) =>
      !ts.isOmittedExpression(element) && bindingDeclaresIdentifier(element.name, identifier),
  );
}

/**
 * Check direct lexical declarations in a statement list.
 *
 * @param statements - Statements in a source file or block.
 * @param identifier - Identifier to find.
 * @returns Whether the statement list declares the identifier.
 */
function statementsDeclareIdentifier(
  statements: ts.NodeArray<ts.Statement>,
  identifier: string,
): boolean {
  return statements.some((statement) => {
    if (ts.isVariableStatement(statement)) {
      return statement.declarationList.declarations.some((declaration) =>
        bindingDeclaresIdentifier(declaration.name, identifier),
      );
    }
    if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      statement.name
    ) {
      return statement.name.text === identifier;
    }
    if (ts.isImportDeclaration(statement)) {
      const { importClause } = statement;
      if (importClause?.name?.text === identifier) {
        return true;
      }
      if (importClause?.namedBindings) {
        if (ts.isNamespaceImport(importClause.namedBindings)) {
          return importClause.namedBindings.name.text === identifier;
        }
        return importClause.namedBindings.elements.some(
          (element) => element.name.text === identifier,
        );
      }
    }
    return false;
  });
}

/**
 * Check whether an identifier is shadowed by a local lexical declaration.
 *
 * This intentionally uses syntax scopes only; it does not resolve imports.
 *
 * @param node - Identifier use to inspect.
 * @param identifier - Identifier name.
 * @param includeSourceFile - Whether top-level declarations count as shadows.
 * @returns Whether a local declaration shadows the identifier.
 */
function isIdentifierLocallyBound(
  node: ts.Identifier,
  identifier: string,
  includeSourceFile = true,
): boolean {
  for (let current: ts.Node | undefined = node.parent; current; current = current.parent) {
    if (
      (ts.isFunctionDeclaration(current) ||
        ts.isFunctionExpression(current) ||
        ts.isArrowFunction(current) ||
        ts.isMethodDeclaration(current) ||
        ts.isGetAccessorDeclaration(current) ||
        ts.isSetAccessorDeclaration(current) ||
        ts.isConstructorDeclaration(current)) &&
      current.parameters.some((parameter) => bindingDeclaresIdentifier(parameter.name, identifier))
    ) {
      return true;
    }
    if (
      (ts.isFunctionDeclaration(current) || ts.isFunctionExpression(current)) &&
      current.name?.text === identifier
    ) {
      return true;
    }
    if (
      ts.isCatchClause(current) &&
      current.variableDeclaration &&
      bindingDeclaresIdentifier(current.variableDeclaration.name, identifier)
    ) {
      return true;
    }
    if (
      (ts.isForStatement(current) ||
        ts.isForInStatement(current) ||
        ts.isForOfStatement(current)) &&
      current.initializer &&
      ts.isVariableDeclarationList(current.initializer) &&
      current.initializer.declarations.some((declaration) =>
        bindingDeclaresIdentifier(declaration.name, identifier),
      )
    ) {
      return true;
    }
    if (ts.isBlock(current) && statementsDeclareIdentifier(current.statements, identifier)) {
      return true;
    }
    if (
      includeSourceFile &&
      ts.isSourceFile(current) &&
      statementsDeclareIdentifier(current.statements, identifier)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Determine whether an identifier is only a property's declared name.
 *
 * @param node - Identifier to inspect.
 * @returns Whether it is a non-value property name.
 */
function isNonValuePropertyName(node: ts.Identifier): boolean {
  const { parent } = node;
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
    return true;
  }
  if (
    (ts.isPropertyAssignment(parent) ||
      ts.isPropertySignature(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isMethodSignature(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isGetAccessorDeclaration(parent) ||
      ts.isSetAccessorDeclaration(parent)) &&
    parent.name === node
  ) {
    return true;
  }
  return ts.isBindingElement(parent) && parent.propertyName === node;
}

/**
 * Determine whether an identifier occurs in a type-only syntax tree.
 *
 * @param node - Identifier to inspect.
 * @returns Whether the identifier has a TypeNode ancestor.
 */
function isTypeOnlyIdentifier(node: ts.Identifier): boolean {
  for (let current: ts.Node | undefined = node.parent; current; current = current.parent) {
    if (ts.isTypeNode(current)) {
      return true;
    }
    if (ts.isStatement(current) || ts.isExpressionStatement(current)) {
      return false;
    }
  }
  return false;
}

/**
 * Determine whether a runtime singleton use is inside an approved default adapter initializer.
 *
 * @param node - Singleton use.
 * @param sourceFile - Parsed source file.
 * @returns Whether the use is confined to an explicit default initializer.
 */
function isInsideDefaultAdapterInitializer(node: ts.Node, sourceFile: ts.SourceFile): boolean {
  for (let current: ts.Node | undefined = node.parent; current; current = current.parent) {
    if (ts.isVariableDeclaration(current) && current.initializer && ts.isIdentifier(current.name)) {
      const name = current.name.text;
      const isStandardDefault =
        name === 'defaultDependencies' ||
        name === 'defaultPorts' ||
        /^default.*Dependencies$/u.test(name);
      const isExactCompatibilityDefault = exactDefaultAdapterInitializers
        .get(cliRelativePath(sourceFile.fileName))
        ?.has(name);
      return isStandardDefault || isExactCompatibilityDefault === true;
    }
  }
  return false;
}

/**
 * Collect local bindings imported from the CLI singleton logger module.
 *
 * @param sourceFile - Parsed source file.
 * @returns Imported local logger binding names.
 */
function importedSingletonLoggerBindings(sourceFile: ts.SourceFile): Set<string> {
  const bindings = new Set<string>();

  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !/(?:^|\/)logger\.js$/u.test(statement.moduleSpecifier.text)
    ) {
      continue;
    }
    const { importClause } = statement;
    if (importClause?.name) {
      bindings.add(importClause.name.text);
    }
    if (importClause?.namedBindings) {
      if (ts.isNamespaceImport(importClause.namedBindings)) {
        bindings.add(importClause.namedBindings.name.text);
      } else {
        for (const element of importClause.namedBindings.elements) {
          bindings.add(element.name.text);
        }
      }
    }
  }

  return bindings;
}

/**
 * Determine whether a node is part of an import declaration.
 *
 * @param node - Node to inspect.
 * @returns Whether the node is below an import declaration.
 */
function isInsideImportDeclaration(node: ts.Node): boolean {
  for (let current: ts.Node | undefined = node.parent; current; current = current.parent) {
    if (ts.isImportDeclaration(current)) {
      return true;
    }
    if (ts.isStatement(current)) {
      return false;
    }
  }
  return false;
}

// Helper function to check if a module exports a specific variable
/**
 * Check if a file exports a specific variable
 *
 * @param filePath - The file path to check
 * @param exportName - The export name to check
 * @returns True if the export exists, false otherwise
 */
async function checkExport(filePath: string, exportName: string): Promise<boolean> {
  try {
    const importPath = pathToFileURL(path.resolve(filePath)).href;
    const module = await import(/* @vite-ignore */ importPath);

    return exportName in module && module[exportName] !== undefined;
  } catch {
    return false;
  }
}

describe('CLI Command Structure', () => {
  describe('Folder structure matches commands', () => {
    test.each(allCommands.map((cmd) => [cmd]))(
      'Command %j has corresponding folder structure',
      (command: string[]) => {
        const commandPath = path.join('src', 'commands', ...command);
        expect(fs.existsSync(commandPath), `Directory should exist: ${commandPath}`).toBe(true);
        expect(
          fs.statSync(commandPath).isDirectory(),
          `Should be a directory: ${commandPath}`,
        ).toBe(true);
      },
    );
  });

  describe('Leaf nodes have command.ts and impl.ts', () => {
    test.each(allCommands.map((cmd) => [cmd]))(
      'Command %j has command.ts and impl.ts',
      (command: string[]) => {
        const commandPath = path.join('src', 'commands', ...command);
        const commandFile = path.join(commandPath, 'command.ts');
        const implFile = path.join(commandPath, 'impl.ts');

        expect(fileExists(commandFile), `command.ts should exist: ${commandFile}`).toBe(true);
        expect(fileExists(implFile), `impl.ts should exist: ${implFile}`).toBe(true);
      },
    );
  });

  describe('Leaf node exports follow naming convention', () => {
    test.each(allCommands.map((cmd) => [cmd]))(
      'Command %j exports correctly named variables',
      async (command: string[]) => {
        const commandName = command.at(-1); // Get the leaf command name
        if (!commandName) {
          throw new Error(`Command array should not be empty: ${JSON.stringify(command)}`);
        }

        const camelCaseName = kebabToCamelCase(commandName);

        const commandPath = path.join('src', 'commands', ...command);
        const commandFile = path.join(commandPath, 'command.ts');
        const implFile = path.join(commandPath, 'impl.ts');

        // Check command.ts exports ${camelCase}Command
        const commandExportName = `${camelCaseName}Command`;
        const hasCommandExport = await checkExport(commandFile, commandExportName);
        expect(hasCommandExport, `${commandFile} should export ${commandExportName}`).toBe(true);

        // Check impl.ts exports ${camelCase} (the function)
        // For reserved keywords, allow underscore prefix
        const implExportName = camelCaseName;
        const hasImplExport = await checkExport(implFile, implExportName);
        const hasUnderscoreImplExport = await checkExport(implFile, `_${implExportName}`);
        expect(
          hasImplExport || hasUnderscoreImplExport,
          `${implFile} should export ${implExportName} or _${implExportName} (for reserved keywords)`,
        ).toBe(true);
      },
      30_000,
    );
  });

  describe('Command implementations use LocalContext dependencies', () => {
    test('No command implementation reaches into runtime globals', () => {
      const violations: string[] = [];

      for (const command of allCommands) {
        const implFile = path.join(cliSourceRoot, 'commands', ...command, 'impl.ts');
        const sourceFile = parseSourceFile(implFile);

        /**
         * Visit a syntax node and record forbidden runtime dependencies.
         *
         * @param node - Current TypeScript syntax node.
         */
        const visit = (node: ts.Node): void => {
          if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
            const moduleName = node.moduleSpecifier.text;
            if (
              moduleName === 'fs' ||
              moduleName === 'node:fs' ||
              moduleName.startsWith('node:fs/') ||
              moduleName === 'os' ||
              moduleName === 'node:os' ||
              moduleName === 'path' ||
              moduleName === 'node:path' ||
              moduleName.endsWith('/logger.js')
            ) {
              violations.push(
                architectureDiagnostic(
                  sourceFile,
                  node,
                  'command-runtime-global',
                  `imports ${moduleName}`,
                ),
              );
            }
          }

          if (ts.isIdentifier(node) && node.text === 'process') {
            const isContextProperty =
              ts.isPropertyAccessExpression(node.parent) &&
              node.parent.name === node &&
              node.parent.expression.kind === ts.SyntaxKind.ThisKeyword;
            if (
              !isContextProperty &&
              !isNonValuePropertyName(node) &&
              !isIdentifierLocallyBound(node, 'process')
            ) {
              violations.push(
                architectureDiagnostic(
                  sourceFile,
                  node,
                  'command-runtime-global',
                  'uses global process',
                ),
              );
            }
          }

          ts.forEachChild(node, visit);
        };

        visit(sourceFile);
      }

      expect(violations).toEqual([]);
    });
  });

  describe('Stack 3 dependency architecture', () => {
    test('Migrated helper roots use injected runtime dependencies operationally', () => {
      const violations: string[] = [];
      const helperFiles = migratedHelperRoots
        .flatMap((root) => listTypeScriptFiles(path.join(cliSourceRoot, root)))
        .filter(
          (filePath) =>
            !isTestSourceFile(filePath) &&
            !isWorkerOrBinSourceFile(filePath) &&
            !exactHelperFileExclusions.has(cliRelativePath(filePath)),
        );

      for (const filePath of helperFiles) {
        const sourceFile = parseSourceFile(filePath);
        const loggerBindings = importedSingletonLoggerBindings(sourceFile);

        /**
         * Visit operational syntax in one migrated helper.
         *
         * @param node - Current syntax node.
         */
        const visit = (node: ts.Node): void => {
          if (
            ts.isIdentifier(node) &&
            loggerBindings.has(node.text) &&
            !isInsideImportDeclaration(node) &&
            !isNonValuePropertyName(node) &&
            !isTypeOnlyIdentifier(node) &&
            !isIdentifierLocallyBound(node, node.text, false) &&
            !isInsideDefaultAdapterInitializer(node, sourceFile)
          ) {
            violations.push(
              architectureDiagnostic(
                sourceFile,
                node,
                'helper-singleton-logger',
                `uses imported singleton logger binding "${node.text}" outside a default adapter initializer`,
              ),
            );
          }

          if (
            (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) &&
            ts.isIdentifier(node.expression) &&
            node.expression.text === 'process' &&
            !isIdentifierLocallyBound(node.expression, 'process')
          ) {
            const memberName = ts.isPropertyAccessExpression(node)
              ? node.name.text
              : ts.isStringLiteral(node.argumentExpression)
                ? node.argumentExpression.text
                : undefined;
            if (
              memberName &&
              ['env', 'exit', 'stdin', 'stdout', 'stderr'].includes(memberName) &&
              !isInsideDefaultAdapterInitializer(node, sourceFile)
            ) {
              violations.push(
                architectureDiagnostic(
                  sourceFile,
                  node,
                  'helper-process-global',
                  `uses global process.${memberName} outside a default adapter initializer`,
                ),
              );
            }
          }

          ts.forEachChild(node, visit);
        };

        visit(sourceFile);
      }

      expect(violations, violations.join('\n')).toEqual([]);
    });

    test('Pooling commands bind context UI once and spread it into runPool', () => {
      const violations: string[] = [];
      const poolingCommands = [
        {
          filePath: 'commands/admin/chunk-csv/impl.ts',
          pluginName: 'chunkCsvPlugin',
        },
        {
          filePath: 'commands/admin/parquet-to-csv/impl.ts',
          pluginName: 'parquetToCsvPlugin',
        },
      ];

      for (const poolingCommand of poolingCommands) {
        const sourceFile = parseSourceFile(path.join(cliSourceRoot, poolingCommand.filePath));
        let importedCreatePoolingCommandUi = false;
        const uiBindings: string[] = [];
        const runPoolObjects: ts.ObjectLiteralExpression[] = [];

        for (const statement of sourceFile.statements) {
          if (
            ts.isImportDeclaration(statement) &&
            ts.isStringLiteral(statement.moduleSpecifier) &&
            statement.moduleSpecifier.text.endsWith('/lib/pooling/index.js') &&
            statement.importClause?.namedBindings &&
            ts.isNamedImports(statement.importClause.namedBindings)
          ) {
            importedCreatePoolingCommandUi = statement.importClause.namedBindings.elements.some(
              (element) =>
                (element.propertyName?.text ?? element.name.text) === 'createPoolingCommandUi' &&
                element.name.text === 'createPoolingCommandUi',
            );
          }
        }

        if (!importedCreatePoolingCommandUi) {
          violations.push(
            architectureDiagnostic(
              sourceFile,
              sourceFile,
              'pooling-command-ui',
              'must import createPoolingCommandUi from lib/pooling/index.js without aliasing',
            ),
          );
        }

        /**
         * Visit one pooling command implementation.
         *
         * @param node - Current syntax node.
         */
        const visit = (node: ts.Node): void => {
          if (
            ts.isCallExpression(node) &&
            ts.isIdentifier(node.expression) &&
            node.expression.text === 'createPoolingCommandUi'
          ) {
            const [contextArgument, pluginArgument, viewerModeArgument] = node.arguments;
            if (
              contextArgument?.kind !== ts.SyntaxKind.ThisKeyword ||
              !pluginArgument ||
              !ts.isIdentifier(pluginArgument) ||
              pluginArgument.text !== poolingCommand.pluginName ||
              !viewerModeArgument ||
              !ts.isIdentifier(viewerModeArgument) ||
              viewerModeArgument.text !== 'viewerMode' ||
              node.arguments.length !== 3
            ) {
              violations.push(
                architectureDiagnostic(
                  sourceFile,
                  node,
                  'pooling-command-ui',
                  `must call createPoolingCommandUi(this, ${poolingCommand.pluginName}, viewerMode)`,
                ),
              );
            }
            if (
              ts.isVariableDeclaration(node.parent) &&
              node.parent.initializer === node &&
              ts.isIdentifier(node.parent.name)
            ) {
              uiBindings.push(node.parent.name.text);
            } else {
              violations.push(
                architectureDiagnostic(
                  sourceFile,
                  node,
                  'pooling-command-ui',
                  'must assign createPoolingCommandUi result to a binding',
                ),
              );
            }
          }

          if (
            ts.isCallExpression(node) &&
            ts.isIdentifier(node.expression) &&
            node.expression.text === 'runPool' &&
            node.arguments[0] &&
            ts.isObjectLiteralExpression(node.arguments[0])
          ) {
            runPoolObjects.push(node.arguments[0]);
          }

          if (
            (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) &&
            (ts.isPropertyAccessExpression(node.expression) ||
              ts.isElementAccessExpression(node.expression))
          ) {
            const processAccess = node.expression;
            const processMember = ts.isPropertyAccessExpression(processAccess)
              ? processAccess.name.text
              : ts.isStringLiteral(processAccess.argumentExpression)
                ? processAccess.argumentExpression.text
                : undefined;
            const streamMember = ts.isPropertyAccessExpression(node)
              ? node.name.text
              : ts.isStringLiteral(node.argumentExpression)
                ? node.argumentExpression.text
                : undefined;
            if (
              processMember === 'process' &&
              processAccess.expression.kind === ts.SyntaxKind.ThisKeyword &&
              streamMember &&
              ['stdin', 'stdout', 'stderr'].includes(streamMember)
            ) {
              violations.push(
                architectureDiagnostic(
                  sourceFile,
                  node,
                  'pooling-command-stdio',
                  `must not use this.process.${streamMember} directly`,
                ),
              );
            }
          }

          if (
            ts.isVariableDeclaration(node) &&
            ts.isObjectBindingPattern(node.name) &&
            node.initializer &&
            (ts.isPropertyAccessExpression(node.initializer) ||
              ts.isElementAccessExpression(node.initializer))
          ) {
            const processMember = ts.isPropertyAccessExpression(node.initializer)
              ? node.initializer.name.text
              : ts.isStringLiteral(node.initializer.argumentExpression)
                ? node.initializer.argumentExpression.text
                : undefined;
            if (
              processMember === 'process' &&
              node.initializer.expression.kind === ts.SyntaxKind.ThisKeyword
            ) {
              for (const element of node.name.elements) {
                const streamMember = element.propertyName
                  ? ts.isIdentifier(element.propertyName) ||
                    ts.isStringLiteral(element.propertyName)
                    ? element.propertyName.text
                    : undefined
                  : ts.isIdentifier(element.name)
                    ? element.name.text
                    : undefined;
                if (streamMember && ['stdin', 'stdout', 'stderr'].includes(streamMember)) {
                  violations.push(
                    architectureDiagnostic(
                      sourceFile,
                      element,
                      'pooling-command-stdio',
                      `must not destructure this.process.${streamMember} directly`,
                    ),
                  );
                }
              }
            }
          }

          ts.forEachChild(node, visit);
        };

        visit(sourceFile);

        if (uiBindings.length !== 1) {
          violations.push(
            architectureDiagnostic(
              sourceFile,
              sourceFile,
              'pooling-command-ui',
              `must assign exactly one createPoolingCommandUi result; found ${uiBindings.length}`,
            ),
          );
        } else {
          const [uiBinding] = uiBindings;
          const spreadsSameBinding = runPoolObjects.some((objectLiteral) =>
            objectLiteral.properties.some(
              (property) =>
                ts.isSpreadAssignment(property) &&
                ts.isIdentifier(property.expression) &&
                property.expression.text === uiBinding,
            ),
          );
          if (!spreadsSameBinding) {
            violations.push(
              architectureDiagnostic(
                sourceFile,
                runPoolObjects[0] ?? sourceFile,
                'pooling-command-ui',
                `runPool must spread the assigned "${uiBinding}" binding`,
              ),
            );
          }
        }

        if (runPoolObjects.length === 0) {
          violations.push(
            architectureDiagnostic(
              sourceFile,
              sourceFile,
              'pooling-command-ui',
              'must call runPool with an object literal',
            ),
          );
        }
      }

      expect(violations, violations.join('\n')).toEqual([]);
    });

    test('Production source does not use Partial dependency contracts', () => {
      const violations: string[] = [];
      const productionFiles = listTypeScriptFiles(cliSourceRoot).filter(
        (filePath) => !isTestSourceFile(filePath),
      );

      for (const filePath of productionFiles) {
        const sourceFile = parseSourceFile(filePath);

        /**
         * Visit type syntax and reject partial dependency contracts.
         *
         * @param node - Current syntax node.
         */
        const visit = (node: ts.Node): void => {
          if (
            ts.isTypeReferenceNode(node) &&
            ts.isIdentifier(node.typeName) &&
            node.typeName.text === 'Partial' &&
            node.typeArguments?.some((typeArgument) => {
              let containsDependencies = false;
              /**
               * Find dependency type names nested inside the Partial argument.
               *
               * @param child - Type syntax below the argument.
               */
              const findDependencies = (child: ts.Node): void => {
                if (ts.isIdentifier(child) && /Dependencies$/u.test(child.text)) {
                  containsDependencies = true;
                }
                ts.forEachChild(child, findDependencies);
              };
              findDependencies(typeArgument);
              return containsDependencies;
            })
          ) {
            violations.push(
              architectureDiagnostic(
                sourceFile,
                node,
                'no-partial-dependencies',
                `uses ${node.getText(sourceFile)}`,
              ),
            );
          }
          ts.forEachChild(node, visit);
        };

        visit(sourceFile);
      }

      expect(violations, violations.join('\n')).toEqual([]);
    });
  });

  describe('Non-leaf nodes have routes.ts', () => {
    const nonLeafNodes = [...getNonLeafNodes(allCommands)];

    test.each(nonLeafNodes.map((node) => [node]))(
      'Non-leaf node %s has routes.ts',
      (nodePath: string) => {
        const routesFile = path.join('src', 'commands', nodePath, 'routes.ts');
        expect(fileExists(routesFile), `routes.ts should exist: ${routesFile}`).toBe(true);
      },
    );
  });

  describe('Non-leaf node exports follow naming convention', () => {
    const nonLeafNodes = [...getNonLeafNodes(allCommands)];

    test.each(nonLeafNodes.map((node) => [node]))(
      'Non-leaf node %s exports correctly named routes',
      async (nodePath: string) => {
        const parts = nodePath.split('/');
        const nodeName = parts.at(-1); // Get the last part of the path
        if (!nodeName) {
          throw new Error(`Node path should not be empty: ${nodePath}`);
        }

        const camelCaseName = kebabToCamelCase(nodeName);

        const routesFile = path.join('src', 'commands', nodePath, 'routes.ts');

        // Check routes.ts exports ${camelCase}Routes
        const routesExportName = `${camelCaseName}Routes`;
        const hasRoutesExport = await checkExport(routesFile, routesExportName);
        expect(hasRoutesExport, `${routesFile} should export ${routesExportName}`).toBe(true);
      },
    );
  });

  describe('All commands are kebab-case', () => {
    test.each(allCommands.map((cmd) => [cmd]))(
      'Command %j uses kebab-case naming',
      (command: string[]) => {
        for (const part of command) {
          // Check that the part is kebab-case (lowercase with hyphens, no other characters)
          expect(part).toMatch(/^[a-z]+(-[a-z]+)*$/);
        }
      },
    );
  });

  describe('Root app.ts exists', () => {
    test('app.ts exists at the root', () => {
      const appFile = path.join('src', 'app.ts');
      expect(fileExists(appFile), 'app.ts should exist at src/app.ts').toBe(true);
    });

    test('app.ts exports app', async () => {
      const appFile = path.join('src', 'app.ts');
      const hasAppExport = await checkExport(appFile, 'app');
      expect(hasAppExport, 'app.ts should export app').toBe(true);
    });
  });

  describe('Folder structure integrity', () => {
    test('No unexpected files in command directories', () => {
      // Required + optional files in leaf command dirs
      const requiredFiles = ['command.ts', 'impl.ts'];
      const optionalFiles = ['readme.ts', 'helpers.ts', 'types.ts', 'worker.ts', 'constants.ts'];

      // Allowed subdirectories in leaf command dirs
      const allowedDirs = ['artifacts', 'ui', 'upload', 'tests', '__mocks__', '__snapshots__'];

      for (const command of allCommands) {
        const commandPath = path.join('src', 'commands', ...command);

        const entries = fs
          .readdirSync(commandPath, { withFileTypes: true })
          .filter((e) => e.name !== '.DS_Store');

        const fileNames = entries.filter((e) => e.isFile()).map((e) => e.name);
        const dirNames = entries.filter((e) => e.isDirectory()).map((e) => e.name);

        // 1) Required files must exist
        for (const req of requiredFiles) {
          expect(fileNames.includes(req), `${commandPath} is missing required file: ${req}`).toBe(
            true,
          );
        }

        // 2) No unexpected files
        const allowedFiles = new Set([...requiredFiles, ...optionalFiles]);
        const unexpectedFiles = fileNames.filter((f) => !allowedFiles.has(f));
        expect(
          unexpectedFiles,
          `${commandPath} has unexpected files: ${unexpectedFiles.join(', ')}`,
        ).toEqual([]);

        // 3) No unexpected directories
        const unexpectedDirs = dirNames.filter((d) => !allowedDirs.includes(d));
        expect(
          unexpectedDirs,
          `${commandPath} has unexpected directories: ${unexpectedDirs.join(', ')}`,
        ).toEqual([]);
      }
    });

    test('No extra files in non-leaf directories', () => {
      const nonLeafNodes = [...getNonLeafNodes(allCommands)];

      for (const nodePath of nonLeafNodes) {
        const directoryPath = path.join('src', 'commands', nodePath);
        const items = fs.readdirSync(directoryPath).filter((item) => item !== '.DS_Store');

        // Should contain routes.ts and subdirectories, no other files
        for (const item of items) {
          const itemPath = path.join(directoryPath, item);
          const isDirectory = fs.statSync(itemPath).isDirectory();

          if (!isDirectory) {
            expect(['routes.ts', 'constants.ts', 'types.ts']).toContain(item);
          }
        }
      }
    });
  });
});
