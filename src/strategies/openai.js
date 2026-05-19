'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  json-humanized · OpenAI Strategy
//  Requires: npm install openai
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

/**
 * Humanize JSON using the OpenAI API
 */
async function humanizeWithOpenAI(data, options = {}) {
  const {
    apiKey = process.env.OPENAI_API_KEY,
    model = 'gpt-4o-mini',
    mode = 'prose',
    lang = 'English',
    context = '',
    maxChars = 12000,
  } = options;

  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is required for OpenAI provider. ' +
      'Set it via environment variable or --api-key flag.'
    );
  }

  let OpenAI;
  try {
    OpenAI = require('openai');
  } catch {
    throw new Error(
      'The "openai" package is required for OpenAI provider.\n' +
      'Install it with: npm install openai'
    );
  }

  const client = new OpenAI.default({ apiKey });

  const jsonStr = JSON.stringify(data, null, 2);
  const truncated = jsonStr.length > maxChars;
  const payload = truncated ? jsonStr.slice(0, maxChars) + '\n\n… (truncated)' : jsonStr;

  const userMessage = [
    context ? `Context: ${context}` : '',
    `Output language: ${lang}`,
    `Output style: ${mode === 'story' ? 'narrative story' : 'clear prose paragraphs'}`,
    truncated ? `Note: JSON was truncated (${jsonStr.length} chars, showing first ${maxChars}).` : '',
    '',
    'Here is the JSON to humanize:',
    '```json',
    payload,
    '```',
  ].filter(Boolean).join('\n');

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: userMessage },
    ],
    max_tokens: 1024,
  });

  return response.choices[0].message.content.trim();
}

module.exports = { humanizeWithOpenAI };
