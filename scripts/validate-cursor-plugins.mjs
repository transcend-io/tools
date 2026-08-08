#!/usr/bin/env node

/**
 * Validate Cursor marketplace + plugin manifests under this repo.
 *
 * Checks JSON parseability and required fields so a malformed manifest
 * cannot reach a marketplace submission. Intentionally dependency-free
 * (plain Node) so CI can run without pnpm bootstrap.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const errors = [];

const pluginNamePattern = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const marketplaceNamePattern = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const variableNamePattern = /^[A-Z][A-Z0-9_]*$/;

/** JSON Schema keywords Cursor accepts on plugin variables. */
const allowedVariableSchemaKeys = new Set([
  'type',
  'title',
  'description',
  'default',
  'enum',
  'const',
  'properties',
  'required',
  'items',
  'minLength',
  'maxLength',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'minItems',
  'maxItems',
  'uniqueItems',
  'pattern',
  'format',
]);

/** Hostnames / product-internal strings that must not appear in committed plugin config. */
const forbiddenHostnamePatterns = [/myelin-internal\.com/i, /\.myelin\./i, /mcp\.dev\.myelin/i];

const secretLiteralPatterns = [
  /\bmylk_[A-Za-z0-9_-]{8,}\b/,
  /\bmylo_[A-Za-z0-9_-]{8,}\b/,
  /Bearer\s+[A-Za-z0-9._-]{20,}/,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
];

/** @param {string} message */
function addError(message) {
  errors.push(message);
}

/**
 * @param {string} targetPath
 * @returns {Promise<boolean>}
 */
async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} filePath
 * @param {string} context
 * @returns {Promise<object | null>}
 */
async function readJsonFile(filePath, context) {
  let raw;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch {
    addError(`${context} is missing: ${filePath}`);
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    addError(`${context} contains invalid JSON (${filePath}): ${detail}`);
    return null;
  }
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isSafeRelativePath(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return false;
  }
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return true;
  }
  if (path.isAbsolute(value)) {
    return false;
  }
  const normalized = path.posix.normalize(value.replace(/\\/g, '/'));
  return !normalized.startsWith('../') && normalized !== '..';
}

/**
 * @param {string} pluginDir
 * @param {string} fieldName
 * @param {string} pathValue
 * @param {string} pluginName
 */
async function validateReferencedPath(pluginDir, fieldName, pathValue, pluginName) {
  if (pathValue.startsWith('http://') || pathValue.startsWith('https://')) {
    return;
  }

  if (!isSafeRelativePath(pathValue)) {
    addError(
      `${pluginName}: field "${fieldName}" has invalid path "${pathValue}". Use a relative path without ".." or absolute prefixes.`,
    );
    return;
  }

  const resolved = path.resolve(pluginDir, pathValue);
  if (!(await pathExists(resolved))) {
    addError(`${pluginName}: field "${fieldName}" references missing path "${pathValue}".`);
  }
}

/**
 * @param {unknown} value
 * @param {string} context
 */
function rejectSecretsAndInternalHosts(value, context) {
  if (typeof value !== 'string') {
    return;
  }

  for (const pattern of forbiddenHostnamePatterns) {
    if (pattern.test(value)) {
      addError(
        `${context}: must not bake in product-internal hostnames (found match for ${pattern}). Use plugin variables instead.`,
      );
    }
  }

  for (const pattern of secretLiteralPatterns) {
    if (pattern.test(value)) {
      addError(
        `${context}: must not contain secret literals (API keys, JWTs, or Bearer tokens). Use \${VAR} placeholders.`,
      );
    }
  }
}

/**
 * Walk a JSON value and collect `${VAR}` placeholder names (not `${env:…}`).
 * @param {unknown} value
 * @param {Set<string>} out
 */
function collectPluginVariableRefs(value, out) {
  if (typeof value === 'string') {
    for (const match of value.matchAll(/\$\{([A-Z][A-Z0-9_]*)\}/g)) {
      out.add(match[1]);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectPluginVariableRefs(item, out);
    }
    return;
  }

  if (value && typeof value === 'object') {
    for (const nested of Object.values(value)) {
      collectPluginVariableRefs(nested, out);
    }
  }
}

/**
 * @param {unknown} schema
 * @param {string} context
 * @param {string[]} pathParts
 */
function validateVariableSchemaNode(schema, context, pathParts = []) {
  const label = pathParts.length > 0 ? `${context}.${pathParts.join('.')}` : context;

  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    addError(`${label}: must be a JSON Schema object.`);
    return;
  }

  /** @type {Record<string, unknown>} */
  const node = schema;

  for (const key of Object.keys(node)) {
    if (!allowedVariableSchemaKeys.has(key)) {
      addError(
        `${label}: unsupported JSON Schema keyword "${key}". Cursor only accepts a fixed subset of keywords.`,
      );
    }
  }

  if (node.type !== undefined && typeof node.type !== 'string') {
    addError(`${label}.type must be a string when present.`);
  }

  if (node.title !== undefined && typeof node.title !== 'string') {
    addError(`${label}.title must be a string when present.`);
  }

  if (node.description !== undefined && typeof node.description !== 'string') {
    addError(`${label}.description must be a string when present.`);
  }

  if (node.default !== undefined) {
    if (typeof node.default === 'string') {
      rejectSecretsAndInternalHosts(node.default, `${label}.default`);
      if (node.default.length === 0) {
        addError(`${label}.default must not be an empty string for credentials/config.`);
      }
    }
  }

  if (node.required !== undefined) {
    if (!Array.isArray(node.required) || !node.required.every((item) => typeof item === 'string')) {
      addError(`${label}.required must be an array of strings when present.`);
    }
  }

  if (node.properties !== undefined) {
    if (!node.properties || typeof node.properties !== 'object' || Array.isArray(node.properties)) {
      addError(`${label}.properties must be an object when present.`);
    } else {
      for (const [propName, propSchema] of Object.entries(node.properties)) {
        if (!variableNamePattern.test(propName)) {
          addError(
            `${label}.properties.${propName}: variable names must be UPPER_SNAKE_CASE (A-Z, digits, underscore).`,
          );
        }
        validateVariableSchemaNode(propSchema, context, [...pathParts, 'properties', propName]);

        if (
          propSchema &&
          typeof propSchema === 'object' &&
          !Array.isArray(propSchema) &&
          typeof propSchema.description === 'string' &&
          propSchema.description.trim().length < 12
        ) {
          addError(
            `${label}.properties.${propName}.description should be useful in Cursor's install prompt (too short).`,
          );
        }
      }
    }
  }

  if (node.items !== undefined) {
    validateVariableSchemaNode(node.items, context, [...pathParts, 'items']);
  }
}

/**
 * @param {unknown} variables
 * @param {string} pluginName
 * @returns {Set<string>}
 */
function validateVariablesSchema(variables, pluginName) {
  const declared = new Set();

  if (variables === undefined) {
    return declared;
  }

  const context = `${pluginName}: variables`;
  validateVariableSchemaNode(variables, context);

  if (!variables || typeof variables !== 'object' || Array.isArray(variables)) {
    return declared;
  }

  if (variables.type !== 'object') {
    addError(`${context}: top level must set "type": "object".`);
  }

  if (!variables.properties || typeof variables.properties !== 'object') {
    addError(`${context}: top level must include a "properties" object.`);
    return declared;
  }

  for (const name of Object.keys(variables.properties)) {
    declared.add(name);
  }

  if (Array.isArray(variables.required)) {
    for (const name of variables.required) {
      if (typeof name === 'string' && !declared.has(name)) {
        addError(`${context}: required entry "${name}" is not declared in properties.`);
      }
    }
  }

  return declared;
}

/**
 * Cursor-native remote OAuth `auth` block (static public client; no secret).
 * @param {unknown} auth
 * @param {string} serverLabel
 * @param {string} pluginName
 */
function validateOAuthAuthBlock(auth, serverLabel, pluginName) {
  if (!auth || typeof auth !== 'object' || Array.isArray(auth)) {
    addError(`${serverLabel}.auth: must be an object.`);
    return;
  }

  /** @type {Record<string, unknown>} */
  const block = auth;
  const allowedAuthKeys = new Set(['CLIENT_ID', 'CLIENT_SECRET', 'scopes']);

  for (const key of Object.keys(block)) {
    if (!allowedAuthKeys.has(key)) {
      addError(
        `${serverLabel}.auth: unsupported field "${key}". Cursor accepts CLIENT_ID, optional CLIENT_SECRET, and optional scopes.`,
      );
    }
  }

  if (typeof block.CLIENT_ID !== 'string' || block.CLIENT_ID.trim().length === 0) {
    addError(
      `${serverLabel}.auth.CLIENT_ID: required non-empty string (published public client id).`,
    );
  } else {
    rejectSecretsAndInternalHosts(block.CLIENT_ID, `${serverLabel}.auth.CLIENT_ID`);
    if (/\$\{/.test(block.CLIENT_ID)) {
      addError(
        `${serverLabel}.auth.CLIENT_ID: must be the published public client id literal, not a variable placeholder.`,
      );
    }
    if (pluginName === 'transcend-agent-governance' && block.CLIENT_ID !== 'myelin_cursor_plugin') {
      addError(
        `${serverLabel}.auth.CLIENT_ID: transcend-agent-governance must use published client id "myelin_cursor_plugin".`,
      );
    }
  }

  if (block.CLIENT_SECRET !== undefined) {
    addError(
      `${serverLabel}.auth.CLIENT_SECRET: must not be present — this plugin ships a public OAuth client (PKCE only; no secret).`,
    );
  }

  if (block.scopes !== undefined) {
    if (!Array.isArray(block.scopes) || block.scopes.length === 0) {
      addError(`${serverLabel}.auth.scopes: when present must be a non-empty array of strings.`);
    } else if (
      !block.scopes.every((scope) => typeof scope === 'string' && scope.trim().length > 0)
    ) {
      addError(`${serverLabel}.auth.scopes: every entry must be a non-empty string.`);
    } else {
      for (const scope of block.scopes) {
        rejectSecretsAndInternalHosts(scope, `${serverLabel}.auth.scopes`);
      }
      if (pluginName === 'transcend-agent-governance') {
        const scopeSet = new Set(block.scopes);
        if (!scopeSet.has('mcp')) {
          addError(`${serverLabel}.auth.scopes: must include "mcp".`);
        }
        if (!scopeSet.has('offline_access')) {
          addError(
            `${serverLabel}.auth.scopes: must include "offline_access" for IDE refresh / session durability.`,
          );
        }
      }
    }
  }
}

/**
 * @param {object} mcpConfig
 * @param {string} pluginName
 * @param {Set<string>} declaredVariables
 */
function validateMcpConfig(mcpConfig, pluginName, declaredVariables) {
  const context = `${pluginName}: mcp.json`;

  if (!mcpConfig.mcpServers || typeof mcpConfig.mcpServers !== 'object') {
    addError(`${context}: root must contain an "mcpServers" object.`);
    return;
  }

  const servers = Object.entries(mcpConfig.mcpServers);
  if (servers.length === 0) {
    addError(`${context}: "mcpServers" must declare at least one server.`);
    return;
  }

  const refs = new Set();
  collectPluginVariableRefs(mcpConfig, refs);

  for (const [serverName, server] of servers) {
    const serverLabel = `${context} server "${serverName}"`;

    if (!server || typeof server !== 'object' || Array.isArray(server)) {
      addError(`${serverLabel}: must be an object.`);
      continue;
    }

    if (typeof server.url !== 'string' || server.url.length === 0) {
      addError(`${serverLabel}: Streamable HTTP servers require a non-empty "url".`);
    } else {
      rejectSecretsAndInternalHosts(server.url, `${serverLabel}.url`);
      if (!/\$\{[A-Z][A-Z0-9_]*\}/.test(server.url) && /^https?:\/\//i.test(server.url)) {
        addError(
          `${serverLabel}.url: do not hardcode a gateway hostname; use \${VAR} placeholders for environment-specific values.`,
        );
      }
      if (!server.url.includes('/mcp/') || !server.url.includes('/agent')) {
        addError(
          `${serverLabel}.url: expected agent bundle path shape …/mcp/{tenant}/agent (via variables).`,
        );
      }
    }

    if (server.command !== undefined || server.args !== undefined) {
      addError(
        `${serverLabel}: stdio fields ("command"/"args") are not allowed for this remote gateway plugin.`,
      );
    }

    const hasAuth = server.auth !== undefined;
    if (hasAuth) {
      validateOAuthAuthBlock(server.auth, serverLabel, pluginName);
    }

    const headers =
      server.headers && typeof server.headers === 'object' && !Array.isArray(server.headers)
        ? server.headers
        : null;
    const authorization = headers ? (headers.Authorization ?? headers.authorization) : undefined;
    const hasBearerHeader = typeof authorization === 'string' && authorization.trim().length > 0;

    if (hasAuth && hasBearerHeader) {
      addError(
        `${serverLabel}: do not combine Cursor-native "auth" with headers.Authorization — OAuth is the primary path; keep static Bearer credentials as a documented manual fallback outside this plugin.`,
      );
    }

    if (!hasAuth && !hasBearerHeader) {
      addError(
        `${serverLabel}: require either an "auth" (OAuth) block or headers.Authorization Bearer \${VAR}.`,
      );
    }

    if (headers) {
      for (const [headerName, headerValue] of Object.entries(headers)) {
        if (typeof headerValue === 'string') {
          rejectSecretsAndInternalHosts(headerValue, `${serverLabel}.headers.${headerName}`);
        }
      }

      if (hasBearerHeader && typeof authorization === 'string') {
        rejectSecretsAndInternalHosts(authorization, `${serverLabel}.headers.Authorization`);
        if (!/^Bearer\s+\$\{[A-Z][A-Z0-9_]*\}$/.test(authorization.trim())) {
          addError(
            `${serverLabel}.headers.Authorization: must be exactly "Bearer \${CREDENTIAL_VAR}" with no literal secret.`,
          );
        }
      }
    } else if (!hasAuth) {
      addError(
        `${serverLabel}: "headers" object is required when using Bearer auth without OAuth.`,
      );
    }

    if (pluginName === 'transcend-agent-governance' && !hasAuth) {
      addError(
        `${serverLabel}: transcend-agent-governance must declare Cursor-native "auth" (public client myelin_cursor_plugin).`,
      );
    }
  }

  if (declaredVariables.has('CREDENTIAL')) {
    addError(
      `${pluginName}: plugin.json must not declare a CREDENTIAL variable — browser OAuth is primary; static credentials are a documented manual fallback only.`,
    );
  }

  for (const ref of refs) {
    if (!declaredVariables.has(ref)) {
      addError(
        `${context}: placeholder \${${ref}} is used but not declared in plugin.json "variables".`,
      );
    }
  }
}

/**
 * @param {object} pluginManifest
 * @param {string} entryName
 * @param {string} pluginDir
 */
async function validatePluginManifest(pluginManifest, entryName, pluginDir) {
  if (typeof pluginManifest.name !== 'string' || !pluginNamePattern.test(pluginManifest.name)) {
    addError(
      `${entryName}: "name" in plugin.json must be lowercase and use only alphanumerics, hyphens, and periods.`,
    );
  }

  if (pluginManifest.name && pluginManifest.name !== entryName) {
    addError(
      `${entryName}: marketplace entry name does not match plugin.json name ("${pluginManifest.name}").`,
    );
  }

  if (typeof pluginManifest.displayName !== 'string' || pluginManifest.displayName.length === 0) {
    addError(`${entryName}: "displayName" in plugin.json is required.`);
  }

  if (typeof pluginManifest.version !== 'string' || pluginManifest.version.length === 0) {
    addError(`${entryName}: "version" in plugin.json is required.`);
  }

  if (typeof pluginManifest.description !== 'string' || pluginManifest.description.length === 0) {
    addError(`${entryName}: "description" in plugin.json is required.`);
  }

  const author = pluginManifest.author;
  if (
    !author ||
    typeof author !== 'object' ||
    typeof author.name !== 'string' ||
    author.name.length === 0
  ) {
    addError(`${entryName}: "author.name" in plugin.json is required.`);
  }

  if (typeof pluginManifest.license !== 'string' || pluginManifest.license.length === 0) {
    addError(`${entryName}: "license" in plugin.json is required.`);
  }

  if (!Array.isArray(pluginManifest.keywords) || pluginManifest.keywords.length === 0) {
    addError(`${entryName}: "keywords" in plugin.json must be a non-empty array.`);
  }

  if (typeof pluginManifest.logo !== 'string' || pluginManifest.logo.length === 0) {
    addError(`${entryName}: "logo" in plugin.json is required.`);
  } else {
    await validateReferencedPath(pluginDir, 'logo', pluginManifest.logo, entryName);
  }

  const readmePath = path.join(pluginDir, 'README.md');
  if (!(await pathExists(readmePath))) {
    addError(`${entryName}: README.md is missing.`);
  }

  const declaredVariables = validateVariablesSchema(pluginManifest.variables, entryName);

  const mcpPath = path.join(pluginDir, 'mcp.json');
  if (await pathExists(mcpPath)) {
    const mcpConfig = await readJsonFile(mcpPath, `${entryName} mcp.json`);
    if (mcpConfig) {
      validateMcpConfig(mcpConfig, entryName, declaredVariables);
    }
  } else if (declaredVariables.size > 0) {
    addError(
      `${entryName}: plugin.json declares "variables" but mcp.json is missing (placeholders would be unused).`,
    );
  }
}

async function main() {
  const marketplacePath = path.join(repoRoot, '.cursor-plugin', 'marketplace.json');
  const marketplace = await readJsonFile(marketplacePath, 'Marketplace manifest');
  if (!marketplace) {
    summarizeAndExit();
    return;
  }

  if (typeof marketplace.name !== 'string' || !marketplaceNamePattern.test(marketplace.name)) {
    addError(
      'Marketplace "name" must be lowercase kebab-case and start/end with an alphanumeric character.',
    );
  }

  if (
    !marketplace.owner ||
    typeof marketplace.owner !== 'object' ||
    typeof marketplace.owner.name !== 'string' ||
    marketplace.owner.name.length === 0
  ) {
    addError('Marketplace "owner.name" is required.');
  }

  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
    addError('Marketplace "plugins" must be a non-empty array.');
    summarizeAndExit();
    return;
  }

  const seenNames = new Set();
  for (const [index, entry] of marketplace.plugins.entries()) {
    const label = `plugins[${index}]`;

    if (!entry || typeof entry !== 'object') {
      addError(`${label} must be an object.`);
      continue;
    }

    if (typeof entry.name !== 'string' || !pluginNamePattern.test(entry.name)) {
      addError(`${label}.name must be lowercase and use only alphanumerics, hyphens, and periods.`);
      continue;
    }

    if (seenNames.has(entry.name)) {
      addError(`Duplicate plugin name in marketplace manifest: "${entry.name}"`);
    }
    seenNames.add(entry.name);

    if (typeof entry.source !== 'string' || !isSafeRelativePath(entry.source)) {
      addError(`${label}.source must be a safe relative path.`);
      continue;
    }

    const pluginDir = path.join(repoRoot, entry.source);
    try {
      const stat = await fs.stat(pluginDir);
      if (!stat.isDirectory()) {
        addError(`${label}.source exists but is not a directory: ${entry.source}`);
        continue;
      }
    } catch {
      addError(`${label}.source directory is missing: ${entry.source}`);
      continue;
    }

    const manifestPath = path.join(pluginDir, '.cursor-plugin', 'plugin.json');
    const pluginManifest = await readJsonFile(manifestPath, `${entry.name} plugin manifest`);
    if (!pluginManifest) {
      continue;
    }

    await validatePluginManifest(pluginManifest, entry.name, pluginDir);
  }

  summarizeAndExit();
}

function summarizeAndExit() {
  if (errors.length > 0) {
    console.error('Cursor plugin manifest validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log('Cursor plugin manifest validation passed.');
}

await main();
