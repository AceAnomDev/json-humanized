'use strict';

/**
 * json-humanized — demo script
 * Run: node examples/demo.js
 */

const {
  humanize,
  humanizeFile,
  humanizeString,
  humanizeBatch,
  summarize,
} = require('../src/index');
const diffModule = require('../src/diff');
const path = require('path');

const SEP = '─'.repeat(60);
const H = (title) => console.log('\n' + SEP + '\n📌 ' + title + '\n' + SEP);

async function main() {

  // ── 1. Simple object — plain ───────────────────────────────────────
  H('Example 1: Simple object (plain)');
  const user = {
    id: 'usr_8f3k2',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    password: 'hunter2',
    salary: 125000,
    age: 28,
    is_active: true,
    rating: 9,
    created_at: '2024-03-15T10:30:00Z',
    last_login: '2024-06-28T14:22:00Z',
    progress_pct: 74,
    timeout_ms: 2500,
    lat: 55.7558,
    lng: 37.6173,
    tags: ['admin', 'beta', 'pro'],
    address: { city: 'Moscow', country: 'Russia' },
  };
  console.log(await humanize(user));

  // ── 2. From file — plain ───────────────────────────────────────────
  H('Example 2: From file (user-profile.json)');
  const filePath = path.join(__dirname, 'user-profile.json');
  console.log(await humanizeFile(filePath));

  // ── 3. Markdown format ─────────────────────────────────────────────
  H('Example 3: Markdown output');
  console.log(await humanize(user, { format: 'markdown', filename: 'user-profile.json' }));

  // ── 4. Story format ────────────────────────────────────────────────
  H('Example 4: Story format');
  console.log(await humanize(user, { format: 'story' }));

  // ── 5. Sentence format ─────────────────────────────────────────────
  H('Example 5: Sentence format');
  console.log(await humanize(user, { format: 'sentence', mode: 'sentence' }));

  // ── 6. CSV format ──────────────────────────────────────────────────
  H('Example 6: CSV format (for logs / spreadsheets)');
  console.log(await humanize(user, { format: 'csv', filename: 'user-profile.json' }));

  // ── 7. HTML format ─────────────────────────────────────────────────
  H('Example 7: HTML snippet');
  console.log(await humanize(user, { format: 'html', filename: 'user-profile.json' }));

  // ── 8. summarize — single-line ─────────────────────────────────────
  H('Example 8: summarize() — one-liner for tooltips / logs');
  console.log(summarize(user));

  // ── 9. humanizeString ─────────────────────────────────────────────
  H('Example 9: humanizeString (raw JSON string)');
  const raw = '{"order_id":"ORD-9921","status":"shipped","amount":299.99,"items":3}';
  console.log(await humanizeString(raw));

  // ── 10. YAML string ────────────────────────────────────────────────
  H('Example 10: YAML string');
  const yaml = `
name: Deploy Pipeline
version: 2.1
status: running
started_at: 2024-06-28T12:00:00Z
progress_pct: 68
`.trim();
  console.log(await humanizeString(yaml));

  // ── 11. humanizeBatch ─────────────────────────────────────────────
  H('Example 11: humanizeBatch — multiple objects concurrently');
  const users = [
    { data: { name: 'Alice', age: 28, salary: 90000 } },
    { data: { name: 'Bob',   age: 35, salary: 120000 } },
    { data: { name: 'Carol', age: 42, salary: 150000 }, options: { format: 'sentence', mode: 'sentence' } },
  ];
  const results = await humanizeBatch(users, { format: 'sentence', mode: 'sentence' });
  results.forEach((r, i) => console.log('  [' + (i + 1) + '] ' + r));

  // ── 12. diff ──────────────────────────────────────────────────────
  H('Example 12: diff — compare two versions');
  const v1 = { name: 'Alice', status: 'active', score: 80, plan: 'basic' };
  const v2 = { name: 'Alice Johnson', status: 'inactive', score: 95, plan: 'pro', rank: 1 };
  console.log(await diffModule.diff(v1, v2));

  // ── 13. diff markdown ─────────────────────────────────────────────
  H('Example 13: diff in markdown format');
  console.log(await diffModule.diff(v1, v2, { format: 'markdown' }));

  // ── 14. Top-level array ───────────────────────────────────────────
  H('Example 14: Top-level array');
  const products = [
    { id: 1, name: 'Widget A', price: 29.99, in_stock: true },
    { id: 2, name: 'Widget B', price: 49.99, in_stock: false },
    { id: 3, name: 'Widget C', price: 9.99,  in_stock: true  },
  ];
  console.log(await humanize(products));

  // ── 15. API response shape ────────────────────────────────────────
  H('Example 15: API response');
  const apiResp = {
    data: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
    meta: { total: 2, page: 1, per_page: 10 },
    links: { next: null, prev: null },
  };
  console.log(await humanize(apiResp));

  console.log('\n' + SEP);
  console.log('✓  Demo complete — ' + 15 + ' examples');
  console.log(SEP + '\n');
}

main().catch(err => {
  console.error('Demo error:', err.message);
  process.exit(1);
});
