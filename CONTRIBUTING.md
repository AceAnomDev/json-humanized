# Contributing to json-humanized

Thank you for your interest in contributing! This document covers everything you need to know.

---

## Development Setup

### 1. Fork and clone

```bash
git clone https://github.com/YOUR_USERNAME/json-humanized.git
cd json-humanized
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run tests

```bash
npm test
```

All 43 core tests should pass. For the full audit (131 checks):

```bash
node test/full_audit.js
```

### 4. Link locally for CLI testing

```bash
npm link
jh examples/user-profile.json
```

### 5. Run the demo

```bash
node examples/demo.js
```

---

## Project Structure

| File | Purpose |
|------|---------| 
| `src/index.js` | Public API — `humanize`, `humanizeFile`, `humanizeString`, `humanizeBatch`, `summarize` |
| `src/humanizer.js` | Rule-based engine — field detection, value formatting |
| `src/diff.js` | Diff engine — compare two JSON/YAML/TOML values |
| `src/cache.js` | File-based cache for AI responses |
| `src/config.js` | Config file loader (`.jh.config.json`) |
| `src/watch.js` | File watcher — re-humanize on save |
| `src/parsers/index.js` | JSON / YAML / TOML parser |
| `src/formatters/index.js` | Output formatters: plain, markdown, story, json, sentence, csv, html |
| `src/formatters/template.js` | Handlebars template renderer |
| `src/strategies/ai.js` | AI provider router (Anthropic / OpenAI / Ollama) |
| `src/strategies/openai.js` | OpenAI provider |
| `src/strategies/ollama.js` | Ollama provider (local, no API key) |
| `bin/cli.js` | CLI entry point with Commander.js |
| `test/index.test.js` | 43 core tests (no external runner) |
| `test/full_audit.js` | 88-case exhaustive audit |

---

## How to Add a New Field Type

Edit `src/humanizer.js` in `detectKeyContext()`:

```javascript
// Example: add support for "weight" fields
// Add BEFORE the generic fallback at the bottom:
if (/(weight|mass|kg|lbs)/i.test(k)) return 'weight';
```

Then handle it in `humanizeValue()`:

```javascript
if (type === 'number') {
  // ...existing cases...
  if (ctx === 'weight') return `${value} kg`;
```

Add a test in `test/index.test.js`:

```javascript
await test('formats weight fields', async () => {
  const r = await humanize({ body_weight_kg: 75 });
  assertContains(r, '75 kg');
});
```

> **Note on ordering:** `detectKeyContext()` checks conditions top-to-bottom and returns on first match.
> Make sure your new pattern doesn't accidentally match existing field names — check for substring conflicts.

---

## How to Add a New Output Format

Edit `src/formatters/index.js`:

```javascript
// 1. Add the formatter function
function formatXML(text, meta = {}) {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<jh-output><summary>${escaped}</summary></jh-output>`;
}

// 2. Register it in applyFormat()
case 'xml': return formatXML(text, meta);

// 3. Export it
module.exports = { applyFormat, ..., formatXML };
```

Update the CLI validation in `bin/cli.js`:

```javascript
const validFormats = ['plain', 'markdown', 'story', 'json', 'sentence', 'csv', 'html', 'xml'];
```

Update `index.d.ts`:

```typescript
export type Format = 'plain' | 'markdown' | 'story' | 'json' | 'sentence' | 'csv' | 'html' | 'xml';
```

Update README.md with the new format in the CLI flags table and Output formats section.

---

## Pull Request Guidelines

1. **One PR per feature/fix** — keep changes focused
2. **All tests must pass** — run `npm test` before submitting
3. **Add tests for new features** — aim to maintain coverage
4. **Update README** if you add or change user-facing behaviour
5. **Use descriptive commit messages**:
   - `feat: add weight field detection`
   - `fix: handle empty string values`
   - `docs: update CLI examples`

---

## Reporting Issues

Please include:
- Node.js version (`node --version`)
- The command or code you ran
- The JSON input (or a minimal reproduction)
- The expected vs actual output

---

## Code Style

- `'use strict'` at the top of every file
- Single quotes for strings
- 2-space indentation
- Semicolons always used
- Keep functions small and focused

---

## License

By contributing, you agree your changes are released under the MIT license.
