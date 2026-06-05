'use strict';

const { detectKeyContext, humanizeValue, humanizeKey, formatMoney, formatDuration, humanizeLocal, humanizeToSentence, summarize } = require('../src/humanizer');
const { humanize, humanizeFile, humanizeString, humanizeBatch } = require('../src/index');
const { diff } = require('../src/diff');
const { applyFormat } = require('../src/formatters/index');
const { renderTemplateString } = require('../src/formatters/template');
const { parseAny } = require('../src/parsers/index');
const { buildCacheKey, writeCache, readCache, clearCache, withCache } = require('../src/cache');
const { loadConfig, resolveLabel, resolveType, isHidden, generateExampleConfig } = require('../src/config');
const { execSync } = require('child_process');
const path = require('path');

let pass = 0, fail = 0;
function check(label, cond, detail) {
  if (cond) { pass++; }
  else { console.log('  FAIL: ' + label + (detail ? ' — ' + detail : '')); fail++; }
}

async function run() {

  // ── detectKeyContext complete table ──────────────────────────────
  const ctxCases = [
    ['id','identifier'],['uuid','identifier'],['guid','identifier'],['_id','identifier'],
    ['user_id','reference'],['post_id','reference'],['order_id','reference'],
    ['lat','latitude'],['latitude','latitude'],['geo_lat','latitude'],['_lat','latitude'],
    ['lng','longitude'],['lon','longitude'],['longitude','longitude'],['geo_lng','longitude'],
    ['created_at','datetime'],['updated_at','datetime'],['modified_at','datetime'],
    ['timestamp','datetime'],['datetime','datetime'],
    ['last_login','datetime'],['logged_at','datetime'],['login_at','datetime'],['signed_in','datetime'],
    ['start_date','datetime'],['end_date','datetime'],['birth_date','datetime'],['next_billing_date','datetime'],
    ['start_time','datetime'],['end_time','datetime'],
    ['sent_on','datetime'],['expires_on','datetime'],['published_on','datetime'],
    // NOT datetime
    ['at_bat','generic'],['platform','generic'],['template','generic'],['data','generic'],['per_page','generic'],
    ['email','email'],['user_email','email'],['contact_mail','email'],
    ['website','url'],['profile_url','url'],['href','url'],
    ['phone','phone'],['mobile','phone'],['tel','phone'],
    ['price','money'],['salary','money'],['balance','money'],['total_fee','money'],
    ['ms','duration'],['timeout_ms','duration'],['elapsed_ms','duration'],
    ['processing_ms_total','duration'],['duration','duration'],['elapsed','duration'],
    ['timeout','duration'],['ttl','duration'],['elapsed_seconds','duration'],['retry_minutes','duration'],
    ['item_count','count'],['total','count'],['qty','count'],['quantity','count'],
    ['num','count'],['size','count'],['length','count'],
    ['country','location'],  // NOT count
    ['password','sensitive'],['token','sensitive'],['secret','sensitive'],['api_key','sensitive'],['hash','sensitive'],
    ['name','name'],['title','name'],['label','name'],['subject','name'],['customer_name','name'],
    ['description','description'],['bio','description'],['notes','description'],['summary','description'],['body','description'],
    ['status','status'],['state','status'],['phase','status'],['stage','status'],
    ['category','category'],['type','category'],['kind','category'],['tag','category'],
    ['is_active','boolean-flag'],['has_access','boolean-flag'],['enabled','boolean-flag'],
    ['user_active','boolean-flag'],['is_visible','boolean-flag'],['is_public','boolean-flag'],
    ['active','generic'],   // bare — no prefix/suffix
    ['age','age'],
    ['version','version'],
    ['color','color'],['colour','color'],
    ['city','location'],['address','location'],['region','location'],['zip','location'],['shipping_address','location'],
    ['rating','rating'],['score','rating'],['rank','rating'],
    ['error','error'],['err','error'],['exception','error'],
    ['progress_pct','percent'],['completion_percent','percent'],['pct','percent'],
    ['foobar','generic'],['xyz','generic'],['plan','generic'],['billing_cycle','generic'],
    ['storage_used_gb','generic'],['theme','generic'],['language','generic'],
  ];
  let ctxFail = 0;
  for (const [k, exp] of ctxCases) {
    const got = detectKeyContext(k);
    if (got !== exp) { console.log('  CTX FAIL: "' + k + '" => "' + got + '" exp "' + exp + '"'); ctxFail++; }
  }
  check('detectKeyContext (' + ctxCases.length + ' cases)', ctxFail === 0);

  // ── humanizeValue ────────────────────────────────────────────────
  const valCases = [
    [null, '', 'not specified'],
    [undefined, '', 'not specified'],
    ['', '', 'empty'],
    [true, 'active', 'yes'],
    [false, 'locked', 'no'],
    [true, 'enabled', 'yes (enabled is enabled)'],
    [true, 'is_admin', 'yes (admin is enabled)'],
    [false, 'is_active', 'no (active is disabled)'],
    [false, 'has_access', 'no (access is disabled)'],
    [1500000, 'salary', '$1.50M'],
    [2500, 'price', '$2.5K'],
    [9.99, 'cost', '$9.99'],
    [5, 'item_count', '5 items'],
    [1, 'item_count', '1 item'],
    [8, 'rating', '8 out of 10'],
    [25, 'age', '25 years old'],
    [1, 'age', '1 year old'],
    [51.5, 'lat', '51.5° N'],
    [-3.2, 'lat', '3.2° S'],
    [10.0, 'lng', '10° E'],
    [-73.9, 'lng', '73.9° W'],
    [75, 'progress_pct', '75%'],
    ['s3cr3t', 'password', '*** (hidden for security)'],
    ['v1.2.3', 'version', 'version v1.2.3'],
    ['#ff0000', 'color', 'color #ff0000'],
    ['a@b.com', 'email', 'email address: a@b.com'],
    ['https://x', 'url', 'link: https://x'],
    ['+1234', 'phone', 'phone: +1234'],
    ['2024-06-28T14:22:00Z', 'last_login', 'June 28, 2024 at 02:22 PM'],
    ['2024-01-15T10:00:00Z', 'created_at', 'January 15, 2024 at 10:00 AM'],
  ];
  let vFail = 0;
  for (const [v, k, exp] of valCases) {
    const got = humanizeValue(v, k);
    if (got !== exp) { console.log('  VAL FAIL: (' + JSON.stringify(v) + ',"' + k + '") => "' + got + '" exp "' + exp + '"'); vFail++; }
  }
  check('humanizeValue (' + valCases.length + ' cases)', vFail === 0);

  // ── formatDuration ───────────────────────────────────────────────
  const durCases = [
    [0, 'timeout_ms', '0 ms'], [999, 'timeout_ms', '999 ms'],
    [1000, 'elapsed_ms', '1.0 seconds'], [60000, 'wait_ms', '1.0 minutes'],
    [3600000, 'delay_ms', '1.0 hours'], [0, 'duration', '0 seconds'],
    [59, 'duration', '59 seconds'], [60, 'duration', '1.0 minutes'],
    [3600, 'duration', '1.0 hours'],
  ];
  let dFail = 0;
  for (const [n, k, exp] of durCases) {
    const got = formatDuration(n, k);
    if (got !== exp) { console.log('  DUR FAIL: (' + n + ',"' + k + '") => "' + got + '" exp "' + exp + '"'); dFail++; }
  }
  check('formatDuration (' + durCases.length + ' cases)', dFail === 0);

  // ── formatMoney ──────────────────────────────────────────────────
  const moneyCases = [[1500000,'$1.50M'],[2500,'$2.5K'],[9.99,'$9.99'],[0,'$0.00'],[999,'$999.00']];
  let mFail = 0;
  for (const [n, exp] of moneyCases) {
    const got = formatMoney(n);
    if (got !== exp) { console.log('  MONEY FAIL: ' + n + ' => "' + got + '" exp "' + exp + '"'); mFail++; }
  }
  check('formatMoney', mFail === 0);

  // ── humanizeKey ──────────────────────────────────────────────────
  check('humanizeKey camelCase', humanizeKey('firstName') === 'first name');
  check('humanizeKey snake_case', humanizeKey('created_at') === 'created at');
  check('humanizeKey kebab', humanizeKey('user-name') === 'user name');

  // ── formats (all 7) ─────────────────────────────────────────────
  const data = {
    id: 'u1', name: 'Alice', email: 'a@b.com', password: 'x',
    salary: 125000, age: 28, rating: 9, is_active: true,
    created_at: '2024-01-15T10:00:00Z', progress_pct: 74,
    timeout_ms: 2500, lat: 55.75, lng: 37.61,
    last_login: '2024-06-28T14:22:00Z',
  };
  for (const fmt of ['plain','markdown','story','json','sentence','csv','html']) {
    const mode = fmt === 'sentence' ? 'sentence' : 'structured';
    const r = await humanize(data, { format: fmt, mode });
    check('format ' + fmt + ' non-empty', r && r.trim().length > 0);
    if (fmt === 'json')     check('format json parseable', (() => { try { JSON.parse(r); return true; } catch { return false; } })());
    if (fmt === 'html')     check('html article tag', r.includes('<article'));
    if (fmt === 'csv')      check('csv has humanized=', r.includes('humanized='));
    if (fmt === 'markdown') check('markdown has ##', r.includes('##'));
  }

  // ── XSS in html ─────────────────────────────────────────────────
  const xss = await humanize({ x: 1 }, { format: 'html', filename: '<script>alert(1)</script>' });
  check('html XSS escaped', !xss.includes('<script>') && xss.includes('&lt;script&gt;'));
  const xssBody = applyFormat('a < b & c', 'html', {});
  check('html body escapes < and &', xssBody.includes('&lt;') && xssBody.includes('&amp;'));

  // ── sourceFormat labels ──────────────────────────────────────────
  for (const [sf, lbl] of [['json','data'],['yaml','YAML'],['toml','TOML']]) {
    const r = await humanize({ k: 1 }, { sourceFormat: sf });
    check('sourceFormat ' + sf, r.toLowerCase().includes(lbl.toLowerCase()));
  }

  // ── humanizeString ───────────────────────────────────────────────
  check('humanizeString JSON', (await humanizeString('{"name":"Test"}')).includes('Test'));
  check('humanizeString YAML', (await humanizeString('name: Alice\nage: 30')).includes('Alice'));
  let strErr = false;
  try { await humanizeString('{bad}'); }
  catch (e) { strErr = e.message.startsWith('Invalid JSON') && !e.message.includes('Invalid JSON: Invalid JSON'); }
  check('humanizeString no double-wrap', strErr);

  // ── humanizeBatch ────────────────────────────────────────────────
  const br = await humanizeBatch([{ data: { n: 1 } }, { data: { n: 2 }, options: { format: 'json' } }], { format: 'plain' });
  check('humanizeBatch length', br.length === 2);
  check('humanizeBatch per-item json', (() => { try { JSON.parse(br[1]); return true; } catch { return false; } })());
  let bErr = false;
  try { await humanizeBatch([]); } catch (e) { bErr = e.message.includes('non-empty'); }
  check('humanizeBatch empty throws', bErr);

  // ── summarize ────────────────────────────────────────────────────
  check('summarize separator', summarize({ id: 'x', name: 'Alice', salary: 90000 }).includes('·'));
  check('summarize single line', !summarize({ id: 'x', name: 'Alice' }).includes('\n'));
  check('summarize array 3', summarize([1, 2, 3]).includes('3 item'));
  check('summarize array 1', summarize([42]) === '1 item');
  check('summarize null', summarize(null) === 'empty');
  check('summarize undefined', summarize(undefined) === 'empty');
  check('summarize empty obj', summarize({}) === '0 fields');

  // ── diff ─────────────────────────────────────────────────────────
  const d1 = await diff({ a: 1, b: 2 }, { a: 1, b: 3, c: 4 });
  check('diff added+changed', d1.includes('Added') && d1.includes('Changed'));
  check('diff identical', (await diff({ x: 1 }, { x: 1 })).includes('No differences'));
  check('diff markdown ##', (await diff({ a: 1 }, { a: 2 }, { format: 'markdown' })).includes('##'));
  check('diff type change', (await diff({ a: 1 }, [1, 2])).includes('type'));
  const dj = JSON.parse(await diff({ a: 1, b: 2 }, { a: 2 }, { format: 'json' }));
  check('diff json structure', !!(dj.changes && dj.summary));
  check('diff nested path', (await diff({ u: { name: 'Alice' } }, { u: { name: 'Bob' } })).includes('u.name'));
  check('diff array shrink', (await diff([1, 2, 3], [1, 2])).includes('Removed'));
  check('diff array grow', (await diff([1, 2], [1, 2, 3])).includes('Added'));
  check('diff null→null', (await diff(null, null)).includes('No differences'));
  check('diff null→obj type', (await diff(null, { a: 1 })).includes('type'));

  // ── cache ────────────────────────────────────────────────────────
  const k1 = buildCacheKey({ a: 1 }, { lang: 'en' });
  const k2 = buildCacheKey({ a: 1 }, { lang: 'en' });
  check('cache key stable', k1 === k2);
  check('cache key differs data', k1 !== buildCacheKey({ a: 2 }, { lang: 'en' }));
  check('cache key differs opts', k1 !== buildCacheKey({ a: 1 }, { lang: 'fr' }));
  writeCache('jh-full-audit-test', 'hello');
  check('cache read after write', readCache('jh-full-audit-test', 3600) === 'hello');
  clearCache();
  check('cache cleared', readCache('jh-full-audit-test', 3600) === null);
  check('cache disabled', (await withCache({ x: 1 }, {}, async () => 'direct', false)) === 'direct');

  // ── parsers ──────────────────────────────────────────────────────
  check('parseAny JSON obj', parseAny('{"x":1}', 'f.json').x === 1);
  check('parseAny JSON arr', Array.isArray(parseAny('[1,2,3]', 'f.json')));
  check('parseAny YAML', parseAny('x: 1', 'f.yaml').x === 1);
  check('parseAny TOML', parseAny('[s]\nk="v"', 'f.toml').s.k === 'v');
  let pErr = false;
  try { parseAny('{bad}', 'f.json'); } catch { pErr = true; }
  check('parseAny throws on invalid', pErr);

  // ── config ───────────────────────────────────────────────────────
  check('generateExampleConfig', (() => { try { const c = JSON.parse(generateExampleConfig()); return !!c.engine; } catch { return false; } })());
  check('loadConfig engine default', loadConfig().config.engine === 'local');
  check('loadConfig cache default', loadConfig().config.cache === true);
  check('resolveLabel hit', resolveLabel('user_id', { 'user_id': 'User ID' }) === 'User ID');
  check('resolveLabel glob null', resolveLabel('internal_hash', { 'internal_*': null }) === null);
  check('resolveLabel miss', resolveLabel('other', { 'user_id': 'User ID' }) === null);
  check('resolveType hit', resolveType('balance', { 'balance': 'money' }) === 'money');
  check('isHidden glob', isHidden('debug_x', ['debug_*']));
  check('isHidden exact', isHidden('password', ['password']));
  check('isHidden false', !isHidden('name', ['debug_*']));

  // ── template ─────────────────────────────────────────────────────
  check('renderTemplateString basic', renderTemplateString('hello', 'Result: {{humanized}}', {}) === 'Result: hello');
  check('renderTemplateString meta', renderTemplateString('val', '{{humanized}} [{{engine}}]', { engine: 'local' }) === 'val [local]');

  // ── applyFormat all 7 ────────────────────────────────────────────
  for (const fmt of ['plain','markdown','story','json','sentence','csv','html']) {
    const r = applyFormat('text', fmt, { engine: 'local', filename: 'test.json', timestamp: new Date().toISOString() });
    check('applyFormat ' + fmt, r && r.includes('text'));
  }

  // ── edge cases ───────────────────────────────────────────────────
  check('empty object', typeof (await humanize({})) === 'string');
  check('empty array', (await humanize([])).includes('empty'));
  check('top-level array 3', (await humanize([{ a: 1 }, { a: 2 }, { a: 3 }])).includes('3 record'));
  check('mixed array no crash', typeof (await humanize({ m: [1, 'two', true, null] })) === 'string');
  check('deep nesting', (await humanize({ a: { b: { c: { d: { e: 'deep' } } } } })).includes('deep'));
  check('all null', (await humanize({ x: null, y: null })).includes('not specified'));
  check('large array 100', (await humanize(Array.from({ length: 100 }, (_, i) => ({ id: i })))).includes('100'));
  check('sensitive hidden', !(await humanize({ password: 'supersecret' })).includes('supersecret'));
  check('created_at formatted', (await humanize({ created_at: '2024-01-15T10:00:00Z' })).includes('January'));
  check('last_login formatted', (await humanize({ last_login: '2024-06-28T14:22:00Z' })).includes('June'));

  // ── syntax check all JS files ────────────────────────────────────
  const files = [
    'src/index.js', 'src/humanizer.js', 'src/diff.js', 'src/cache.js',
    'src/config.js', 'src/watch.js', 'src/parsers/index.js',
    'src/formatters/index.js', 'src/formatters/template.js',
    'src/strategies/ai.js', 'src/strategies/openai.js', 'src/strategies/ollama.js',
    'bin/cli.js',
  ];
  let synFail = 0;
  for (const f of files) {
    try {
      execSync('node --check ' + f, { cwd: path.resolve(__dirname, '..'), stdio: 'pipe' });
    } catch (e) {
      console.log('  SYNTAX FAIL: ' + f + ' — ' + e.stderr.toString().trim());
      synFail++;
    }
  }
  check('syntax check all ' + files.length + ' files', synFail === 0);

  // ── cli.js no stale imports ──────────────────────────────────────
  const cliSrc = require('fs').readFileSync(path.resolve(__dirname, '../bin/cli.js'), 'utf8');
  check('cli no unused humanizeBatch import', !cliSrc.includes('humanizeBatch'));

  // ── summary ──────────────────────────────────────────────────────
  const total = pass + fail;
  console.log('\n' + '─'.repeat(50));
  console.log('Results: ' + pass + '/' + total + ' passed, ' + fail + ' failed');
  if (fail === 0) console.log('✓ All checks passed\n');
  else process.exit(1);
}

run().catch(e => {
  console.error('RUNNER ERROR:', e.message);
  console.error(e.stack);
  process.exit(1);
});
