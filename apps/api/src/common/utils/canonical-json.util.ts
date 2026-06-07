import { createHash } from 'crypto';

/**
 * Serializes an object with sorted keys for deterministic hashing.
 * Nested objects are also sorted recursively.
 */
export function canonicalJson(obj: unknown): string {
  return JSON.stringify(sortKeys(obj));
}

/**
 * Returns SHA-256 hex of the canonical JSON representation of obj.
 */
export function sha256(obj: unknown): string {
  return createHash('sha256').update(canonicalJson(obj)).digest('hex');
}

function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
  }
  return sorted;
}
