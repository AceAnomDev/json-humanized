# Changelog

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
- **CI workflow** — GitHub Actions tests on Node 16, 18, 20; auto-publishes on `chore(release)` commits
- **Live demo** — `docs/DEMO.html` (browser-side local engine)

### Changed
- `src/index.js` — now loads config, uses parsers, integrates cache and template rendering
- `src/strategies/ai.js` — refactored into a provider router
- `package.json` — version bumped to 2.0.0; added optional deps for new features

### Migration from 1.x
All existing CLI flags and the programmatic API are fully backward-compatible.
New flags are opt-in and default to the same behaviour as v1.

## [1.0.0] — 2026-05-19
- Initial release
