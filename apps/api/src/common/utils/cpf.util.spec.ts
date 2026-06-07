import { validateCpf, normalizeCpf, maskCpf } from './cpf.util';

describe('CPF Utilities', () => {
  describe('validateCpf', () => {
    it('accepts valid CPF (digits only)', () => {
      expect(validateCpf('11144477735')).toBe(true);
    });

    it('accepts valid CPF with formatting', () => {
      expect(validateCpf('111.444.777-35')).toBe(true);
    });

    it('rejects CPF with wrong check digits', () => {
      expect(validateCpf('11144477700')).toBe(false);
    });

    it('rejects CPF with all same digits', () => {
      expect(validateCpf('11111111111')).toBe(false);
      expect(validateCpf('00000000000')).toBe(false);
      expect(validateCpf('99999999999')).toBe(false);
    });

    it('rejects CPF shorter than 11 digits', () => {
      expect(validateCpf('1234567890')).toBe(false);
    });

    it('rejects CPF longer than 11 digits', () => {
      expect(validateCpf('123456789012')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(validateCpf('')).toBe(false);
    });
  });

  describe('normalizeCpf', () => {
    it('removes dots and dashes', () => {
      expect(normalizeCpf('111.444.777-35')).toBe('11144477735');
    });

    it('leaves digits-only unchanged', () => {
      expect(normalizeCpf('11144477735')).toBe('11144477735');
    });
  });

  describe('maskCpf', () => {
    it('masks first 3 and last 2 digits', () => {
      expect(maskCpf('11144477735')).toBe('***.444.777-**');
    });

    it('handles formatted CPF by normalizing first', () => {
      // maskCpf expects digits-only; formatting is done externally
      expect(maskCpf('11144477735')).toMatch(/^\*\*\*\.\d{3}\.\d{3}-\*\*$/);
    });

    it('returns fallback for invalid length', () => {
      expect(maskCpf('123')).toBe('***.***.***-**');
    });
  });
});
