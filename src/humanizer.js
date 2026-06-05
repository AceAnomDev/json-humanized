'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  json-humanized · Rule-based humanization engine
//  Works 100% offline, no API key needed
// ─────────────────────────────────────────────────────────────────────────────

function detectKeyContext(key) {
  const k = key.toLowerCase();
  if (/^(id|uuid|guid|_id)$/.test(k))          return 'identifier';
  if (/(_id|Id)$/.test(key))                    return 'reference';
  // FIX: lat/lng must come BEFORE datetime — "lat" ends in "at" which matched /(at)$/ in datetime
  if (/^(lat|latitude)$|_lat$|^lat_/i.test(k)) return 'latitude';
  if (/^(lon|lng|longitude)$|_lng$|_lon$|^lng_/i.test(k)) return 'longitude';
  // FIX: tightened datetime regex — require word boundary so "lat" no longer matches "at"
  // Also covers: last_login, logged_at, login_at, sent_on, expires_on, *_at, *_date, *_time
  // 'at' only matches as suffix (_at$) not as infix (at_bat would match (^|_)at(_) — excluded)
  if (/(created|updated|modified|timestamp|datetime|last_login|logged_at|login_at|signed_in)(_at)?$|(^|_)(date|time|on)(_|$)|_at$/i.test(k)) return 'datetime';
  if (/(email|mail)$/i.test(k))                 return 'email';
  if (/(url|uri|href|link|website)$/i.test(k))  return 'url';
  if (/(phone|tel|mobile|fax)$/i.test(k))       return 'phone';
  if (/(price|cost|amount|salary|wage|fee|balance)/i.test(k)) return 'money';
  // FIX: duration must come BEFORE count — 'processing_ms_total' has _total$ (count) and ms (duration)
  // duration wins because the key explicitly signals time (ms, seconds, timeout, etc.)
  if (/(^duration$|_duration$|^elapsed|_elapsed|^timeout|_timeout|^ttl$|_ttl$|(^|_)ms($|_)|(^|_)ms[_a-z]|_ms$|seconds|minutes)/i.test(k)) return 'duration';
  // FIX: use word boundaries so 'country' doesn't match 'count', 'document' doesn't match 'num', etc.
  if (/(^count$|_count$|^qty|quantity|^num$|_num$|^total$|_total$|^sum$|_sum$|^size$|_size$|^length$|_length$)/i.test(k)) return 'count';
  if (/(password|secret|token|key|hash)/i.test(k)) return 'sensitive';
  if (/(name|title|label|heading|subject)/i.test(k)) return 'name';
  if (/(desc|description|about|bio|summary|notes|comment|text|body|content)/i.test(k)) return 'description';
  if (/(status|state|phase|stage)/i.test(k))    return 'status';
  if (/(type|kind|category|group|tag|class)/i.test(k)) return 'category';
  // FIX: require is_/has_ prefix, or common flag suffixes/names
  // bare "active" alone should NOT be boolean-flag (it's a status), but "enabled", "visible", "public" are flags by convention
  if (/(^is_|^has_|_enabled$|_active$|_visible$|_public$|^enabled$|^disabled$|^visible$|^public$)/i.test(k)) return 'boolean-flag';
  if (/(^age$|_age$|^age_)/i.test(k))           return 'age';
  if (/(version|ver)/i.test(k))                 return 'version';
  if (/(color|colour)/i.test(k))                return 'color';
  if (/(address|city|country|region|zip|postal)/i.test(k)) return 'location';
  if (/(rating|score|rank)/i.test(k))           return 'rating';
  if (/(error|err|exception|message|msg)/i.test(k)) return 'error';
  // NEW: percentage/progress
  if (/(percent|pct|progress|completion)/i.test(k)) return 'percent';
  return 'generic';
}

function humanizeKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_\-\.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function humanizeValue(value, key = '', depth = 0) {
  if (value === null || value === undefined) return 'not specified';
  if (value === '') return 'empty';

  // FIX: js-yaml auto-parses ISO date strings into Date objects — handle them gracefully
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? 'invalid date' : formatDatetime(value.toISOString());
  }

  const ctx  = detectKeyContext(key);
  const type = typeof value;

  if (type === 'boolean') {
    if (ctx === 'boolean-flag') {
      // FIX: strip leading is_/has_ so we don't get "is active is active"
      const label = humanizeKey(key)
        .replace(/^is\s+/, '')
        .replace(/^has\s+/, '');
      return value ? `yes (${label} is enabled)` : `no (${label} is disabled)`;
    }
    return value ? 'yes' : 'no';
  }

  if (type === 'number') {
    if (ctx === 'money')    return formatMoney(value);
    if (ctx === 'count')    return `${value.toLocaleString()} item${value !== 1 ? 's' : ''}`;
    if (ctx === 'rating')   return `${value} out of 10`;
    if (ctx === 'age')      return `${value} year${value !== 1 ? 's' : ''} old`;
    if (ctx === 'latitude') return `${Math.abs(value)}° ${value >= 0 ? 'N' : 'S'}`;
    if (ctx === 'longitude')return `${Math.abs(value)}° ${value >= 0 ? 'E' : 'W'}`;
    // NEW: percentage formatting
    if (ctx === 'percent')  return `${value}%`;
    // NEW: duration formatting
    if (ctx === 'duration') return formatDuration(value, key);
    return value.toLocaleString();
  }

  if (type === 'string') {
    if (ctx === 'sensitive') return '*** (hidden for security)';
    if (ctx === 'datetime')  return formatDatetime(value);
    if (ctx === 'email')     return `email address: ${value}`;
    if (ctx === 'url')       return `link: ${value}`;
    if (ctx === 'phone')     return `phone: ${value}`;
    if (ctx === 'color')     return `color ${value}`;
    if (ctx === 'version')   return `version ${value}`;
    if (value.length > 200)  return `${value.slice(0, 200)}… (truncated, ${value.length} characters total)`;
    return value;
  }

  if (Array.isArray(value)) return humanizeArray(value, key, depth);
  if (type === 'object')    return humanizeObject(value, depth + 1);

  return String(value);
}

function formatMoney(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

// NEW: smart duration formatter
function formatDuration(n, key = '') {
  const k = key.toLowerCase();
  // If key implies milliseconds
  if (k.includes('ms') || k.includes('milli')) {
    if (n >= 3600000) return `${(n / 3600000).toFixed(1)} hours`;
    if (n >= 60000)   return `${(n / 60000).toFixed(1)} minutes`;
    if (n >= 1000)    return `${(n / 1000).toFixed(1)} seconds`;
    return `${n} ms`;
  }
  // Assume seconds
  if (n >= 3600) return `${(n / 3600).toFixed(1)} hours`;
  if (n >= 60)   return `${(n / 60).toFixed(1)} minutes`;
  return `${n} second${n !== 1 ? 's' : ''}`;
}

function formatDatetime(str) {
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    return d.toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return str;
  }
}

function humanizeArray(arr, key = '', depth = 0) {
  if (arr.length === 0) return 'an empty list';

  // FIX: was comparing typeof arr[0] against a variable `itemType`
  // which was a string — but `allSameType` used `typeof i === itemType`
  // which worked, yet the logic was confusing. Rewritten clearly:
  const firstType   = typeof arr[0];
  const allSameType = arr.every(i => typeof i === firstType);
  const label       = humanizeKey(key) || 'items';

  if (allSameType && ['string', 'number', 'boolean'].includes(firstType) && arr.length <= 8) {
    const formatted = arr.map(v => humanizeValue(v, '', depth));
    if (formatted.length === 1) return formatted[0];
    const last = formatted.pop();
    return `${formatted.join(', ')} and ${last}`;
  }

  const preview = humanizeValue(arr[0], '', depth + 1);
  return `a collection of ${arr.length} ${label} (e.g. ${preview}${arr.length > 1 ? ', and more' : ''})`;
}

function humanizeObject(obj, depth = 0) {
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return 'an empty object';

  const sentences = [];
  const indent    = '  '.repeat(depth);

  for (const [key, value] of entries) {
    const label = humanizeKey(key);
    const ctx   = detectKeyContext(key);

    if (Array.isArray(value)) {
      if (value.length === 0) {
        sentences.push(`${indent}• ${capitalize(label)}: none`);
      } else if (isScalarArray(value)) {
        sentences.push(`${indent}• ${capitalize(label)}: ${humanizeArray(value, key, depth)}`);
      } else {
        sentences.push(`${indent}• ${capitalize(label)}: ${value.length} entr${value.length === 1 ? 'y' : 'ies'}`);
        value.slice(0, 5).forEach((item, i) => {
          if (typeof item === 'object' && item !== null) {
            sentences.push(`${indent}  [${i + 1}] ${humanizeObject(item, depth + 1)}`);
          } else {
            sentences.push(`${indent}  [${i + 1}] ${humanizeValue(item, '', depth + 1)}`);
          }
        });
        if (value.length > 5) sentences.push(`${indent}  … and ${value.length - 5} more`);
      }
    } else if (typeof value === 'object' && value !== null) {
      // FIX: Date objects (from js-yaml ISO parsing) should render as datetime, not as nested object
      if (value instanceof Date) {
        const hval = humanizeValue(value, key, depth);
        sentences.push(`${indent}• ${capitalize(label)}: ${hval}`);
      } else {
        sentences.push(`${indent}• ${capitalize(label)}:`);
        sentences.push(humanizeObject(value, depth + 1));
      }
    } else {
      const hval = humanizeValue(value, key, depth);
      if (ctx === 'identifier') {
        sentences.push(`${indent}• Identifier: ${hval}`);
      } else if (ctx === 'description') {
        sentences.push(`${indent}• ${capitalize(label)}: "${hval}"`);
      } else {
        sentences.push(`${indent}• ${capitalize(label)}: ${hval}`);
      }
    }
  }

  return sentences.join('\n');
}

function isScalarArray(arr) {
  return arr.every(i => typeof i !== 'object' || i === null);
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Top-level shape detection
// ─────────────────────────────────────────────────────────────────────────────

function detectTopLevelShape(data) {
  if (Array.isArray(data)) {
    if (data.length === 0) return { shape: 'empty-array' };
    if (typeof data[0] === 'object' && data[0] !== null)
      return { shape: 'record-list', count: data.length };
    return { shape: 'scalar-list', count: data.length };
  }
  if (typeof data === 'object' && data !== null) {
    const keys = Object.keys(data);
    if ('data' in data && ('meta' in data || 'links' in data || 'pagination' in data))
      return { shape: 'api-response' };
    if ('error' in data || 'errors' in data || ('message' in data && 'code' in data))
      return { shape: 'error-response' };
    if ('users' in data || 'items' in data || 'results' in data || 'records' in data)
      return { shape: 'collection' };
    if (keys.length <= 2)
      return { shape: 'simple-object' };
    return { shape: 'complex-object', keys: keys.length };
  }
  return { shape: 'primitive' };
}

/**
 * Returns a format label for use in intro sentences.
 * @param {'json'|'yaml'|'toml'|string} [sourceFormat]
 */
function formatLabel(sourceFormat) {
  switch ((sourceFormat || 'json').toLowerCase()) {
    case 'yaml': case 'yml': return 'YAML';
    case 'toml':             return 'TOML';
    default:                 return 'data';
  }
}

function buildIntro(data, shape, sourceFormat) {
  const lbl = formatLabel(sourceFormat);

  switch (shape.shape) {
    case 'empty-array':
      return `This ${lbl} contains an empty list with no items.`;
    case 'record-list':
      return `This ${lbl} contains a list of ${shape.count} record${shape.count !== 1 ? 's' : ''}.`;
    case 'scalar-list':
      return `This ${lbl} contains a list of ${shape.count} value${shape.count !== 1 ? 's' : ''}.`;
    case 'api-response':
      return `This ${lbl} is an API response with data and metadata.`;
    case 'error-response':
      return `This ${lbl} describes an error or failure response.`;
    case 'collection':
      return `This ${lbl} contains a collection of resources.`;
    case 'simple-object':
      return `This ${lbl} contains a simple object with a few fields.`;
    case 'complex-object':
      return `This ${lbl} contains a structured object with ${shape.keys} fields.`;
    case 'primitive':
      return `This ${lbl} contains a single value: ${String(data)}.`;
    default:
      return `This ${lbl} contains the following data:`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {any}    data
 * @param {object} [options]
 * @param {string} [options.mode='structured']
 * @param {string} [options.sourceFormat]  'json' | 'yaml' | 'toml'
 */
function humanizeLocal(data, options = {}) {
  const { mode = 'structured', sourceFormat } = options;
  const shape = detectTopLevelShape(data);
  const intro = buildIntro(data, shape, sourceFormat);

  if (shape.shape === 'primitive') return intro;

  let body = '';

  if (Array.isArray(data)) {
    if (isScalarArray(data)) {
      body = `\nValues: ${humanizeArray(data, 'items', 0)}`;
    } else {
      const lines = [];
      const limit = Math.min(data.length, 20);
      for (let i = 0; i < limit; i++) {
        const item = data[i];
        if (typeof item === 'object' && item !== null) {
          lines.push(`\nRecord ${i + 1}:\n${humanizeObject(item, 1)}`);
        } else {
          lines.push(`\nItem ${i + 1}: ${humanizeValue(item)}`);
        }
      }
      if (data.length > 20) lines.push(`\n… and ${data.length - 20} more records`);
      body = lines.join('');
    }
  } else {
    body = '\n' + humanizeObject(data, 0);
  }

  return `${intro}\n${body}`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Sentence mode — condenses data into one or a few natural sentences
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a flat object's key-value pairs into a comma-separated sentence fragment.
 */
function objectToSentenceFragment(obj, maxFields = 6) {
  const entries = Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .slice(0, maxFields);

  if (entries.length === 0) return 'no fields';

  const parts = entries.map(([key, value]) => {
    const label = humanizeKey(key);
    const ctx   = detectKeyContext(key);
    if (ctx === 'sensitive') return `${label} is hidden`;
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) return `${label} has ${value.length} item${value.length !== 1 ? 's' : ''}`;
      return `${label} is an object`;
    }
    if (ctx === 'boolean-flag' && typeof value === 'boolean') {
      return `${label} is ${value ? 'active' : 'inactive'}`;
    }
    if (['email', 'url', 'phone', 'color', 'version'].includes(ctx)) {
      return `${label} is ${String(value)}`;
    }
    const val = humanizeValue(value, key, 0);
    return `${label} is ${val}`;
  });

  if (parts.length === 1) return parts[0];
  const last = parts.pop();
  return `${parts.join(', ')}, and ${last}`;
}

/**
 * Humanize data as a concise natural sentence or short paragraph.
 */
function humanizeToSentence(data, options = {}) {
  const { sourceFormat, maxItems = 3 } = options;
  const lbl = formatLabel(sourceFormat);

  if (data === null || data === undefined) return 'The value is empty.';
  if (typeof data !== 'object') return `The ${lbl} contains a single value: ${humanizeValue(data)}.`;

  if (Array.isArray(data)) {
    if (data.length === 0) return `The ${lbl} contains an empty list.`;

    if (isScalarArray(data)) {
      const fragment = humanizeArray(data, 'items', 0);
      return `The ${lbl} contains ${data.length} value${data.length !== 1 ? 's' : ''}: ${fragment}.`;
    }

    const shown = data.slice(0, maxItems);
    const sentences = shown.map((item, i) => {
      if (typeof item === 'object' && item !== null) {
        return `Record ${i + 1} has ${objectToSentenceFragment(item)}.`;
      }
      return `Item ${i + 1} is ${humanizeValue(item)}.`;
    });

    const remainder = data.length - shown.length;
    if (remainder > 0) {
      sentences.push(`There ${remainder === 1 ? 'is' : 'are'} ${remainder} more record${remainder !== 1 ? 's' : ''}.`);
    }

    const intro = `This ${lbl} lists ${data.length} record${data.length !== 1 ? 's' : ''}. `;
    return intro + sentences.join(' ');
  }

  const keys = Object.keys(data).filter(k => data[k] !== undefined);
  if (keys.length === 0) return `The ${lbl} is an empty object.`;

  const fragment = objectToSentenceFragment(data, 8);
  return `This ${lbl} describes a record where ${fragment}.`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  NEW: Extract a plain summary (top-level fields only, no bullets)
//  Useful for embedding in notifications, tooltips, etc.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a single-line summary of the top-level keys/values.
 * @param {object|Array} data
 * @param {number} [maxFields=5]
 * @returns {string}
 */
function summarize(data, maxFields = 5) {
  if (data === null || data === undefined) return 'empty';
  if (Array.isArray(data)) return `${data.length} item${data.length !== 1 ? 's' : ''}`;
  if (typeof data !== 'object') return String(data);

  const entries = Object.entries(data)
    .filter(([, v]) => v !== null && v !== undefined && v !== '' && typeof v !== 'object')
    .slice(0, maxFields);

  if (entries.length === 0) {
    const nested = Object.keys(data).length;
    return `${nested} field${nested !== 1 ? 's' : ''}`;
  }

  return entries.map(([k, v]) => `${humanizeKey(k)}: ${humanizeValue(v, k)}`).join(' · ');
}

module.exports = {
  humanizeLocal,
  humanizeToSentence,
  summarize,
  humanizeKey,
  humanizeValue,
  detectKeyContext,
  // Expose helpers for testing
  formatMoney,
  formatDatetime,
  formatDuration,
};
