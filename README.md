<div align="center">

# json-humanized

**Transform any JSON / YAML / TOML into natural human language**

[![npm version](https://img.shields.io/npm/v/json-humanized?color=00e5ff&style=flat-square)](https://www.npmjs.com/package/json-humanized)
[![CI](https://img.shields.io/github/actions/workflow/status/AceAnomDev/json-humanized/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/AceAnomDev/json-humanized/actions)
[![license](https://img.shields.io/npm/l/json-humanized?style=flat-square)](LICENSE)
[![node](https://img.shields.io/node/v/json-humanized?style=flat-square&color=339933)](package.json)
[![downloads](https://img.shields.io/npm/dm/json-humanized?style=flat-square&color=00ff9d)](https://www.npmjs.com/package/json-humanized)

**[Live Demo](https://aceanomdev.github.io/json-humanized)** · [Installation](#installation) · [Usage](#usage) · [API](#api) · [Config](#config-file)

</div>

---

## What it does

```bash
$ jh user.json
```

```
This JSON contains a structured object with 6 fields.
• Identifier: usr_8f3k2
• Name: "Alice Johnson"
• Email address: alice@example.com
• Age: 28 years old
• Password: *** (hidden for security)
• Balance: $4.3K
• Created: March 15, 2024 at 10:30 AM
```

Works **100% offline** (no API key needed) — or plug in Claude AI / OpenAI / Ollama for smarter descriptions.

---

## Installation

```bash
npm install -g json-humanized
```

Or use without installing:

```bash
npx json-humanized data.json
```

---

## Usage

### CLI

```bash
# Basic — local engine (offline, instant)
jh data.json

# YAML and TOML also work
jh config.yaml
jh settings.toml

# AI-powered (Claude)
jh data.json --engine ai

# AI with OpenAI
jh data.json --engine ai --provider openai

# AI with local Ollama (no API key!)
jh data.json --engine ai --provider ollama

# Output formats
jh data.json --format markdown --output report.md
jh data.json --format story
jh data.json --format json

# Diff two files
jh v1.json --diff v2.json
jh v1.json --diff v2.json --format markdown

# Watch mode — re-runs on every save
jh data.json --watch

# Stdin
echo '{"name":"Alice","age":30}' | jh --stdin

# Custom Handlebars template
jh data.json --template ./report.hbs

# Limit JSON chars sent to AI (saves tokens)
jh huge.json --engine ai --max-chars 8000

# Cache management
jh --cache-stats
jh --cache-clear

# Init config/template files
jh --init-config      # creates .jh.config.json
jh --init-template    # creates template.hbs
```

### All CLI flags

| Flag | Default | Description |
|------|---------|-------------|
| `--engine <engine>` | `local` | `local` or `ai` |
| `--provider <provider>` | `anthropic` | `anthropic`, `openai`, `ollama` |
| `--format <format>` | `plain` | `plain`, `markdown`, `story`, `json` |
| `--mode <mode>` | `structured` | `structured`, `prose`, `story` |
| `--lang <lang>` | `English` | Any language (AI only) |
| `--context <text>` | — | Context hint for AI |
| `--api-key <key>` | env var | API key override |
| `--max-chars <n>` | `12000` | Max chars sent to AI |
| `--output <file>` | stdout | Save output to file |
| `--template <file>` | — | Handlebars `.hbs` template |
| `--diff <fileB>` | — | Compare two files |
| `--watch` | — | Re-run on file changes |
| `--config <file>` | auto | Explicit config file path |
| `--cache` / `--no-cache` | `true` | Enable/disable AI caching |
| `--cache-clear` | — | Delete all cached responses |
| `--cache-stats` | — | Show cache info |
| `--init-config` | — | Generate sample config |
| `--init-template` | — | Generate sample template |
| `--stdin` | — | Read from stdin |
| `--silent` | — | No spinner, no banner |

---

## API

```js
const { humanize, humanizeFile, humanizeString } = require('json-humanized');

// Parse a JS value
const text = await humanize({ name: 'Alice', age: 30 });

// From a file (JSON, YAML, or TOML)
const text = await humanizeFile('./users.yaml', { format: 'markdown' });

// From a raw string
const text = await humanizeString('{"key":"value"}');

// AI mode with caching
const text = await humanize(data, {
  engine:    'ai',
  aiProvider: 'anthropic',  // or 'openai' | 'ollama'
  format:    'plain',
  lang:      'Russian',
  cache:     true,
  cacheTTL:  3600,
});
```

### Diff

```js
const { diff } = require('json-humanized');

// Compare two objects
const result = await diff.diff(before, after);
// "Found 3 differences: …"

// Compare two files
const result = await diff.diffFiles('v1.json', 'v2.json', { format: 'markdown' });
```

### TypeScript

Full types are included — no `@types/` package needed:

```ts
import { humanize, humanizeFile, HumanizeOptions } from 'json-humanized';

const opts: HumanizeOptions = { engine: 'ai', aiProvider: 'ollama', format: 'markdown' };
const text = await humanizeFile('./data.json', opts);
```

---

## Config file

Create `.jh.config.json` (or run `jh --init-config`) to set defaults:

```json
{
  "engine":   "local",
  "format":   "plain",
  "lang":     "English",
  "maxChars": 12000,
  "cache":    true,
  "cacheTTL": 3600,

  "fieldLabels": {
    "user_id":      "User ID",
    "txn_ref":      "Transaction reference",
    "internal_*":   null
  },

  "fieldTypes": {
    "invoice_no": "id",
    "balance":    "money"
  },

  "hiddenFields": ["debug_*", "internal_hash"],

  "aiProvider":   "anthropic",
  "ollamaUrl":    "http://localhost:11434",
  "ollamaModel":  "llama3",
  "openaiModel":  "gpt-4o-mini"
}
```

Config is searched upward from the current directory (like ESLint / Prettier).

---

## Custom templates

Create a Handlebars template (or run `jh --init-template`):

```hbs
# {{filename}}
> Generated: {{timestamp}} · Engine: {{engine}}

{{humanized}}

---
*Type: {{stats.type}}, Keys: {{stats.keys}}*
```

Use it with:

```bash
jh data.json --template ./report.hbs
```

Available template variables: `{{humanized}}`, `{{filename}}`, `{{engine}}`, `{{format}}`, `{{timestamp}}`, `{{stats.type}}`, `{{stats.keys}}`, `{{stats.items}}`

---

## AI Providers

| Provider | Env Variable | Install |
|----------|-------------|---------|
| `anthropic` (default) | `ANTHROPIC_API_KEY` | `npm install @anthropic-ai/sdk` |
| `openai` | `OPENAI_API_KEY` | `npm install openai` |
| `ollama` | none needed | [Install Ollama](https://ollama.ai) |

Optional dependencies — install only what you use.

---

## Caching

AI responses are cached by default in `~/.jh-cache/`.

- Same JSON + same options → returns cached result instantly
- Cache TTL: 1 hour (configurable)
- Override: `jh data.json --engine ai --no-cache`
- Clear all: `jh --cache-clear`
- Custom dir: `JH_CACHE_DIR=/tmp/my-cache jh data.json --engine ai`

---

## Diff

```bash
$ jh v1.json --diff v2.json

Found 3 differences:

➕ Added (1):
   + phone (phone): "555-0100"

✏  Changed (2):
   ~ name (name): "Alice" → "Alice Johnson"
   ~ balance (balance): $4.3K → $4.5K
```

```bash
# AI-powered diff (more natural language)
$ jh v1.json --diff v2.json --engine ai --lang Russian
```

---

## Watch mode

```bash
$ jh data.json --watch
```

Watches the file and re-runs humanization on every save. Supports local and AI engines.

---

## Supported file types

| Extension | Notes |
|-----------|-------|
| `.json` | Always available |
| `.yaml`, `.yml` | Requires `npm install js-yaml` |
| `.toml` | Requires `npm install @iarna/toml` |

---

## Project structure

```
json-humanized/
├── bin/
│   └── cli.js                  # CLI entry point
├── src/
│   ├── index.js                # Public API
│   ├── humanizer.js            # Rule-based engine
│   ├── config.js               # Config file loader
│   ├── cache.js                # AI response cache
│   ├── diff.js                 # Diff engine
│   ├── watch.js                # File watcher
│   ├── parsers/
│   │   └── index.js            # JSON / YAML / TOML parser
│   ├── formatters/
│   │   ├── index.js            # plain, markdown, story, json
│   │   └── template.js         # Handlebars template renderer
│   └── strategies/
│       ├── ai.js               # AI provider router
│       ├── openai.js           # OpenAI provider
│       └── ollama.js           # Ollama provider
├── docs/
│   ├── DEMO.html               # Live browser demo
│   └── ARCHITECTURE.md
├── examples/
├── test/
├── index.d.ts                  # TypeScript types
└── .jh.config.json             # (optional) project config
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Issues and PRs are welcome!

---

## License

MIT © json-humanized contributors
