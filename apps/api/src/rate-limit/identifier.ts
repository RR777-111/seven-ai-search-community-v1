import { createHash } from 'node:crypto';

const SENSITIVE_IDENTIFIER_NAMES = new Set(['email', 'emailhash', 'ip', 'iphash', 'keyword']);

export function normalizeIdentifier(value: string | number | undefined): string {
  if (value === undefined) {
    return 'unknown';
  }
  return String(value).trim().toLowerCase();
}

export function hashIdentifier(value: string | number | undefined): string {
  return createHash('sha256').update(normalizeIdentifier(value)).digest('hex');
}

export function encodeKeySegment(name: string, value: string | number | undefined): string {
  const normalizedName = normalizeIdentifier(name);
  const normalizedValue = normalizeIdentifier(value);
  const keyValue = SENSITIVE_IDENTIFIER_NAMES.has(normalizedName)
    ? hashIdentifier(normalizedValue)
    : normalizedValue;

  return normalizedName + ':' + keyValue.replace(/[^a-z0-9._:-]/g, '_');
}
