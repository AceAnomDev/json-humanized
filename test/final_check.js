'use strict';

/**
 * final_check.js — проверяет согласованность ВСЕХ файлов проекта
 * Не тестирует логику (это делают index.test.js и full_audit.js),
 * а проверяет что все файлы согласованы между собой.
 */

const fs   = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

let pass = 0, fail = 0;
function ok(msg)       { console.log('  ✓  ' + msg); pass++; }
function no(msg, detail) { console.log('  ✗  ' + msg + (detail ? '\n       → ' + detail : '')); fail++; }
function check(msg, cond, detail) { cond ? ok(msg) : no(msg, detail); }

function read(rel)     { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function readJSON(rel) { return JSON.parse(read(rel)); }

// ── load all files ────────────────────────────────────────────────────────────
const pkg        = readJSON('package.json');
const lock       = readJSON('package-lock.json');
const readme     = read('README.md');
const changelog  = read('CHANGELOG.md');
const contrib    = read('CONTRIBUTING.md');
const publishing = read('docs/PUBLISHING.md');
const arch       = read('docs/ARCHITECTURE.md');
const html       = read('docs/index.html');
const npmignore  = read('.npmignore');
const license    = read('LICENSE');
const dts        = read('index.d.ts');
const apiJson    = readJSON('examples/api-response.json');
const userJson   = readJSON('examples/user-profile.json');
const demo       = read('examples/demo.js');
const cliSrc     = read('bin/cli.js');
const idxSrc     = read('src/index.js');
const humSrc     = read('src/humanizer.js');
const diffSrc    = read('src/diff.js');
const cacheSrc   = read('src/cache.js');
const cfgSrc     = read('src/config.js');
const watchSrc   = read('src/watch.js');
const parsersSrc = read('src/parsers/index.js');
const fmtSrc     = read('src/formatters/index.js');
const tmplSrc    = read('src/formatters/template.js');
const aiSrc      = read('src/strategies/ai.js');
const openaiSrc  = read('src/strategies/openai.js');
const ollamaSrc  = read('src/strategies/ollama.js');

// ── VERSION consistency ───────────────────────────────────────────────────────
console.log('\n[Version consistency]');
check('package.json version',        pkg.version === '2.2.0', pkg.version);
check('package-lock.json matches',   lock.version === pkg.version, lock.version);
check('CHANGELOG has version',       changelog.includes(pkg.version));
check('README badge area',           readme.includes('json-humanized'));
check('HTML badge version',          html.includes('v' + pkg.version), 'found: ' + (html.match(/badge[^>]*>v[\d.]+/)?.[0] || 'none'));

// ── EXPORTS consistency ───────────────────────────────────────────────────────
console.log('\n[Exports — src/index.js vs index.d.ts vs README]');
const srcExports   = ['humanize','humanizeFile','humanizeString','humanizeBatch','summarize','diff','cache','config','watch'];
const dtsExports   = ['humanize','humanizeFile','humanizeString','humanizeBatch','summarize'];
const readmeExports = ['humanize','humanizeFile','humanizeString','humanizeBatch','summarize'];
for (const e of srcExports)    check('src/index.js exports ' + e,  idxSrc.includes(e));
for (const e of dtsExports)    check('index.d.ts declares ' + e,   dts.includes(e));
for (const e of readmeExports) check('README mentions ' + e,        readme.includes(e));

// ── FORMATS consistency ───────────────────────────────────────────────────────
console.log('\n[Formats — all 7 consistent across files]');
const formats = ['plain','markdown','story','json','sentence','csv','html'];
for (const f of formats) {
  check('formatters/index.js has ' + f,  fmtSrc.includes("'" + f + "'") || fmtSrc.includes('"' + f + '"'));
  check('index.d.ts Format includes ' + f, dts.includes("'" + f + "'"));
  check('CLI validFormats includes ' + f,  cliSrc.includes("'" + f + "'"));
  check('README documents ' + f,           readme.includes(f));
}

// ── AI MODEL ──────────────────────────────────────────────────────────────────
console.log('\n[AI model name]');
const correctModel = 'claude-sonnet-4-6';
const wrongModel   = 'claude-opus-4-5';
check('ai.js uses correct model',    aiSrc.includes(correctModel),   'found: ' + (aiSrc.match(/claude-[a-z0-9-]+/)?.[0]||'none'));
check('diff.js uses correct model',  diffSrc.includes(correctModel));
check('arch.md no wrong model',      !arch.includes(wrongModel),      wrongModel + ' still present');
check('ai.js no wrong model',        !aiSrc.includes(wrongModel));

// ── SDK INSTANTIATION ─────────────────────────────────────────────────────────
console.log('\n[SDK instantiation]');
check('ai.js no new Anthropic.default()',    !aiSrc.includes('new Anthropic.default('));
check('openai.js no new OpenAI.default({',   !openaiSrc.includes('new OpenAI.default({'));
check('openai.js has OpenAI.default||OpenAI', openaiSrc.includes('OpenAI.default || OpenAI'));
check('openai.js guards empty choices',       openaiSrc.includes('choices.length === 0'));

// ── SECURITY ──────────────────────────────────────────────────────────────────
console.log('\n[Security]');
check('formatters escapes HTML title',    fmtSrc.includes('esc(meta.filename)') || fmtSrc.includes("esc(String("));
check('formatters escapes HTML body',     fmtSrc.includes("replace(/</g, '&lt;')"));
check('humanizer hides sensitive fields', humSrc.includes('hidden for security'));
check('no hardcoded API keys',            !aiSrc.match(/sk-[a-zA-Z0-9]{20,}/) && !openaiSrc.match(/sk-[a-zA-Z0-9]{20,}/));

// ── CIRCULAR DEPENDENCIES ─────────────────────────────────────────────────────
console.log('\n[Circular dependencies]');
check('diff.js no require(./index)',   !diffSrc.includes("require('./index')"));
check('humanizer.js no require index', !humSrc.includes("require('./index')") && !humSrc.includes('require(\"./index\")'));

// ── DEAD CODE ─────────────────────────────────────────────────────────────────
console.log('\n[Dead code]');
check('humanizer.js no TYPE_LABELS',    !humSrc.includes('TYPE_LABELS'));
check('humanizer.js single duration',   (humSrc.match(/return 'duration'/g)||[]).length === 1);
check('humanizer.js single count',      (humSrc.match(/return 'count'/g)||[]).length === 1);
check('humanizer.js single sensitive',  (humSrc.match(/return 'sensitive'/g)||[]).length === 1);
check('cli.js no unused humanizeBatch', !cliSrc.includes('humanizeBatch'));
check('watch.js no ESC constant',       !watchSrc.includes("const ESC ="));

// ── WATCH.JS SIGNAL HANDLING ──────────────────────────────────────────────────
console.log('\n[watch.js signal handling]');
check('watch.js uses process.off not removeAllListeners', !watchSrc.includes('removeAllListeners'));
check('watch.js uses process.off(SIGINT)',  watchSrc.includes("process.off('SIGINT'"));
check('watch.js uses process.off(SIGTERM)', watchSrc.includes("process.off('SIGTERM'"));

// ── ERROR MESSAGES ────────────────────────────────────────────────────────────
console.log('\n[Error messages]');
check('humanizeString no double-wrap',  idxSrc.includes('startsWith(\'Invalid JSON\')'));
check('openai guards undefined content', openaiSrc.includes('|| ""') || openaiSrc.includes("|| ''") || openaiSrc.includes('content ||'));

// ── PACKAGE.JSON ──────────────────────────────────────────────────────────────
console.log('\n[package.json]');
check('no self-dependency',   !(pkg.dependencies||{})['json-humanized'] && !(pkg.devDependencies||{})['json-humanized']);
check('has bin.jh shortcut',  pkg.bin && pkg.bin.jh);
check('no docs/ in files[]',  !(pkg.files||[]).includes('docs/'));
check('has index.d.ts types', pkg.types === 'index.d.ts');
check('node >=16',            (pkg.engines||{}).node && pkg.engines.node.includes('16'));

// ── NPMIGNORE ─────────────────────────────────────────────────────────────────
console.log('\n[.npmignore]');
check('excludes test/',     npmignore.includes('test/'));
check('excludes docs/',     npmignore.includes('docs/'));
check('excludes .github/',  npmignore.includes('.github/'));

// ── PUBLISHING.md ─────────────────────────────────────────────────────────────
console.log('\n[PUBLISHING.md]');
check('mentions index.d.ts', publishing.includes('index.d.ts'));
check('docs/ listed as excluded in PUBLISHING', publishing.includes('docs/'));

// ── CONTRIBUTING.md ───────────────────────────────────────────────────────────
console.log('\n[CONTRIBUTING.md]');
check('test count is 43',        contrib.includes('43'));
check('mentions full_audit.js',  contrib.includes('full_audit.js'));
check('mentions humanizeBatch',  contrib.includes('humanizeBatch'));
check('mentions diff.js',        contrib.includes('diff.js'));
check('no stale html format tip', !contrib.includes('function formatHTML'));

// ── CHANGELOG ─────────────────────────────────────────────────────────────────
console.log('\n[CHANGELOG.md]');
check('has v2.2.0',             changelog.includes('2.2.0'));
check('mentions XSS fix',       changelog.includes('XSS'));
check('mentions openai choices', changelog.includes('choices'));
check('mentions double-wrap fix', changelog.includes('double'));
check('mentions watch fix',       changelog.includes('removeAll') || changelog.includes('SIGINT'));

// ── ARCHITECTURE.md ───────────────────────────────────────────────────────────
console.log('\n[ARCHITECTURE.md]');
check('correct model in arch',     arch.includes('claude-sonnet-4-6'));
check('no wrong model in arch',    !arch.includes('claude-opus-4-5'));
check('lists all 3 providers',     arch.includes('anthropic') && arch.includes('openai') && arch.includes('ollama'));
check('duration before count note', arch.indexOf('Duration') < arch.indexOf('Count'));

// ── docs/index.html ───────────────────────────────────────────────────────────
console.log('\n[docs/index.html]');
check('version v2.2.0',           html.includes('v2.2.0'));
check('no old /at/ datetime regex', !html.includes('/(created|updated|at|date|time)'));
check('has lat fix in detectCtx',   html.includes('lat|latitude'));
check('csv format option',          html.includes('<option value="csv">'));
check('html format option',         html.includes('<option value="html">'));
check('sentence format option',     html.includes('<option value="sentence">'));
check('csv handler in humanizeData', html.includes("outFmt==='csv'"));
check('html handler in humanizeData', html.includes("outFmt==='html'"));

// ── examples/api-response.json ────────────────────────────────────────────────
console.log('\n[examples/api-response.json]');
check('no raw total (money) field',   !('total' in (apiJson.data||[])[0]));
check('has order_total instead',       'order_total' in (apiJson.data||[])[0]);
check('valid JSON structure',          apiJson.data && apiJson.meta && apiJson.links);

// ── examples/user-profile.json ───────────────────────────────────────────────
console.log('\n[examples/user-profile.json]');
check('has user block',         'user' in userJson);
check('has subscription block', 'subscription' in userJson);
check('has stats block',        'stats' in userJson);
check('last_login present',     userJson.stats && 'last_login' in userJson.stats);

// ── examples/demo.js ─────────────────────────────────────────────────────────
console.log('\n[examples/demo.js]');
check('no diff.diff() bug',       !demo.includes('const { diff } = require') || !demo.includes('diff.diff('));
check('uses diffModule',          demo.includes('diffModule'));
check('shows csv format',         demo.includes("'csv'"));
check('shows html format',        demo.includes("'html'"));
check('shows humanizeBatch',      demo.includes('humanizeBatch'));
check('shows summarize',          demo.includes('summarize('));
check('demo shows 15 examples',        demo.includes('15') && demo.includes('examples'));

// ── index.d.ts ───────────────────────────────────────────────────────────────
console.log('\n[index.d.ts]');
check("d.ts has csv in Format",     dts.includes("'csv'"));
check("d.ts has html in Format",    dts.includes("'html'"));
check("d.ts has humanizeBatch",     dts.includes('humanizeBatch'));
check("d.ts has summarize",         dts.includes('summarize'));
check("d.ts has BatchItem",         dts.includes('BatchItem'));
check("d.ts has DiffModule",        dts.includes('DiffModule'));
check("d.ts has CacheModule",       dts.includes('CacheModule'));
check("d.ts has WatchModule",       dts.includes('WatchModule'));

// ── Date object handling ──────────────────────────────────────────────────────
console.log('\n[Date object handling (js-yaml)]');
check('humanizer handles instanceof Date', humSrc.includes('instanceof Date'));
check('humanizeObject handles Date',        (humSrc.match(/instanceof Date/g)||[]).length >= 2);

// ── FINAL ────────────────────────────────────────────────────────────────────
const total = pass + fail;
console.log('\n' + '═'.repeat(52));
console.log('Cross-file consistency: ' + pass + '/' + total + ' passed, ' + fail + ' failed');
if (fail === 0) console.log('✓ Every file is consistent with every other file\n');
else process.exit(1);
