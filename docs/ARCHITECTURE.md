# Architecture

Deep-dive into how json-humanized works internally.

---

## Data flow

```
Input (file / string / value)
        │
        ▼
   src/index.js          ← Public API layer
   humanize() / humanizeFile() / humanizeString()
        │
        ├─── engine: 'local' ──────────────────────────────────────────────────
        │        │
        │        ▼
        │   src/humanizer.js
        │   detectTopLevelShape(data)     → What is this? (array, API resp, …)
        │   buildIntro(data, shape)       → Opening sentence
        │   humanizeObject(data, depth)   → Recursive field walk
        │        │
        │        ├─ humanizeKey(key)      → "createdAt" → "created at"
        │        ├─ detectKeyContext(key) → "email", "money", "datetime", …
        │        └─ humanizeValue(v, key) → contextual formatting
        │
        └─── engine: 'ai' ─────────────────────────────────────────────────────
                 │
                 ▼
            src/strategies/ai.js
            Build system prompt + user message
            Call Claude API (claude-opus-4-5)
            Extract text from response blocks
                 │
                 ▼
        Raw text string
              │
              ▼
   src/formatters/index.js
   applyFormat(text, format, meta)
   → plain / markdown / story / json
              │
              ▼
         Final string output
```

---

## Key design decisions

### Why `commander` for CLI?

Commander is the most widely used Node.js CLI framework, well-maintained, and produces clean `--help` output with zero config. It handles argument parsing, option validation, and subcommand support if we ever need it.

### Why `ora` for spinners?

Ora is the de facto standard for CLI spinners in Node.js. Version 5 is used (not 6+) because v6+ switched to pure ESM, which would require all consuming code to be ESM too. We stay at v5 to maintain CommonJS compatibility without bundling complexity.

### Why `chalk@4` not `chalk@5`?

Same reason: chalk v5 is pure ESM. We use v4 for CommonJS compatibility.

### Why no external test runner?

The test suite in `test/index.test.js` uses only Node.js built-ins. This means:
- Zero extra install time for contributors
- No Jest/Mocha configuration files
- Works on Node 14+
- `npm test` just works

### Why optional dependency for `@anthropic-ai/sdk`?

Not all users need AI. Making it optional means:
- `npm install json-humanized` is fast (no heavy SDK)
- Users on restricted networks can use the local engine
- The package doesn't fail to install if the SDK has peer dep issues

The code in `src/strategies/ai.js` uses `require()` inside a try/catch and shows a helpful error message if the SDK isn't installed.

### Why `humanizeObject` returns a string of newlines, not an array?

Early versions returned an array of sentences and joined at the top level. This was changed so that nested objects could naturally indent their output — an array of strings can't carry indentation context across recursion levels. Returning pre-indented strings makes the recursion simpler.

---

## Adding a new strategy

Create `src/strategies/my-strategy.js`:

```javascript
'use strict';

async function humanizeWithMyStrategy(data, options = {}) {
  // ... your logic
  return 'Human-readable string';
}

module.exports = { humanizeWithMyStrategy };
```

Then register it in `src/index.js`:

```javascript
const { humanizeWithMyStrategy } = require('./strategies/my-strategy');

// In humanize():
if (engine === 'my-strategy') {
  text = await humanizeWithMyStrategy(data, options);
}
```

Add it to the CLI validation:

```javascript
const validEngines = ['local', 'ai', 'my-strategy'];
```

---

## Field context detection priority

`detectKeyContext()` in `src/humanizer.js` tests conditions in this order:

1. Exact match: `id`, `uuid`, `guid` → `identifier`
2. Suffix match: `_id` → `reference`
3. Datetime patterns: `created_at`, `timestamp`, etc.
4. Communication: email, url, phone
5. Financial: price, cost, amount, salary, etc.
6. Counts and quantities
7. Geographic: latitude, longitude
8. Security: password, token, secret, key, hash
9. Descriptive: name, title, description, bio, etc.
10. Status, type, category
11. Boolean flags: `is_*`, `has_*`, `enabled`, `active`
12. Miscellaneous: age, version, color, rating, error
13. Fallback: `generic`

The first matching condition wins.
