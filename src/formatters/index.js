'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  json-humanized · Output formatters
// ─────────────────────────────────────────────────────────────────────────────

/** Derive a readable label from sourceFormat option or filename extension */
function sourceLabel(meta = {}) {
  const sf = (meta.sourceFormat || '').toLowerCase();
  if (sf === 'yaml' || sf === 'yml') return 'YAML';
  if (sf === 'toml')                 return 'TOML';
  if (sf === 'json')                 return 'JSON';
  const ext = (meta.filename || '').split('.').pop().toLowerCase();
  if (ext === 'yaml' || ext === 'yml') return 'YAML';
  if (ext === 'toml')                  return 'TOML';
  if (ext === 'json')                  return 'JSON';
  return 'Data';
}

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

function formatMarkdown(text, meta = {}) {
  const lbl   = sourceLabel(meta);
  const lines = [];

  lines.push(meta.filename
    ? `# ${lbl} Analysis: \`${meta.filename}\``
    : `# ${lbl} Analysis`);
  lines.push('');

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

function formatStory(text, meta = {}) {
  const lbl   = sourceLabel(meta);
  const lines = [];
  lines.push('━'.repeat(60));
  lines.push(`  📖  THE ${lbl.toUpperCase()} STORY`);
  lines.push('━'.repeat(60));
  lines.push('');
  lines.push(text);
  lines.push('');
  lines.push('━'.repeat(60));
  if (meta.filename) lines.push(`  Source: ${meta.filename}`);
  return lines.join('\n');
}

function formatJSON(text, meta = {}) {
  return JSON.stringify({
    humanized: text,
    metadata: {
      engine:    meta.engine    || 'local',
      filename:  meta.filename  || null,
      timestamp: meta.timestamp || new Date().toISOString(),
      stats:     meta.stats     || {},
    },
  }, null, 2);
}

function applyFormat(text, format = 'plain', meta = {}) {
  switch (format) {
    case 'markdown': return formatMarkdown(text, meta);
    case 'story':    return formatStory(text, meta);
    case 'json':     return formatJSON(text, meta);
    default:         return formatPlain(text, meta);
  }
}

module.exports = { applyFormat, formatPlain, formatMarkdown, formatStory, formatJSON };
