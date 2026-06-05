# Changelog

## [2.2.0] — 2026-06-03

### Fixed
- `package.json`: removed self-dependency `json-humanized` from dependencies
- `src/strategies/ai.js`: wrong model name `claude-opus-4-6` → `claude-sonnet-4-6`
- `src/strategies/ai.js`: incorrect SDK instantiation `new Anthropic.default()` — now compatible with all SDK versions
- `src/strategies/openai.js`: same SDK instantiation bug fixed; added guard for empty `choices` array (content filter / quota)
- `src/diff.js`: stale `require('./index')` created a circular dependency warning
- `src/humanizer.js`: `allSameType` logic in array handling was broken for mixed-type arrays
- `src/humanizer.js`: `TYPE_LABELS` constant declared but never used — removed
- `src/humanizer.js`: `lat` field matched datetime regex (`/(at)$/`) before latitude — fixed by reordering checks
- `src/humanizer.js`: `country` matched count regex (`count` substring) — fixed with word-boundary patterns
- `src/humanizer.js`: `processing_ms_total` matched count before duration — duration check now runs first
- `src/humanizer.js`: bare `active` field incorrectly flagged as `boolean-flag` — now requires `is_`/`has_` prefix or explicit suffix
- `src/humanizer.js`: `last_login`, `logged_at`, `sent_on`, `expires_on` and similar fields not recognised as datetime — regex extended
- `src/humanizer.js`: `at_bat` falsely matched datetime via `(^|_)(at)(_)` — `at` now only matches as a suffix (`_at$`)
- `src/humanizer.js`: boolean-flag label produced "is active is active" — leading `is_`/`has_` stripped from displayed label
- `src/index.js`: `humanizeString` double-wrapped error message: `"Invalid JSON: Invalid JSON: …"` — fixed
- `src/formatters/index.js`: XSS vulnerability — `filename` in HTML output was not escaped, allowing `<script>` injection
- `src/watch.js`: `process.removeAllListeners('SIGINT')` removed all listeners globally — replaced with targeted `process.off()`
- `src/watch.js`: unused `ESC` constant removed
- `test/index.test.js`: two duplicate YAML tests and two duplicate TOML tests removed
- `index.d.ts`: `csv`, `html` formats and `humanizeBatch`, `summarize` exports were missing from types

### Added
- `humanizeBatch(items, sharedOptions)` — humanize multiple values concurrently
- `summarize(data, maxFields?)` — single-line summary for tooltips and log lines
- Output format `csv` — compact `key=value` line for logs and spreadsheets
- Output format `html` — ready-to-embed `<article class="jh-output">` snippet
- Context type `percent` — fields like `progress_pct`, `completion_percent` → `74%`
- Context type `duration` — fields like `timeout_ms`, `elapsed_seconds` → `2.5 seconds`
- `src/formatters/index.js`: `formatCSV`, `formatHTML` exported
- `test/full_audit.js`: 88-case exhaustive audit covering all modules and edge cases

---

## [2.0.0] — 2026-05-19

### Added
- **`--diff` mode** — compare two JSON/YAML/TOML files and describe changes in plain language (local + AI modes)
- **`--watch` mode** — watch a file and re-humanize on every save
- **YAML and TOML support** — all input formats now supported via optional `js-yaml` / `@iarna/toml`
- **AI provider routing** — `--provider anthropic|openai|ollama`; Ollama runs fully locally with no API key
- **AI response caching** — identical JSON + options returns cached result instantly (`~/.jh-cache/`)
- **Config file** — `.jh.config.json` with custom field labels, field types, hidden fields, and defaults
- **Handlebars templates** — `--template report.hbs` for fully custom output rendering
- **`--max-chars` flag** — control how much JSON is sent to the AI (saves tokens on large files)
- **TypeScript types** — full `index.d.ts`, no `@types/` needed
- **`--init-config` / `--init-template`** — scaffold config and template files in one command
- **`--cache-stats` / `--cache-clear`** — manage the AI response cache from the CLI

### Changed
- `src/index.js` — now loads config, uses parsers, integrates cache and template rendering
- `src/strategies/ai.js` — refactored into a provider router
- `package.json` — version bumped to 2.0.0; added optional deps for new features

### Migration from 1.x
All existing CLI flags and the programmatic API are fully backward-compatible.

---

## [1.0.0] — 2026-05-19
- Initial release
