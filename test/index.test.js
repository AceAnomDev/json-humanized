'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  json-humanized · Test suite (no external dependencies)
// ─────────────────────────────────────────────────────────────────────────────

const { humanize, humanizeString, humanizeBatch, summarize } = require('../src/index');
const { diff } = require('../src/diff');
const { humanizeKey, humanizeValue, detectKeyContext, formatMoney, formatDuration } = require('../src/humanizer');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗  ${name}`);
    console.log(`     ${err.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

function assertContains(str, substr, msg) {
  if (!str.includes(substr)) {
    throw new Error(msg || `Expected output to contain "${substr}"\n     Got: "${str.slice(0, 200)}"`);
  }
}

function assertNotContains(str, substr, msg) {
  if (str.includes(substr)) {
    throw new Error(msg || `Expected output NOT to contain "${substr}"`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\njson-humanized test suite\n' + '─'.repeat(40));

  // ── Basic types ──────────────────────────────────────────────────────────
  console.log('\n[Basic types]');

  await test('handles empty object', async () => {
    const r = await humanize({});
    assert(typeof r === 'string', 'should return string');
  });

  await test('handles null values', async () => {
    const r = await humanize({ name: null, age: null });
    assertContains(r, 'not specified');
  });

  await test('handles boolean true/false', async () => {
    const r = await humanize({ active: true, locked: false });
    assertContains(r, 'yes');
    assertContains(r, 'no');
  });

  await test('handles nested objects', async () => {
    const r = await humanize({ user: { name: 'Alice', age: 30 } });
    assertContains(r, 'Alice');
  });

  await test('handles arrays of strings', async () => {
    const r = await humanize({ tags: ['node', 'npm', 'json'] });
    assertContains(r, 'node');
  });

  await test('handles arrays of objects', async () => {
    const r = await humanize({ users: [{ name: 'Bob' }, { name: 'Carol' }] });
    assert(typeof r === 'string');
  });

  await test('handles top-level array', async () => {
    const r = await humanize([{ id: 1 }, { id: 2 }, { id: 3 }]);
    assertContains(r, '3 record');
  });

  await test('handles large numbers (money)', async () => {
    const r = await humanize({ salary: 1500000 });
    assertContains(r, '$1.50M');
  });

  await test('hides sensitive fields', async () => {
    const r = await humanize({ password: 'supersecret', token: 'abc123' });
    assertNotContains(r, 'supersecret', 'should not expose password');
    assertContains(r, 'hidden');
  });

  await test('formats datetime fields', async () => {
    const r = await humanize({ created_at: '2024-01-15T10:30:00Z' });
    assertContains(r, 'January');
  });

  await test('handles empty array', async () => {
    const r = await humanize([]);
    assertContains(r, 'empty');
  });

  await test('handles primitive string', async () => {
    const r = await humanize('hello world');
    assert(typeof r === 'string');
  });

  await test('handles mixed-type array gracefully', async () => {
    // FIX: this exercises the allSameType bug fix — mixed array should not crash
    const r = await humanize({ mixed: [1, 'two', true, null] });
    assert(typeof r === 'string');
  });

  // ── Format tests ─────────────────────────────────────────────────────────
  console.log('\n[Formats]');

  await test('markdown format has headers', async () => {
    const r = await humanize({ key: 'value' }, { format: 'markdown' });
    assertContains(r, '# Data Analysis');
  });

  await test('markdown uses YAML label for yaml source', async () => {
    const r = await humanize({ key: 'value' }, { format: 'markdown', sourceFormat: 'yaml' });
    assertContains(r, '# YAML Analysis');
  });

  await test('markdown uses TOML label for toml source', async () => {
    const r = await humanize({ key: 'value' }, { format: 'markdown', sourceFormat: 'toml' });
    assertContains(r, '# TOML Analysis');
  });

  await test('humanizer says YAML data for yaml source', async () => {
    const r = await humanize({ name: 'Alice' }, { sourceFormat: 'yaml' });
    assertContains(r, 'YAML');
  });

  await test('humanizer says TOML data for toml source', async () => {
    const r = await humanize({ name: 'Bob' }, { sourceFormat: 'toml' });
    assertContains(r, 'TOML');
  });

  await test('story uses YAML label', async () => {
    const r = await humanize({ key: 'value' }, { format: 'story', sourceFormat: 'yaml' });
    assertContains(r, 'YAML STORY');
  });

  await test('story format has border', async () => {
    const r = await humanize({ key: 'value' }, { format: 'story' });
    assertContains(r, 'THE DATA STORY');
  });

  await test('json format is parseable', async () => {
    const r = await humanize({ key: 'value' }, { format: 'json' });
    const parsed = JSON.parse(r);
    assert('humanized' in parsed, 'should have humanized key');
    assert('metadata' in parsed, 'should have metadata key');
  });

  await test('sentence format returns concise text', async () => {
    const r = await humanize({ name: 'Alice', age: 30 }, { format: 'sentence', mode: 'sentence' });
    assert(typeof r === 'string');
    assert(r.length < 300, 'sentence mode should be concise');
  });

  await test('csv format contains humanized field', async () => {
    const r = await humanize({ name: 'Alice' }, { format: 'csv' });
    assertContains(r, 'humanized=');
  });

  await test('html format contains article tag', async () => {
    const r = await humanize({ name: 'Alice' }, { format: 'html' });
    assertContains(r, '<article');
    assertContains(r, '</article>');
  });

  // ── humanizeString ───────────────────────────────────────────────────────
  console.log('\n[humanizeString]');

  await test('humanizeString parses raw JSON string', async () => {
    const r = await humanizeString('{"name":"Test"}');
    assertContains(r, 'Test');
  });

  await test('humanizeString throws on invalid JSON with correct message', async () => {
    try {
      await humanizeString('{bad json}');
      throw new Error('Should have thrown');
    } catch (err) {
      // FIX: error message is now reliably "Invalid JSON: ..."
      assert(err.message.includes('Invalid JSON'), `Expected "Invalid JSON" error, got: "${err.message}"`);
    }
  });

  // ── humanizeBatch ────────────────────────────────────────────────────────
  console.log('\n[humanizeBatch]');

  await test('humanizeBatch returns array of results', async () => {
    const results = await humanizeBatch([
      { data: { name: 'Alice' } },
      { data: { name: 'Bob' } },
    ]);
    assert(Array.isArray(results), 'should return array');
    assert(results.length === 2, 'should return 2 results');
    assertContains(results[0], 'Alice');
    assertContains(results[1], 'Bob');
  });

  await test('humanizeBatch applies sharedOptions', async () => {
    const results = await humanizeBatch(
      [{ data: { key: 'v' } }],
      { format: 'json' }
    );
    const parsed = JSON.parse(results[0]);
    assert('humanized' in parsed, 'should use json format from sharedOptions');
  });

  await test('humanizeBatch throws on empty array', async () => {
    try {
      await humanizeBatch([]);
      throw new Error('Should have thrown');
    } catch (err) {
      assertContains(err.message, 'non-empty array');
    }
  });

  // ── summarize ────────────────────────────────────────────────────────────
  console.log('\n[summarize]');

  await test('summarize returns single-line string', async () => {
    const r = summarize({ name: 'Alice', age: 30, active: true });
    assert(typeof r === 'string');
    assertContains(r, 'name');
    assertNotContains(r, '\n', 'summarize should be a single line');
  });

  await test('summarize handles arrays', async () => {
    const r = summarize([1, 2, 3]);
    assertContains(r, '3 item');
  });

  await test('summarize handles null', async () => {
    const r = summarize(null);
    assert(r === 'empty');
  });

  // ── diff ─────────────────────────────────────────────────────────────────
  console.log('\n[diff]');

  await test('diff detects added fields', async () => {
    const r = await diff({ a: 1 }, { a: 1, b: 2 });
    assertContains(r, 'Added');
  });

  await test('diff detects removed fields', async () => {
    const r = await diff({ a: 1, b: 2 }, { a: 1 });
    assertContains(r, 'Removed');
  });

  await test('diff detects changed values', async () => {
    const r = await diff({ a: 1 }, { a: 99 });
    assertContains(r, 'Changed');
  });

  await test('diff reports no differences for identical objects', async () => {
    const r = await diff({ a: 1 }, { a: 1 });
    assertContains(r, 'No differences');
  });

  await test('diff json format is parseable', async () => {
    const r = await diff({ a: 1 }, { a: 2 }, { format: 'json' });
    const parsed = JSON.parse(r);
    assert('changes' in parsed && 'summary' in parsed);
  });

  // ── Context detection ─────────────────────────────────────────────────────
  console.log('\n[Context detection]');

  await test('detectKeyContext identifies percent fields', async () => {
    assert(detectKeyContext('progress_pct') === 'percent');
    assert(detectKeyContext('completion_percent') === 'percent');
  });

  await test('detectKeyContext identifies duration fields', async () => {
    assert(detectKeyContext('timeout_ms') === 'duration');
    assert(detectKeyContext('elapsed_seconds') === 'duration');
  });

  await test('humanizeValue formats percent numbers', async () => {
    const r = humanizeValue(75, 'progress_pct');
    assertContains(r, '75%');
  });

  await test('formatDuration formats milliseconds', async () => {
    assert(formatDuration(500, 'timeout_ms') === '500 ms');
    assert(formatDuration(2500, 'request_ms') === '2.5 seconds');
    assertContains(formatDuration(90000, 'elapsed_ms'), 'minute');
  });

  await test('formatMoney formats large values', async () => {
    assert(formatMoney(1500000) === '$1.50M');
    assert(formatMoney(2500) === '$2.5K');
    assert(formatMoney(9.99) === '$9.99');
  });

  await test('humanizeKey converts camelCase', async () => {
    assert(humanizeKey('firstName') === 'first name');
    assert(humanizeKey('created_at') === 'created at');
  });

  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(40));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('All tests passed! ✓\n');
  }
}

run().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
