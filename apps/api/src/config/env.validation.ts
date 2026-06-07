/**
 * Valida variáveis de ambiente obrigatórias na inicialização da API.
 * Em modo test/CI os valores fake são aceitos; nos demais ambientes,
 * a ausência de variáveis críticas causa falha imediata (fail-fast).
 */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const nodeEnv = String(config['NODE_ENV'] ?? 'development');

  // Em test/CI aceitamos valores fake — não bloquear CI
  if (nodeEnv === 'test') {
    return config;
  }

  const required: string[] = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'ADMIN_JWT_SECRET',
  ];

  const missing = required.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(
      `[Selo API] Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}. ` +
        `Verifique o arquivo .env ou as variáveis do ambiente (${nodeEnv}).`,
    );
  }

  return config;
}
