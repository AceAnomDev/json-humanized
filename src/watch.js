'use strict';

/**
 * watch.js — watch a file for changes and re-run humanization on every save.
 * Uses Node.js built-in fs.watch; no extra dependencies.
 */

const fs   = require('fs');
const path = require('path');

const { parseAny } = require('./parsers');

// ─── ANSI helpers ────────────────────────────────────────────────────────────

const ESC   = '\x1b[';
const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';
const DIM   = '\x1b[2m';
const GREEN = '\x1b[32m';
const CYAN  = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RED   = '\x1b[31m';

function clearScreen() {
  process.stdout.write('\x1bc');
}

function timestamp() {
  return new Date().toLocaleTimeString();
}

function header(filePath) {
  const name = path.basename(filePath);
  const line = '─'.repeat(52);
  return [
    `${CYAN}${line}${RESET}`,
    `${BOLD}  👁  Watching: ${name}${RESET}   ${DIM}(Ctrl+C to stop)${RESET}`,
    `${CYAN}${line}${RESET}`,
    '',
  ].join('\n');
}

// ─── debounce ────────────────────────────────────────────────────────────────

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── core watch function ─────────────────────────────────────────────────────

/**
 * Watch a file and re-humanize on every change.
 *
 * @param {string}   filePath   path to the JSON/YAML/TOML file
 * @param {object}   options    same options as humanize()
 * @param {Function} humanizeFn async (data, options) => string
 * @returns {{ stop: Function }}   call stop() to end watching
 */
function watch(filePath, options = {}, humanizeFn) {
  const absPath = path.resolve(filePath);

  if (!fs.existsSync(absPath)) {
    throw new Error(`File not found: ${absPath}`);
  }

  let runCount = 0;

  async function run() {
    runCount++;
    clearScreen();
    process.stdout.write(header(absPath));
    process.stdout.write(`${DIM}Run #${runCount} · ${timestamp()}${RESET}\n\n`);

    let raw;
    try {
      raw = fs.readFileSync(absPath, 'utf8');
    } catch (err) {
      process.stdout.write(`${RED}Error reading file: ${err.message}${RESET}\n`);
      return;
    }

    let data;
    try {
      data = parseAny(raw, absPath);
    } catch (err) {
      process.stdout.write(`${RED}Parse error: ${err.message}${RESET}\n`);
      return;
    }

    try {
      const result = await humanizeFn(data, { ...options, filename: path.basename(absPath) });
      process.stdout.write(result + '\n');
    } catch (err) {
      process.stdout.write(`${RED}Humanization error: ${err.message}${RESET}\n`);
    }

    process.stdout.write(`\n${DIM}─────  Watching for changes…${RESET}\n`);
  }

  // Run immediately
  run().catch(console.error);

  // Watch for changes (debounced 200ms to avoid double-fire on some editors)
  const debouncedRun = debounce(() => run().catch(console.error), 200);

  const watcher = fs.watch(absPath, { persistent: true }, (event) => {
    if (event === 'change' || event === 'rename') {
      debouncedRun();
    }
  });

  watcher.on('error', (err) => {
    process.stderr.write(`${RED}Watch error: ${err.message}${RESET}\n`);
  });

  // Graceful shutdown
  const cleanup = () => {
    watcher.close();
    process.stdout.write(`\n${YELLOW}Stopped watching.${RESET}\n`);
    process.exit(0);
  };

  process.on('SIGINT',  cleanup);
  process.on('SIGTERM', cleanup);

  return { stop: () => watcher.close() };
}

module.exports = { watch };
