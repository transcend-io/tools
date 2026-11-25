#!/usr/bin/env node

/**
 * Validate the Claude marketplace + plugin manifests under this repo.
 *
 * Checks JSON parseability and required fields, and enforces the
 * Transcend Rails Agent Controls packaging rules for v1 (org marketplace
 * only): a fixed `https://mcp.withrails.ai/mcp/agent` gateway URL, no
 * Cursor-style OAuth "auth" block, and no secret literals. Intentionally
 * dependency-free (plain Node) so CI can run without pnpm bootstrap, and
 * so this check still runs when the `claude` CLI isn't installed.
 *
 * Usage: node scripts/validate-claude-plugin.mjs
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const errors = [];
const warnings = [];

const pluginNamePattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
const marketplaceNamePattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

/** Fixed gateway URL required for the v1 (org-marketplace-only) release. */
const expectedGatewayUrl = 'https://mcp.withrails.ai/mcp/agent';

/** Hostnames / product-internal strings that must not appear in committed plugin config. */
const forbiddenHostnamePatterns = [/myelin-internal\.com/i, /\.myelin\./i, /mcp\.dev\./i];

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

/** @param {string} message */
function addWarning(message) {
  warnings.push(message);
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
  if (!value.startsWith('./') && value !== '.') {
    return false;
  }
  const normalized = path.posix.normalize(value);
  return !normalized.startsWith('../') && normalized !== '..';
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
        `${context}: must not bake in product-internal hostnames (found match for ${pattern}).`,
      );
    }
  }

  for (const pattern of secretLiteralPatterns) {
    if (pattern.test(value)) {
      addError(`${context}: must not contain secret literals (API keys, JWTs, or Bearer tokens).`);
    }
  }
}

/**
 * @param {object} mcpConfig
 * @param {string} pluginName
 * @param {string} entryName
 */
function validateMcpConfig(mcpConfig, pluginName, entryName) {
  const context = `${entryName}: .mcp.json`;

  if (!mcpConfig.mcpServers || typeof mcpConfig.mcpServers !== 'object') {
    addError(`${context}: root must contain an "mcpServers" object.`);
    return;
  }

  const servers = Object.entries(mcpConfig.mcpServers);
  if (servers.length === 0) {
    addError(`${context}: "mcpServers" must declare at least one server.`);
    return;
  }

  for (const [serverName, server] of servers) {
    const serverLabel = `${context} server "${serverName}"`;

    if (!server || typeof server !== 'object' || Array.isArray(server)) {
      addError(`${serverLabel}: must be an object.`);
      continue;
    }

    if (server.command !== undefined || server.args !== undefined) {
      addError(
        `${serverLabel}: stdio fields ("command"/"args") are not allowed for this remote gateway plugin.`,
      );
    }

    if (server.auth !== undefined) {
      addError(
        `${serverLabel}: must not declare an "auth" block. Claude's MCP schema has no such field; v1 ships no auth configuration.`,
      );
    }

    if (server.oauth !== undefined) {
      addError(
        `${serverLabel}: must not declare "oauth". v1 ships no bundled auth configuration — see the plugin README's "Known gap" section.`,
      );
    }

    if (typeof server.type !== 'string' || server.type.length === 0) {
      addError(`${serverLabel}: must set "type" (e.g. "http").`);
    } else if (!['http', 'streamable-http', 'sse'].includes(server.type)) {
      addWarning(`${serverLabel}.type: unexpected value "${server.type}" for a remote server.`);
    }

    if (typeof server.url !== 'string' || server.url.length === 0) {
      addError(`${serverLabel}: remote servers require a non-empty "url".`);
    } else {
      rejectSecretsAndInternalHosts(server.url, `${serverLabel}.url`);

      if (/\$\{/.test(server.url)) {
        addError(
          `${serverLabel}.url: must be a fixed literal URL. No "\${user_config.*}" or other placeholder — Claude ignores servers that reference undeclared placeholders, and v1 ships no install-time variables.`,
        );
      } else if (
        pluginName === 'transcend-rails-agent-controls' &&
        server.url !== expectedGatewayUrl
      ) {
        addError(
          `${serverLabel}.url: must be the fixed v1 gateway URL "${expectedGatewayUrl}" (got "${server.url}").`,
        );
      }
    }

    const headers =
      server.headers && typeof server.headers === 'object' && !Array.isArray(server.headers)
        ? server.headers
        : null;
    if (headers) {
      for (const [headerName, headerValue] of Object.entries(headers)) {
        if (typeof headerValue === 'string') {
          rejectSecretsAndInternalHosts(headerValue, `${serverLabel}.headers.${headerName}`);
        }
      }
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
      `${entryName}: "name" in plugin.json must be kebab-case (letters, digits, "-", "_", ".").`,
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

  // Directory listing fields: read only by Anthropic's public directory, but
  // required by this plugin's packaging rules so a later submission doesn't
  // need a manifest rework.
  if (typeof pluginManifest.icon !== 'string' || pluginManifest.icon.length === 0) {
    addError(`${entryName}: "icon" in plugin.json is required.`);
  } else if (!isSafeRelativePath(pluginManifest.icon)) {
    addError(
      `${entryName}: "icon" must be a relative path starting with "./" (got "${pluginManifest.icon}").`,
    );
  } else if (!(await pathExists(path.resolve(pluginDir, pluginManifest.icon)))) {
    addError(`${entryName}: "icon" references missing path "${pluginManifest.icon}".`);
  }

  for (const field of ['documentationUrl', 'supportUrl', 'privacyPolicyUrl', 'termsOfServiceUrl']) {
    const value = pluginManifest[field];
    if (typeof value !== 'string' || value.length === 0) {
      addError(`${entryName}: "${field}" in plugin.json is required.`);
    } else if (!/^https:\/\//.test(value)) {
      addError(`${entryName}: "${field}" must be an "https://" URL (got "${value}").`);
    } else {
      rejectSecretsAndInternalHosts(value, `${entryName}.${field}`);
    }
  }

  // Cursor's "variables" / "logo" fields don't apply to Claude's schema.
  if (pluginManifest.variables !== undefined) {
    addError(`${entryName}: "variables" is a Cursor-only field; Claude has no equivalent.`);
  }
  if (pluginManifest.logo !== undefined) {
    addError(`${entryName}: "logo" is a Cursor-only field; Claude uses "icon".`);
  }

  const readmePath = path.join(pluginDir, 'README.md');
  if (!(await pathExists(readmePath))) {
    addError(`${entryName}: README.md is missing.`);
  }

  const mcpPath = path.join(pluginDir, '.mcp.json');
  const mcpConfig = await readJsonFile(mcpPath, `${entryName} .mcp.json`);
  if (mcpConfig) {
    validateMcpConfig(mcpConfig, entryName, entryName);
  }

  if (pluginManifest.mcpServers !== undefined) {
    addError(
      `${entryName}: inline "mcpServers" in plugin.json is not used by this plugin; keep servers in .mcp.json.`,
    );
  }
}

/**
 * @param {string} marketplaceFile
 * @param {string} marketplaceLabel
 */
async function validateMarketplace(marketplaceFile, marketplaceLabel) {
  const marketplace = await readJsonFile(marketplaceFile, marketplaceLabel);
  if (!marketplace) {
    return;
  }

  if (typeof marketplace.name !== 'string' || !marketplaceNamePattern.test(marketplace.name)) {
    addError(
      `${marketplaceLabel}: "name" must be kebab-case (letters, digits, "-", "_", ".") and start with an alphanumeric character.`,
    );
  }

  if (
    !marketplace.owner ||
    typeof marketplace.owner !== 'object' ||
    typeof marketplace.owner.name !== 'string' ||
    marketplace.owner.name.length === 0
  ) {
    addError(`${marketplaceLabel}: "owner.name" is required.`);
  }

  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
    addError(`${marketplaceLabel}: "plugins" must be a non-empty array.`);
    return;
  }

  const seenNames = new Set();
  for (const [index, entry] of marketplace.plugins.entries()) {
    const label = `${marketplaceLabel} plugins[${index}]`;

    if (!entry || typeof entry !== 'object') {
      addError(`${label} must be an object.`);
      continue;
    }

    if (typeof entry.name !== 'string' || !pluginNamePattern.test(entry.name)) {
      addError(`${label}.name must be kebab-case (letters, digits, "-", "_", ".").`);
      continue;
    }

    if (seenNames.has(entry.name)) {
      addError(`${marketplaceLabel}: duplicate plugin name "${entry.name}".`);
    }
    seenNames.add(entry.name);

    if (typeof entry.source !== 'string' || !isSafeRelativePath(entry.source)) {
      addError(`${label}.source must be a relative path starting with "./".`);
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

    const manifestPath = path.join(pluginDir, '.claude-plugin', 'plugin.json');
    const pluginManifest = await readJsonFile(manifestPath, `${entry.name} plugin manifest`);
    if (!pluginManifest) {
      continue;
    }

    await validatePluginManifest(pluginManifest, entry.name, pluginDir);
  }
}

async function main() {
  const marketplacePath = path.join(repoRoot, '.claude-plugin', 'marketplace.json');
  await validateMarketplace(marketplacePath, 'Claude marketplace manifest');
  summarizeAndExit();
}

function summarizeAndExit() {
  if (warnings.length > 0) {
    console.log('Claude plugin manifest validation warnings:');
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (errors.length > 0) {
    console.error('Claude plugin manifest validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log('Claude plugin manifest validation passed.');
}

await main();
