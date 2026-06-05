# Architecture

Deep-dive into how json-humanized works internally.

---

## Data flow

```
Input (file / string / value)
        │
        ▼
   src/index.js          ← Public API layer
   humanize() / humanizeFile() / humanizeString() / humanizeBatch()
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
            src/strategies/ai.js         ← provider router
                 │
                 ├── anthropic → src/strategies/ai.js (claude-sonnet-4-6)
                 ├── openai   → src/strategies/openai.js (gpt-4o-mini)
                 └── ollama   → src/strategies/ollama.js (local model)
                 │
                 ▼
            Raw text string
                 │
                 ▼
   src/cache.js  ← write result to ~/.jh-cache/
        │
        ▼
   src/formatters/index.js
   applyFormat(text, format, meta)
   → plain / markdown / story / json / sentence / csv / html
        │
        ▼ (optional)
   src/formatters/template.js
   renderTemplate(text, templatePath, meta)  ← Handlebars
        │
        ▼
   Final string output
```

---

## Key design decisions

### Why `commander` for CLI?

Commander is the most widely used Node.js CLI framework, well-maintained, and produces clean `--help` output with zero config.

### Why `ora@5` / `chalk@4` not v6/v5?

Both v6+ (ora) and v5+ (chalk) switched to pure ESM. We stay at v5/v4 to maintain CommonJS compatibility without bundling complexity.

### Why no external test runner?

The test suite uses only Node.js built-ins. Zero extra install time, no Jest/Mocha config, works on Node 14+.

### Why optional dependency for `@anthropic-ai/sdk`?

Not all users need AI. Making it optional means `npm install json-humanized` is fast, and the package doesn't fail to install if the SDK has peer dep issues.

### Why `humanizeObject` returns a pre-indented string?

Early versions returned an array of sentences joined at the top level. Returning pre-indented strings makes recursion simpler — an array can't carry indentation context across levels.

---

## Adding a new AI strategy

Create `src/strategies/my-strategy.js`:

```javascript
'use strict';

async function humanizeWithMyStrategy(data, options = {}) {
  // ... your logic
  return 'Human-readable string';
}

module.exports = { humanizeWithMyStrategy };
```

Register it in `src/strategies/ai.js`:

```javascript
case 'my-strategy': {
  const { humanizeWithMyStrategy } = require('./my-strategy');
  return humanizeWithMyStrategy(data, options);
}
```

Add it to the CLI validation in `bin/cli.js`:

```javascript
const validProviders = ['anthropic', 'openai', 'ollama', 'my-strategy'];
```

---

## Field context detection priority

`detectKeyContext()` in `src/humanizer.js` tests conditions in this order:

1. Exact match: `id`, `uuid`, `guid` → `identifier`
2. Suffix: `_id` → `reference`
3. Latitude / longitude (must beat datetime — `lat` ends in `at`)
4. Datetime: `created_at`, `timestamp`, `last_login`, `sent_on`, etc.
5. Email, URL, phone
6. Money: price, salary, balance, etc.
7. Duration (must beat count — `processing_ms_total` has both `ms` and `_total`)
8. Count: `*_count`, `total`, `qty`, `size`, etc.
9. Sensitive: `password`, `token`, `secret`, `key`, `hash`
10. Name, description, status, category
11. Boolean flags: `is_*`, `has_*`, `enabled`, `*_active`
12. Age, version, color, location, rating, error
13. Percent, duration (already handled at #7)
14. Fallback: `generic`

**The first matching condition wins.** Order matters — several patterns overlap intentionally.
