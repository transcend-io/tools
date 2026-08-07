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
