'use strict';

/**
 * formatters/template.js — render humanized output via a custom Handlebars template.
 *
 * Requires: npm install handlebars
 *
 * Template variables available:
 *   {{humanized}}   — the humanized text string
 *   {{filename}}    — source filename
 *   {{engine}}      — 'local' or 'ai'
 *   {{format}}      — chosen output format
 *   {{timestamp}}   — ISO timestamp
 *   {{stats.type}}  — 'Object' | 'Array' | 'Primitive'
 *   {{stats.keys}}  — number of top-level keys (objects)
 *   {{stats.items}} — number of items (arrays)
 *
 * Example template (report.hbs):
 *   # Report: {{filename}}
 *   Generated: {{timestamp}}
 *
 *   {{humanized}}
 *
 *   ---
 *   Engine: {{engine}} | Keys: {{stats.keys}}
 */

const fs   = require('fs');
const path = require('path');

function requireHandlebars() {
  try {
    return require('handlebars');
  } catch {
    throw new Error(
      'Handlebars is required for template output.\n' +
      'Install it with: npm install handlebars'
    );
  }
}

/**
 * Compute basic stats about a parsed JSON value.
 */
function computeStats(data) {
  if (data === null || data === undefined) {
    return { type: 'Primitive', keys: 0, items: 0 };
  }
  if (Array.isArray(data)) {
    return { type: 'Array', keys: 0, items: data.length };
  }
  if (typeof data === 'object') {
    return { type: 'Object', keys: Object.keys(data).length, items: 0 };
  }
  return { type: 'Primitive', keys: 0, items: 0 };
}

/**
 * Render using a Handlebars template file.
 *
 * @param {string} humanizedText   output from the humanizer / AI engine
 * @param {string} templatePath    path to a .hbs file
 * @param {object} context         extra context merged into template vars
 * @returns {string}               rendered output
 */
function renderTemplate(humanizedText, templatePath, context = {}) {
  const Handlebars = requireHandlebars();

  const absPath = path.resolve(templatePath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Template file not found: ${absPath}`);
  }

  const source   = fs.readFileSync(absPath, 'utf8');
  const template = Handlebars.compile(source);

  const vars = {
    humanized:  humanizedText,
    filename:   context.filename  || '',
    engine:     context.engine    || 'local',
    format:     context.format    || 'plain',
    timestamp:  new Date().toISOString(),
    stats:      computeStats(context.data),
    ...context,
  };

  return template(vars);
}

/**
 * Render using an inline Handlebars template string.
 *
 * @param {string} humanizedText
 * @param {string} templateString  Handlebars template source
 * @param {object} context
 * @returns {string}
 */
function renderTemplateString(humanizedText, templateString, context = {}) {
  const Handlebars = requireHandlebars();

  const template = Handlebars.compile(templateString);

  const vars = {
    humanized:  humanizedText,
    filename:   context.filename  || '',
    engine:     context.engine    || 'local',
    format:     context.format    || 'plain',
    timestamp:  new Date().toISOString(),
    stats:      computeStats(context.data),
    ...context,
  };

  return template(vars);
}

/**
 * Generate an example .hbs template file at the given path.
 */
function generateExampleTemplate(outputPath) {
  const example = `# {{filename}}
> Generated: {{timestamp}} · Engine: {{engine}}

{{humanized}}

---
*Stats: {{stats.type}}{{#if stats.keys}}, {{stats.keys}} keys{{/if}}{{#if stats.items}}, {{stats.items}} items{{/if}}*
`;
  fs.writeFileSync(outputPath, example, 'utf8');
  return outputPath;
}

module.exports = { renderTemplate, renderTemplateString, generateExampleTemplate };
