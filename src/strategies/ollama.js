'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  json-humanized · Ollama Strategy (local AI, no API key needed)
//  Requires: Ollama running at http://localhost:11434
//  Install:  https://ollama.ai
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a JSON data interpreter. Your job is to transform raw JSON into clear, natural, human-readable prose that anyone can understand — even without technical knowledge.

Rules:
1. Write in plain English. No jargon, no code, no JSON syntax in your output.
2. Describe what the data MEANS, not just what it contains.
3. Use a warm, professional tone.
4. Identify patterns: if it's a list of users, say "This is a list of 5 users…"
5. Highlight important or unusual values.
6. Group related fields logically in your description.
7. If a field looks sensitive (password, token, secret), say it's hidden — don't echo it.
8. Keep it concise but complete.
9. Never use bullet points or markdown — write flowing paragraphs.`;

/**
 * Humanize JSON using a local Ollama model
 * @param {any} data
 * @param {object} options
 * @param {string} [options.ollamaUrl='http://localhost:11434']
 * @param {string} [options.ollamaModel='llama3']
 * @param {string} [options.lang='English']
 * @param {string} [options.context='']
 * @param {number} [options.maxChars=12000]
 */
async function humanizeWithOllama(data, options = {}) {
  const {
    ollamaUrl   = process.env.OLLAMA_URL || 'http://localhost:11434',
    ollamaModel = process.env.OLLAMA_MODEL || 'llama3',
    lang        = 'English',
    context     = '',
    maxChars    = 12000,
  } = options;

  const jsonStr  = JSON.stringify(data, null, 2);
  const truncated = jsonStr.length > maxChars;
  const payload  = truncated ? jsonStr.slice(0, maxChars) + '\n\n… (truncated)' : jsonStr;

  const prompt = [
    SYSTEM_PROMPT,
    '',
    context ? `Context: ${context}` : '',
    `Output language: ${lang}`,
    truncated ? `Note: JSON was truncated (${jsonStr.length} chars, showing first ${maxChars}).` : '',
    '',
    'Here is the JSON to humanize:',
    payload,
  ].filter(Boolean).join('\n');

  // Use native fetch (Node 18+) or fall back to https module
  const url = `${ollamaUrl.replace(/\/$/, '')}/api/generate`;

  let responseText;

  try {
    const res = await fetchJSON(url, {
      model:  ollamaModel,
      prompt,
      stream: false,
    });
    responseText = res.response;
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.message.includes('ECONNREFUSED')) {
      throw new Error(
        `Cannot connect to Ollama at ${ollamaUrl}.\n` +
        'Make sure Ollama is running: https://ollama.ai\n' +
        `And that the model is pulled: ollama pull ${ollamaModel}`
      );
    }
    throw err;
  }

  return (responseText || '').trim();
}

/**
 * Check if Ollama is reachable and the model is available.
 * @param {string} baseUrl
 * @param {string} model
 * @returns {Promise<boolean>}
 */
async function checkOllamaHealth(baseUrl = 'http://localhost:11434', model = 'llama3') {
  try {
    const res = await fetchJSON(`${baseUrl.replace(/\/$/, '')}/api/tags`, null, 'GET');
    const models = (res.models || []).map(m => m.name);
    return models.some(m => m.startsWith(model));
  } catch {
    return false;
  }
}

// ─── tiny fetch helper (no deps) ─────────────────────────────────────────────

function fetchJSON(url, body, method = 'POST') {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib    = parsed.protocol === 'https:' ? require('https') : require('http');
    const data   = body ? JSON.stringify(body) : null;

    const opts = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method,
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': data ? Buffer.byteLength(data) : 0,
      },
    };

    const req = lib.request(opts, (res) => {
      let raw = '';
      res.on('data', c => { raw += c; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch {
          resolve({ response: raw });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

module.exports = { humanizeWithOllama, checkOllamaHealth };
