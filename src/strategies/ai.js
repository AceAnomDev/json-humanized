'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  json-humanized · AI Strategy router
//  Supports: anthropic (default), openai, ollama
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
8. Keep it concise but complete. Aim for 3–10 sentences for simple objects, more for complex ones.
9. Never use bullet points or markdown — write flowing paragraphs.
10. If there's a list, summarize the pattern and give 1–2 concrete examples.`;

async function humanizeWithAnthropic(data, options = {}) {
  const {
    apiKey   = process.env.ANTHROPIC_API_KEY,
    model    = 'claude-opus-4-5',
    mode     = 'prose',
    lang     = 'English',
    context  = '',
    maxChars = 12000,
  } = options;

  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is required for AI mode. ' +
      'Set it via environment variable or --api-key flag. ' +
      'Alternatively, use --engine local for offline processing.'
    );
  }

  let Anthropic;
  try { Anthropic = require('@anthropic-ai/sdk'); } catch {
    throw new Error(
      'The @anthropic-ai/sdk package is required for AI mode.\n' +
      'Install it with: npm install @anthropic-ai/sdk\n' +
      'Or use --engine local for offline processing.'
    );
  }

  const client    = new Anthropic.default({ apiKey });
  const jsonStr   = JSON.stringify(data, null, 2);
  const truncated = jsonStr.length > maxChars;
  const payload   = truncated ? jsonStr.slice(0, maxChars) + '\n\n… (truncated for length)' : jsonStr;

  const userMessage = [
    context   ? `Context: ${context}` : '',
    `Output language: ${lang}`,
    `Output style: ${mode === 'story' ? 'narrative story' : mode === 'markdown' ? 'markdown report' : 'clear prose paragraphs'}`,
    truncated ? `Note: This JSON was truncated (${jsonStr.length} chars total, showing first ${maxChars}).` : '',
    '',
    'Here is the JSON to humanize:',
    '```json',
    payload,
    '```',
  ].filter(Boolean).join('\n');

  const message = await client.messages.create({
    model,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  return message.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim();
}

/**
 * Route AI humanization to the correct provider.
 * @param {any}    data
 * @param {object} options
 * @param {'anthropic'|'openai'|'ollama'} [options.aiProvider='anthropic']
 */
async function humanizeWithAI(data, options = {}) {
  const provider = options.aiProvider || options.provider || 'anthropic';

  switch (provider) {
    case 'anthropic':
      return humanizeWithAnthropic(data, options);

    case 'openai': {
      const { humanizeWithOpenAI } = require('./openai');
      return humanizeWithOpenAI(data, options);
    }

    case 'ollama': {
      const { humanizeWithOllama } = require('./ollama');
      return humanizeWithOllama(data, options);
    }

    default:
      throw new Error(`Unknown AI provider: "${provider}". Use: anthropic, openai, or ollama.`);
  }
}

module.exports = { humanizeWithAI, humanizeWithAnthropic };
