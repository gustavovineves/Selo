import { sanitizeForProof } from './sensitive-proof-sanitizer.util';

describe('sanitizeForProof', () => {
  it('removes CPF / document fields', () => {
    const result = sanitizeForProof({ document: '11144477735', name: 'Alice' }) as Record<string, unknown>;
    expect(result.document).toBe('[REDACTED]');
    expect(result.name).toBe('Alice');
  });

  it('removes cpf (case-insensitive)', () => {
    const result = sanitizeForProof({ cpf: '111.444.777-35', id: 'abc' }) as Record<string, unknown>;
    expect(result.cpf).toBe('[REDACTED]');
  });

  it('removes passwordHash', () => {
    const result = sanitizeForProof({ passwordHash: '$2b$12$xyz', userId: 'u1' }) as Record<string, unknown>;
    expect(result.passwordHash).toBe('[REDACTED]');
  });

  it('removes full pixKey', () => {
    const result = sanitizeForProof({ pixKey: 'alice@test.com', amount: '100' }) as Record<string, unknown>;
    expect(result.pixKey).toBe('[REDACTED]');
  });

  it('removes normalizedKey', () => {
    const result = sanitizeForProof({ normalizedKey: 'alice', type: 'EMAIL' }) as Record<string, unknown>;
    expect(result.normalizedKey).toBe('[REDACTED]');
  });

  it('removes token fields', () => {
    const result = sanitizeForProof({ accessToken: 'tok', refreshToken: 'ref' }) as Record<string, unknown>;
    expect(result.accessToken).toBe('[REDACTED]');
    expect(result.refreshToken).toBe('[REDACTED]');
  });

  it('removes secret fields', () => {
    const result = sanitizeForProof({ secret: 'shh', apiSecret: 'shh2' }) as Record<string, unknown>;
    expect(result.secret).toBe('[REDACTED]');
    expect(result.apiSecret).toBe('[REDACTED]');
  });

  it('removes rawRequest and rawResponse', () => {
    const result = sanitizeForProof({ rawRequest: { body: '...' }, rawResponse: { status: 200 } }) as Record<string, unknown>;
    expect(result.rawRequest).toBe('[REDACTED]');
    expect(result.rawResponse).toBe('[REDACTED]');
  });

  it('sanitizes nested objects recursively', () => {
    const input = { payment: { pixKey: 'key', amount: '100' }, id: 'abc' };
    const result = sanitizeForProof(input) as { payment: Record<string, unknown>; id: string };
    expect(result.payment.pixKey).toBe('[REDACTED]');
    expect(result.payment.amount).toBe('100');
    expect(result.id).toBe('abc');
  });

  it('sanitizes arrays of objects', () => {
    const input = [{ document: 'cpf', name: 'Bob' }];
    const result = sanitizeForProof(input) as Record<string, unknown>[];
    expect(result[0].document).toBe('[REDACTED]');
    expect(result[0].name).toBe('Bob');
  });

  it('preserves non-sensitive fields', () => {
    const input = { agreementId: 'abc', eventType: 'CREATED', amount: '100', currency: 'BRL' };
    const result = sanitizeForProof(input) as Record<string, unknown>;
    expect(result.agreementId).toBe('abc');
    expect(result.eventType).toBe('CREATED');
    expect(result.amount).toBe('100');
  });

  it('handles null and primitives', () => {
    expect(sanitizeForProof(null)).toBeNull();
    expect(sanitizeForProof(42)).toBe(42);
    expect(sanitizeForProof('hello')).toBe('hello');
  });
});
