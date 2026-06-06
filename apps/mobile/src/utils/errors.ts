type ErrorWithStatus = Error & { status?: number };

export function mapError(e: unknown): string {
  if (!(e instanceof Error)) return 'Algo deu errado. Tente novamente.';

  const msg = e.message;
  const status = (e as ErrorWithStatus).status;

  if (msg === 'SESSION_EXPIRED') {
    return 'Sua sessão expirou. Entre novamente para continuar.';
  }
  if (msg.toLowerCase().includes('unauthorized') || msg.includes('401')) {
    return 'Sua sessão expirou. Entre novamente para continuar.';
  }

  switch (status) {
    case 400:
      return msg || 'Dados inválidos. Verifique as informações e tente novamente.';
    case 403:
      return 'Você não tem permissão para fazer isso.';
    case 404:
      return 'Não encontramos esse registro.';
    case 409:
      return msg || 'Essa ação não está disponível no estado atual do combinado.';
    case 500:
      return 'Tente novamente em alguns instantes.';
  }

  if (
    msg.toLowerCase().includes('network') ||
    msg.toLowerCase().includes('failed to fetch') ||
    msg.toLowerCase().includes('network request failed')
  ) {
    return 'Não foi possível conectar ao Selo agora.';
  }
  if (msg.toLowerCase().includes('internal')) {
    return 'Tente novamente em alguns instantes.';
  }

  return msg || 'Algo deu errado. Tente novamente.';
}

export function isSessionExpired(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const msg = e.message;
  return (
    msg === 'SESSION_EXPIRED' ||
    msg.toLowerCase().includes('unauthorized') ||
    msg.includes('401')
  );
}
