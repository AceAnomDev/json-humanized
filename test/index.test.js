'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  json-humanized · Test suite (no external dependencies)
// ─────────────────────────────────────────────────────────────────────────────

const { humanize, humanizeString } = require('../src/index');

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
    throw new Error(msg || `Expected output to contain "${substr}"`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\njson-humanized test suite\n' + '─'.repeat(40));

  // Basic types
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

  await test('handles large numbers', async () => {
    const r = await humanize({ salary: 1500000 });
    assertContains(r, '$1.50M');
  });

  await test('hides sensitive fields', async () => {
    const r = await humanize({ password: 'supersecret', token: 'abc123' });
    assert(!r.includes('supersecret'), 'should not expose password');
    assertContains(r, 'hidden');
  });

  await test('formats datetime fields', async () => {
    const r = await humanize({ created_at: '2024-01-15T10:30:00Z' });
    assertContains(r, 'January');
  });

  // Format tests
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

  await test('markdown uses YAML label for yaml source', async () => {
    const r = await humanize({ key: 'value' }, { format: 'markdown', sourceFormat: 'yaml' });
    assertContains(r, '# YAML Analysis');
  });

  await test('markdown uses TOML label for toml source', async () => {
    const r = await humanize({ key: 'value' }, { format: 'markdown', sourceFormat: 'toml' });
    assertContains(r, '# TOML Analysis');
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

  // humanizeString
  await test('humanizeString parses raw JSON string', async () => {
    const r = await humanizeString('{"name":"Test"}');
    assertContains(r, 'Test');
  });

  await test('humanizeString throws on invalid JSON', async () => {
    try {
      await humanizeString('{bad json}');
      throw new Error('Should have thrown');
    } catch (err) {
      assert(err.message.includes('Invalid JSON'), `Expected InvalidJSON error, got: ${err.message}`);
    }
  });

  await test('handles empty array', async () => {
    const r = await humanize([]);
    assertContains(r, 'empty');
  });

  await test('handles primitive string', async () => {
    const r = await humanize('hello world');
    assert(typeof r === 'string');
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
