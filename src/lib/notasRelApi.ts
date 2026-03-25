const API_URL = import.meta.env.VITE_API_URL as string | undefined;

const getToken = () => (typeof window === 'undefined' ? null : window.localStorage.getItem('token'));

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  if (!API_URL) throw new Error('API_URL not configured');
  const token = getToken();
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
};

const parseNumericId = (value?: string | number | null): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
};

export const isNotasRelacionalEnabled = (): boolean => Boolean(API_URL && getToken());

export interface NotaLancamentoRelApi {
  id?: number;
  alunoId?: number;
  alunoNome?: string;
  turmaId?: number;
  turmaNome?: string;
  disciplinaId?: number;
  disciplinaNome?: string;
  periodoId?: number;
  bimestre?: string;
  trabalhosNota?: number | null;
  provasNota?: number | null;
  nota?: number | null;
}

export const listNotasRelacionalLancamentos = async (
  turma: string,
  disciplina: string,
  bimestre: string,
): Promise<NotaLancamentoRelApi[]> => {
  const q = new URLSearchParams({
    turma: turma.trim(),
    disciplina: disciplina.trim(),
    bimestre: bimestre.trim(),
  });
  return request<NotaLancamentoRelApi[]>(`/api/v1/notas-rel/lancamentos?${q.toString()}`);
};

export const listNotasRelacionalPorAluno = async (
  alunoId: string | number,
): Promise<NotaLancamentoRelApi[]> => {
  const id = parseNumericId(alunoId);
  if (!id) return [];
  return request<NotaLancamentoRelApi[]>(`/api/v1/notas-rel/aluno?alunoId=${id}`);
};

export const patchNotaRelacional = async (
  payload: NotaLancamentoRelApi,
): Promise<NotaLancamentoRelApi> =>
  request<NotaLancamentoRelApi>('/api/v1/notas-rel/lancamentos', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
