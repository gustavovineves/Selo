/**
 * Fields that must never appear in blockchain proof payloads.
 * Includes CPF, passwords, tokens, full Pix keys, and financial secrets.
 */
const BLOCKED_FIELD_PATTERNS = [
  /^(document|cpf)$/i,
  /^password/i,
  /token/i,
  /secret/i,
  /^(pixKey|pix_key)$/i,
  /^(normalizedKey|normalized_key)$/i,
  /^(refreshToken|accessToken)$/i,
  /^(passwordHash|password_hash)$/i,
  /^authorization$/i,
  /^(rawRequest|rawResponse)$/i,
];

const HASH_PLACEHOLDER = '[REDACTED]';

/**
 * Recursively removes sensitive fields from an object before hashing.
 * Rules:
 * - CPF / document fields → removed
 * - Password / token / secret fields → removed
 * - Full Pix keys → removed
 * - Raw request/response payloads → removed
 * Returns a new object safe for blockchain proof storage.
 */
export function sanitizeForProof(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForProof);

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (isBlockedField(key)) {
      result[key] = HASH_PLACEHOLDER;
    } else {
      result[key] = sanitizeForProof(value);
    }
  }
  return result;
}

function isBlockedField(key: string): boolean {
  return BLOCKED_FIELD_PATTERNS.some((pattern) => pattern.test(key));
}
