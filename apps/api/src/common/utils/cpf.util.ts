// Digits-only CPF: "12345678901"
// Formatted CPF: "123.456.789-01"
// Masked CPF response: "***.456.789-**"

export function validateCpf(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const calc = (len: number): number => {
    let sum = 0;
    for (let i = 0; i < len; i++) {
      sum += parseInt(digits[i], 10) * (len + 1 - i);
    }
    const rem = (sum * 10) % 11;
    return rem === 10 ? 0 : rem;
  };

  return calc(9) === parseInt(digits[9], 10) && calc(10) === parseInt(digits[10], 10);
}

export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, '');
}

// Returns "***.**9.789-**" style — hides first 3 and last 2 digits
export function maskCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return '***.***.***-**';
  return `***.${d[3]}${d[4]}${d[5]}.${d[6]}${d[7]}${d[8]}-**`;
}
