'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  json-humanized · Output formatters
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Plain text formatter (default)
 */
function formatPlain(text, meta = {}) {
  const lines = [];
  if (meta.filename) {
    lines.push(`File: ${meta.filename}`);
    lines.push('─'.repeat(50));
  }
  lines.push(text);
  if (meta.engine) {
    lines.push('');
    lines.push(`[Processed by: ${meta.engine}]`);
  }
  return lines.join('\n');
}

/**
 * Markdown formatter
 */
function formatMarkdown(text, meta = {}) {
  const lines = [];

  if (meta.filename) {
    lines.push(`# JSON Analysis: \`${meta.filename}\``);
    lines.push('');
  } else {
    lines.push('# JSON Analysis');
    lines.push('');
  }

  if (meta.timestamp) {
    lines.push(`> Generated on ${new Date(meta.timestamp).toLocaleString()}`);
    lines.push('');
  }

  lines.push('## Summary');
  lines.push('');
  lines.push(text);
  lines.push('');

  if (meta.stats) {
    lines.push('## Metadata');
    lines.push('');
    lines.push(`| Field | Value |`);
    lines.push(`|-------|-------|`);
    for (const [k, v] of Object.entries(meta.stats)) {
      lines.push(`| ${k} | ${v} |`);
    }
    lines.push('');
  }

  if (meta.engine) {
    lines.push(`---`);
    lines.push(`*Processed by json-humanized (${meta.engine} engine)*`);
  }

  return lines.join('\n');
}

/**
 * Story/narrative formatter — wraps output in a storytelling frame
 */
function formatStory(text, meta = {}) {
  const lines = [];
  lines.push('━'.repeat(60));
  lines.push('  📖  THE DATA STORY');
  lines.push('━'.repeat(60));
  lines.push('');
  lines.push(text);
  lines.push('');
  lines.push('━'.repeat(60));
  if (meta.filename) {
    lines.push(`  Source: ${meta.filename}`);
  }
  return lines.join('\n');
}

/**
 * JSON formatter — outputs structured metadata alongside the description
 */
function formatJSON(text, meta = {}) {
  const output = {
    humanized: text,
    metadata: {
      engine: meta.engine || 'local',
      filename: meta.filename || null,
      timestamp: meta.timestamp || new Date().toISOString(),
      stats: meta.stats || {},
    },
  };
  return JSON.stringify(output, null, 2);
}

/**
 * Apply a named formatter
 */
function applyFormat(text, format = 'plain', meta = {}) {
  switch (format) {
    case 'markdown': return formatMarkdown(text, meta);
    case 'story':    return formatStory(text, meta);
    case 'json':     return formatJSON(text, meta);
    default:         return formatPlain(text, meta);
  }
}

module.exports = { applyFormat, formatPlain, formatMarkdown, formatStory, formatJSON };
