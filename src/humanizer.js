'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  json-humanized · Rule-based humanization engine
//  Works 100% offline, no API key needed
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_LABELS = {
  string:  'text value',
  number:  'number',
  boolean: 'flag',
  object:  'object',
  array:   'list',
  null:    'empty value',
};

function detectKeyContext(key) {
  const k = key.toLowerCase();
  if (/^(id|uuid|guid|_id)$/.test(k))          return 'identifier';
  if (/(_id|Id)$/.test(key))                    return 'reference';
  if (/(created|updated|modified|timestamp|date|time|at)$/i.test(k)) return 'datetime';
  if (/(email|mail)$/i.test(k))                 return 'email';
  if (/(url|uri|href|link|website)$/i.test(k))  return 'url';
  if (/(phone|tel|mobile|fax)$/i.test(k))       return 'phone';
  if (/(price|cost|amount|salary|wage|fee|balance)/i.test(k)) return 'money';
  if (/(count|qty|quantity|num|total|sum|size|length)/i.test(k)) return 'count';
  if (/(lat|latitude)/i.test(k))                return 'latitude';
  if (/(lon|lng|longitude)/i.test(k))           return 'longitude';
  if (/(password|secret|token|key|hash)/i.test(k)) return 'sensitive';
  if (/(name|title|label|heading|subject)/i.test(k)) return 'name';
  if (/(desc|description|about|bio|summary|notes|comment|text|body|content)/i.test(k)) return 'description';
  if (/(status|state|phase|stage)/i.test(k))    return 'status';
  if (/(type|kind|category|group|tag|class)/i.test(k)) return 'category';
  if (/(enabled|active|visible|public|is_|has_)/i.test(k)) return 'boolean-flag';
  if (/(^age$|_age$|^age_)/i.test(k))           return 'age';
  if (/(version|ver)/i.test(k))                 return 'version';
  if (/(color|colour)/i.test(k))                return 'color';
  if (/(address|city|country|region|zip|postal)/i.test(k)) return 'location';
  if (/(rating|score|rank)/i.test(k))           return 'rating';
  if (/(error|err|exception|message|msg)/i.test(k)) return 'error';
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

  const ctx  = detectKeyContext(key);
  const type = typeof value;

  if (type === 'boolean') {
    if (ctx === 'boolean-flag') {
      const label = humanizeKey(key);
      return value ? `yes (${label} is active)` : `no (${label} is inactive)`;
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

  const itemType    = typeof arr[0];
  const allSameType = arr.every(i => typeof i === itemType);
  const label       = humanizeKey(key) || 'items';

  if (allSameType && ['string', 'number', 'boolean'].includes(itemType) && arr.length <= 8) {
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
      sentences.push(`${indent}• ${capitalize(label)}:`);
      sentences.push(humanizeObject(value, depth + 1));
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

module.exports = { humanizeLocal, humanizeKey, humanizeValue, detectKeyContext };
