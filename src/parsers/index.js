'use strict';

/**
 * parsers/index.js — unified parser for JSON, YAML, and TOML.
 *
 * JSON is always available (built-in).
 * YAML requires: npm install js-yaml
 * TOML requires: npm install @iarna/toml
 *
 * If a peer dependency is missing, a clear error is thrown with install hint.
 */

const path = require('path');

// ─── helpers ─────────────────────────────────────────────────────────────────

function requireOptional(pkg, installHint) {
  try {
    return require(pkg);
  } catch {
    throw new Error(
      `Optional dependency "${pkg}" is required to parse this file.\n` +
      `Install it with: npm install ${installHint || pkg}`
    );
  }
}

function detectFormatFromExt(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.json') return 'json';
  if (ext === '.yaml' || ext === '.yml') return 'yaml';
  if (ext === '.toml') return 'toml';
  return null;
}

function detectFormatFromContent(text) {
  const trimmed = text.trimStart();
  // TOML starts with [section] or key = value
  if (/^\[[\w.]+\]/.test(trimmed) || /^\w[\w.-]*\s*=/.test(trimmed)) return 'toml';
  // JSON starts with { or [
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  // Fallback: try YAML (it's a superset of JSON anyway)
  return 'yaml';
}

// ─── parsers ─────────────────────────────────────────────────────────────────

function parseJSON(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Invalid JSON: ${err.message}`);
  }
}

function parseYAML(text) {
  const yaml = requireOptional('js-yaml', 'js-yaml');
  try {
    return yaml.load(text);
  } catch (err) {
    throw new Error(`Invalid YAML: ${err.message}`);
  }
}

function parseTOML(text) {
  const toml = requireOptional('@iarna/toml', '@iarna/toml');
  try {
    return toml.parse(text);
  } catch (err) {
    throw new Error(`Invalid TOML: ${err.message}`);
  }
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Parse text in JSON, YAML, or TOML format.
 *
 * @param {string} text       raw file contents
 * @param {string} [filePath] optional path hint for format detection
 * @param {string} [format]   explicit format override: 'json'|'yaml'|'toml'
 * @returns {*}               parsed JavaScript value
 */
function parseAny(text, filePath, format) {
  const fmt =
    format ||
    (filePath ? detectFormatFromExt(filePath) : null) ||
    detectFormatFromContent(text);

  switch (fmt) {
    case 'json': return parseJSON(text);
    case 'yaml': return parseYAML(text);
    case 'toml': return parseTOML(text);
    default:
      // Last resort: try JSON, then YAML
      try { return parseJSON(text); } catch {}
      return parseYAML(text);
  }
}

/**
 * Read and parse a file from disk.
 *
 * @param {string} filePath
 * @param {string} [formatOverride]
 * @returns {*}
 */
function parseFile(filePath, formatOverride) {
  const fs   = require('fs');
  const text = fs.readFileSync(filePath, 'utf8');
  return parseAny(text, filePath, formatOverride);
}

/**
 * List supported extensions.
 */
const SUPPORTED_EXTENSIONS = ['.json', '.yaml', '.yml', '.toml'];

module.exports = { parseAny, parseFile, SUPPORTED_EXTENSIONS };
