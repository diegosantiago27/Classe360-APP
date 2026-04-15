/** Extrai mensagem legível de respostas Problem Details (RFC 7807) do backend. */
export function mensagemErroApi(data: Record<string, unknown>, fallback: string): string {
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const detail = typeof data.detail === 'string' ? data.detail.trim() : '';
  const raw = typeof data.message === 'string' ? data.message : '';
  const message = raw.startsWith('error.') ? '' : raw;
  return title || detail || message || fallback;
}
