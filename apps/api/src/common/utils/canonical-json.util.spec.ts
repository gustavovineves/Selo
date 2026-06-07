import { canonicalJson, sha256 } from './canonical-json.util';

describe('canonicalJson', () => {
  it('serializes object with sorted keys', () => {
    expect(canonicalJson({ z: 1, a: 2 })).toBe('{"a":2,"z":1}');
  });

  it('sorts nested object keys recursively', () => {
    const result = canonicalJson({ b: { y: 1, x: 2 }, a: 3 });
    expect(result).toBe('{"a":3,"b":{"x":2,"y":1}}');
  });

  it('is deterministic regardless of insertion order', () => {
    const a = canonicalJson({ foo: 1, bar: 2, baz: 3 });
    const b = canonicalJson({ baz: 3, foo: 1, bar: 2 });
    expect(a).toBe(b);
  });

  it('handles arrays without reordering elements', () => {
    expect(canonicalJson([3, 1, 2])).toBe('[3,1,2]');
  });

  it('handles null and primitives', () => {
    expect(canonicalJson(null)).toBe('null');
    expect(canonicalJson(42)).toBe('42');
    expect(canonicalJson('hello')).toBe('"hello"');
  });
});

describe('sha256', () => {
  it('returns a 64-char hex string', () => {
    const hash = sha256({ event: 'TEST', id: 'abc' });
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('is deterministic for same input', () => {
    const a = sha256({ event: 'TEST', id: 'abc' });
    const b = sha256({ id: 'abc', event: 'TEST' });
    expect(a).toBe(b);
  });

  it('differs for different inputs', () => {
    expect(sha256({ event: 'A' })).not.toBe(sha256({ event: 'B' }));
  });
});
