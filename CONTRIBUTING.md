# Contributing to json-humanized

Thank you for your interest in contributing! This document covers everything you need to know.

---

## Development Setup

### 1. Fork and clone

```bash
# Fork the repo on GitHub first, then:
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

All 17 tests should pass before you start making changes.

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
| `src/index.js` | Public API — `humanize`, `humanizeFile`, `humanizeString` |
| `src/humanizer.js` | Rule-based engine — field detection, value formatting |
| `src/strategies/ai.js` | Claude AI integration |
| `src/formatters/index.js` | Output formatters (plain, markdown, story, json) |
| `bin/cli.js` | CLI entry point with Commander.js |
| `test/index.test.js` | Test suite (no external test runner needed) |

---

## How to Add a New Field Type

Edit `src/humanizer.js` in the `detectKeyContext()` function:

```javascript
// Example: add support for "weight" fields
if (/(weight|mass|kg|lbs)/i.test(k)) return 'weight';
```

Then handle it in `humanizeValue()`:

```javascript
if (ctx === 'weight') return `${value} kg`;
```

Add a test in `test/index.test.js`:

```javascript
await test('formats weight fields', async () => {
  const r = await humanize({ weight_kg: 75 });
  assertContains(r, '75 kg');
});
```

---

## How to Add a New Output Format

Edit `src/formatters/index.js`:

```javascript
// 1. Add the formatter function
function formatHTML(text, meta = {}) {
  return `<article><h1>JSON Analysis</h1><pre>${text}</pre></article>`;
}

// 2. Register it in applyFormat()
case 'html': return formatHTML(text, meta);
```

Update the CLI validation in `bin/cli.js`:

```javascript
const validFormats = ['plain', 'markdown', 'story', 'json', 'html'];
```

Update README.md with the new format.

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
- No semicolons are omitted (always use them)
- Keep functions small and focused

---

## License

By contributing, you agree your changes are released under the MIT license.
