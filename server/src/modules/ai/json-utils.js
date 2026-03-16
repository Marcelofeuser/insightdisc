const MAX_RAW_PREVIEW_LENGTH = 500;

function normalizeInputText(text = '') {
  return String(text ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .trim();
}

function replaceSmartQuotes(text = '') {
  return String(text || '')
    .replace(/[\u201c\u201d\u201e\u201f]/g, '"')
    .replace(/[\u2018\u2019\u201a\u201b]/g, "'");
}

function stripCodeFenceMarkers(text = '') {
  const normalized = normalizeInputText(text);
  const fencedMatch = normalized.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fencedMatch ? normalizeInputText(fencedMatch[1]) : normalized;
}

function findBalancedJsonBlock(text = '') {
  const normalized = normalizeInputText(text);
  const startIndex = normalized.indexOf('{');
  if (startIndex === -1) return '';

  let inString = false;
  let escaped = false;
  const stack = [];

  for (let index = startIndex; index < normalized.length; index += 1) {
    const char = normalized[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      stack.push('}');
      continue;
    }

    if (char === '[') {
      stack.push(']');
      continue;
    }

    if (char === '}' || char === ']') {
      if (stack[stack.length - 1] !== char) {
        return normalizeInputText(normalized.slice(startIndex, index + 1));
      }

      stack.pop();
      if (stack.length === 0) {
        return normalizeInputText(normalized.slice(startIndex, index + 1));
      }
    }
  }

  return normalizeInputText(normalized.slice(startIndex));
}

function removeTrailingCommas(text = '') {
  let current = String(text || '');

  for (let index = 0; index < 4; index += 1) {
    const next = current.replace(/,\s*([}\]])/g, '$1');
    if (next === current) break;
    current = next;
  }

  return current;
}

function escapeControlCharactersInsideStrings(text = '') {
  const normalized = String(text || '');
  let result = '';
  let inString = false;
  let escaped = false;

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];

    if (inString) {
      if (escaped) {
        result += char;
        escaped = false;
        continue;
      }

      if (char === '\\') {
        result += char;
        escaped = true;
        continue;
      }

      if (char === '"') {
        result += char;
        inString = false;
        continue;
      }

      if (char === '\n') {
        result += '\\n';
        continue;
      }

      if (char === '\r') {
        result += '\\r';
        continue;
      }

      if (char === '\t') {
        result += '\\t';
        continue;
      }

      result += char;
      continue;
    }

    if (char === '"') {
      inString = true;
    }

    result += char;
  }

  return result;
}

function closeRecoverableOpenStructures(text = '') {
  const normalized = String(text || '');
  let result = normalized;
  let inString = false;
  let escaped = false;
  const stack = [];

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      stack.push('}');
      continue;
    }

    if (char === '[') {
      stack.push(']');
      continue;
    }

    if (char === '}' || char === ']') {
      if (stack[stack.length - 1] !== char) {
        return normalized;
      }

      stack.pop();
    }
  }

  if (inString) {
    result += '"';
  }

  if (stack.length > 0) {
    result += stack.reverse().join('');
  }

  return result;
}

function buildParseCandidates(text = '') {
  const normalized = normalizeInputText(text);
  const candidates = [];

  function pushCandidate(stage, value) {
    const candidate = normalizeInputText(value);
    if (!candidate) return;
    if (candidates.some((entry) => entry.value === candidate)) return;
    candidates.push({ stage, value: candidate });
  }

  const fenced = stripCodeFenceMarkers(normalized);
  const extracted = findBalancedJsonBlock(normalized);
  const firstBraceIndex = normalized.indexOf('{');
  const lastBraceIndex = normalized.lastIndexOf('}');
  const firstToLastBrace =
    firstBraceIndex !== -1 && lastBraceIndex > firstBraceIndex
      ? normalizeInputText(normalized.slice(firstBraceIndex, lastBraceIndex + 1))
      : '';

  pushCandidate('direct', normalized);
  if (fenced !== normalized) pushCandidate('fenced', fenced);
  if (extracted && extracted !== normalized) pushCandidate('extracted', extracted);
  if (firstToLastBrace && firstToLastBrace !== extracted && firstToLastBrace !== normalized) {
    pushCandidate('first_last_brace', firstToLastBrace);
  }

  for (const [baseStage, baseValue] of [
    ['direct', normalized],
    ['fenced', fenced],
    ['extracted', extracted],
    ['first_last_brace', firstToLastBrace],
  ]) {
    if (!baseValue) continue;
    pushCandidate(`${baseStage}_repaired`, tryRepairCommonJsonIssues(baseValue));
  }

  return candidates;
}

export class ProviderJsonParseError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ProviderJsonParseError';
    this.code = 'AI_PROVIDER_JSON_PARSE_FAILED';
    this.provider = details.provider || 'unknown';
    this.model = details.model || 'unknown';
    this.stage = details.stage || 'unknown';
    this.rawPreview = String(details.rawPreview || '').slice(0, MAX_RAW_PREVIEW_LENGTH);
    this.parseErrorMessage = details.parseErrorMessage || message;
  }
}

export function isProviderJsonParseError(error) {
  return error?.code === 'AI_PROVIDER_JSON_PARSE_FAILED';
}

export function extractJsonFromText(text = '') {
  const normalized = normalizeInputText(text);
  if (!normalized) return '';

  const fenced = stripCodeFenceMarkers(normalized);
  if (fenced !== normalized) {
    return fenced;
  }

  const extracted = findBalancedJsonBlock(normalized);
  if (extracted) {
    return extracted;
  }

  const startIndex = normalized.indexOf('{');
  const endIndex = normalized.lastIndexOf('}');

  if (startIndex !== -1 && endIndex > startIndex) {
    return normalizeInputText(normalized.slice(startIndex, endIndex + 1));
  }

  if (startIndex !== -1) {
    return normalizeInputText(normalized.slice(startIndex));
  }

  return normalized;
}

export function tryParseJson(text = '', options = {}) {
  const candidate = normalizeInputText(text);
  if (!candidate) {
    return {
      success: false,
      error: new Error('EMPTY_JSON_CANDIDATE'),
    };
  }

  try {
    const data = JSON.parse(candidate);
    if (options.expectObject && (!data || typeof data !== 'object' || Array.isArray(data))) {
      throw new Error('JSON_ROOT_MUST_BE_OBJECT');
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
}

export function tryRepairCommonJsonIssues(text = '') {
  let repaired = normalizeInputText(text);
  if (!repaired) return '';

  repaired = replaceSmartQuotes(repaired);
  repaired = repaired.replace(/\u2028|\u2029/g, '\\n');
  repaired = repaired.replace(/\\\n/g, '\\n');
  repaired = removeTrailingCommas(repaired);
  repaired = escapeControlCharactersInsideStrings(repaired);
  repaired = closeRecoverableOpenStructures(repaired);
  repaired = removeTrailingCommas(repaired);

  return normalizeInputText(repaired);
}

export function parseProviderJsonSafely(text = '', context = {}) {
  const raw = normalizeInputText(text);
  const candidates = buildParseCandidates(raw);
  let lastFailure = null;

  for (const candidate of candidates) {
    const parsed = tryParseJson(candidate.value, { expectObject: true });
    if (parsed.success) {
      return parsed.data;
    }

    lastFailure = {
      stage: candidate.stage,
      error: parsed.error,
    };
  }

  const provider = context.provider || 'unknown';
  const model = context.model || 'unknown';
  const parseErrorMessage =
    String(lastFailure?.error?.message || 'INVALID_JSON_FROM_PROVIDER').trim() ||
    'INVALID_JSON_FROM_PROVIDER';

  throw new ProviderJsonParseError(
    `${provider} returned invalid JSON: ${parseErrorMessage}`,
    {
      provider,
      model,
      stage: lastFailure?.stage || 'unknown',
      rawPreview: extractJsonFromText(raw || String(text || '')),
      parseErrorMessage,
    },
  );
}
