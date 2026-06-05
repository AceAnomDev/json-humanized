'use strict';

/**
 * config.js — load and merge .jh.config.json for custom rules, field mappings,
 * default engine, format, and more.
 *
 * Config file is searched upward from cwd (like ESLint / Prettier).
 */

const fs   = require('fs');
const path = require('path');

// ─── defaults ────────────────────────────────────────────────────────────────

const DEFAULTS = {
  engine:   'local',
  format:   'plain',
  lang:     'English',
  maxChars: 12000,
  context:  '',

  /**
   * Custom field label overrides.
   * Key: exact JSON field name (or glob pattern).
   * Value: human-readable label (or null to hide the field).
   */
  fieldLabels: {},

  /**
   * Custom field type overrides.
   * Possible types: email, date, money, phone, url, id, boolean,
   *                 sensitive, coordinates, count, age, rating, text,
   *                 percent, duration
   */
  fieldTypes: {},

  /**
   * Fields to always hide (treated as sensitive).
   */
  hiddenFields: [],

  /**
   * Template file path (Handlebars .hbs) for custom output.
   */
  template: null,

  /**
   * AI provider: 'anthropic' | 'openai' | 'ollama'
   */
  aiProvider: 'anthropic',

  /**
   * Ollama base URL
   */
  ollamaUrl: 'http://localhost:11434',

  /**
   * Ollama model name
   */
  ollamaModel: 'llama3',

  /**
   * OpenAI model
   */
  openaiModel: 'gpt-4o-mini',

  /**
   * Enable AI response caching
   */
  cache: true,

  /**
   * Cache TTL in seconds (default 1 hour)
   */
  cacheTTL: 3600,
};

// ─── config file names ───────────────────────────────────────────────────────

const CONFIG_FILES = [
  '.jh.config.json',
  '.jhrc.json',
  'jh.config.json',
];

// ─── helpers ─────────────────────────────────────────────────────────────────

function findConfigFile(startDir = process.cwd()) {
  let dir = path.resolve(startDir);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    for (const name of CONFIG_FILES) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate)) return candidate;
    }

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return null;
}

function mergeDeep(target, source) {
  const result = Object.assign({}, target);
  for (const key of Object.keys(source)) {
    if (
      source[key] !== null &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      typeof target[key] === 'object' &&
      target[key] !== null
    ) {
      result[key] = mergeDeep(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// ─── glob-style pattern matching (simple: only * wildcard) ──────────────────

function matchPattern(pattern, key) {
  if (!pattern.includes('*')) return pattern === key;
  const re = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  return re.test(key);
}

// ─── public API ──────────────────────────────────────────────────────────────

function loadConfig(configPath) {
  const filePath = configPath || findConfigFile();

  if (!filePath) {
    return { config: Object.assign({}, DEFAULTS), configPath: null };
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    throw new Error(`Failed to parse config file ${filePath}: ${err.message}`);
  }

  const config = mergeDeep(DEFAULTS, raw);

  if (config.template) {
    config.template = path.resolve(path.dirname(filePath), config.template);
  }

  return { config, configPath: filePath };
}

function resolveLabel(key, fieldLabels = {}) {
  for (const pattern of Object.keys(fieldLabels)) {
    if (matchPattern(pattern, key)) {
      return fieldLabels[pattern];
    }
  }
  return null;
}

function resolveType(key, fieldTypes = {}) {
  for (const pattern of Object.keys(fieldTypes)) {
    if (matchPattern(pattern, key)) {
      return fieldTypes[pattern];
    }
  }
  return null;
}

function isHidden(key, hiddenFields = []) {
  return hiddenFields.some(pattern => matchPattern(pattern, key));
}

function generateExampleConfig() {
  const example = {
    engine:  'local',
    format:  'plain',
    lang:    'English',
    maxChars: 12000,
    cache:   true,
    fieldLabels: {
      'user_id':    'User ID',
      'txn_ref':    'Transaction reference',
      'internal_*': null,
    },
    fieldTypes: {
      'invoice_no':    'id',
      'balance':       'money',
      'created':       'date',
      'progress_pct':  'percent',
      'timeout_ms':    'duration',
    },
    hiddenFields: ['debug_*', 'internal_hash'],
    aiProvider: 'anthropic',
  };
  return JSON.stringify(example, null, 2);
}

module.exports = {
  DEFAULTS,
  loadConfig,
  resolveLabel,
  resolveType,
  isHidden,
  generateExampleConfig,
};
