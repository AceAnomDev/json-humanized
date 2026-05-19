'use strict';

// json-humanized — Programmatic API demo

const { humanize, humanizeFile, humanizeString } = require('../src/index');

async function demo() {
  console.log('═'.repeat(60));
  console.log('  json-humanized · Programmatic API Demo');
  console.log('═'.repeat(60));

  // ── 1. Humanize inline data ─────────────────────────────────────
  console.log('\n📌 Example 1: Simple object\n');
  const result1 = await humanize({
    name: 'Alice',
    age: 30,
    email: 'alice@example.com',
    premium: true,
    score: 9.2,
  });
  console.log(result1);

  // ── 2. Humanize from file ───────────────────────────────────────
  console.log('\n📌 Example 2: From file (user-profile.json)\n');
  const result2 = await humanizeFile('./examples/user-profile.json', {
    format: 'plain',
  });
  console.log(result2);

  // ── 3. Markdown format ──────────────────────────────────────────
  console.log('\n📌 Example 3: Markdown output\n');
  const result3 = await humanizeString(
    JSON.stringify({ errors: [{ code: 404, message: 'Not found', path: '/api/users/999' }] }),
    { format: 'markdown' }
  );
  console.log(result3);

  // ── 4. Story format ─────────────────────────────────────────────
  console.log('\n📌 Example 4: Story format\n');
  const result4 = await humanize(
    { city: 'Paris', population: 2161000, country: 'France', latitude: 48.8566, longitude: 2.3522 },
    { format: 'story' }
  );
  console.log(result4);
}

demo().catch(err => {
  console.error('Demo failed:', err.message);
  process.exit(1);
});
