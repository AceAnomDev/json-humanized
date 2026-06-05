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

function formatSentence(text, meta = {}) {
  if (meta.filename) {
    return `[${meta.filename}] ${text}`;
  }
  return text;
}

// NEW: CSV-friendly one-liner: key=value pairs separated by commas
function formatCSV(text, meta = {}) {
  const parts = [];
  if (meta.filename)  parts.push(`file=${meta.filename}`);
  if (meta.engine)    parts.push(`engine=${meta.engine}`);
  if (meta.timestamp) parts.push(`timestamp=${meta.timestamp}`);
  // embed humanized text as a quoted field
  const escaped = text.replace(/"/g, '""');
  parts.push(`humanized="${escaped}"`);
  return parts.join(',');
}

// NEW: HTML snippet format — wraps output in a styled <article> block
function formatHTML(text, meta = {}) {
  const lbl   = sourceLabel(meta);
  const ts    = meta.timestamp ? new Date(meta.timestamp).toLocaleString() : '';

  // FIX: escape ALL user-controlled strings going into HTML, not just the body
  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const title   = meta.filename ? `${lbl}: ${esc(meta.filename)}` : `${lbl} Summary`;
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>\n');

  return [
    `<article class="jh-output">`,
    `  <h2 class="jh-title">${title}</h2>`,
    ts ? `  <p class="jh-timestamp"><small>Generated: ${ts}</small></p>` : '',
    `  <div class="jh-body">${escaped}</div>`,
    meta.engine ? `  <footer class="jh-footer"><small>Engine: ${meta.engine}</small></footer>` : '',
    `</article>`,
  ].filter(Boolean).join('\n');
}

function applyFormat(text, format = 'plain', meta = {}) {
  switch (format) {
    case 'markdown': return formatMarkdown(text, meta);
    case 'story':    return formatStory(text, meta);
    case 'json':     return formatJSON(text, meta);
    case 'sentence': return formatSentence(text, meta);
    case 'csv':      return formatCSV(text, meta);
    case 'html':     return formatHTML(text, meta);
    default:         return formatPlain(text, meta);
  }
}

module.exports = {
  applyFormat,
  formatPlain,
  formatMarkdown,
  formatStory,
  formatJSON,
  formatSentence,
  formatCSV,
  formatHTML,
};
