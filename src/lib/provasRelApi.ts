import { loadFromStorage } from '@/lib/mockStorage';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

const getToken = () => (typeof window === 'undefined' ? null : window.localStorage.getItem('token'));

export interface ProvaQuestaoApi {
  id?: number;
  enunciado: string;
  tipo: string;
  pontos?: number;
  opcoes?: string[];
  corretaIndex?: number | null;
}

export interface ProvaRelApi {
  id?: number;
  professorId?: number;
  professorNome?: string;
  turmaId?: number;
  turmaNome?: string;
  disciplinaId?: number;
  disciplinaNome?: string;
  titulo: string;
  descricao?: string;
  periodo?: string;
  data: string;
  horario?: string;
  instrucoes?: string;
  status?: string;
  publicada?: boolean;
  turno?: string;
  questoes?: ProvaQuestaoApi[];
}

export interface ProvaRespostaItemApi {
  questaoId?: number;
  tipo?: string;
  alternativaIndex?: number | null;
  respostaTexto?: string;
  pontosObtidos?: number | null;
}

export interface ProvaRespostaApi {
  id?: number;
  provaId: number;
  provaTitulo?: string;
  alunoId: number;
  alunoNome?: string;
  turma?: string;
  disciplina?: string;
  status?: string;
  pontosMaximos?: number;
  pontosObtidos?: number;
  notaFinal?: number | null;
  enviadoEm?: string;
  corrigidoEm?: string | number[];
  finalizadaPorTempo?: boolean;
  respostas?: ProvaRespostaItemApi[];
}

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

/** Backend relacional ativo e usuário autenticado. */
export const isProvasRelacionalEnabled = (): boolean => Boolean(API_URL && getToken());

export const createProvaRelacional = async (
  payload: ProvaRelApi,
): Promise<ProvaRelApi> => request<ProvaRelApi>('/api/v1/provas-rel', { method: 'POST', body: JSON.stringify(payload) });

export const listProvasRelacionalParaAluno = async (
  alunoId: string | number,
  disciplina?: string,
): Promise<ProvaRelApi[]> => {
  const id = parseNumericId(alunoId);
  if (!id) return [];
  const q = new URLSearchParams({ alunoId: String(id) });
  if (disciplina?.trim()) q.set('disciplina', disciplina.trim());
  return request<ProvaRelApi[]>(`/api/v1/provas-rel?${q.toString()}`);
};

export const listProvasRelacionalParaProfessor = async (
  professorId: string | number,
): Promise<ProvaRelApi[]> => {
  const id = parseNumericId(professorId);
  if (!id) return [];
  return request<ProvaRelApi[]>(`/api/v1/provas-rel?professorId=${id}`);
};

/** Respostas do aluno com dados da prova (bimestre/período) — para boletim. */
export interface MinhaRespostaComProva {
  provaId: string;
  turma: string;
  disciplina: string;
  periodo: string;
  notaFinal: number | null;
  corrigido: boolean;
}

export const listMinhasRespostasComContexto = async (
  alunoId: string | number,
): Promise<MinhaRespostaComProva[]> => {
  const aid = parseNumericId(alunoId);
  if (!aid) return [];
  const provas = await listProvasRelacionalParaAluno(alunoId);
  const results = await Promise.all(
    provas.map(async (p) => {
      const pid = p.id;
      if (pid == null) return null;
      const r = await getMinhaRespostaRelacional(pid, alunoId);
      if (!r) return null;
      const corrigido =
        r.status === 'Corrigido' ||
        (typeof r.corrigidoEm === 'string' && r.corrigidoEm.length > 0) ||
        (Array.isArray(r.corrigidoEm) && r.corrigidoEm.length > 0);
      return {
        provaId: String(pid),
        turma: p.turmaNome ?? '',
        disciplina: p.disciplinaNome ?? '',
        periodo: (p.periodo ?? '').trim(),
        notaFinal: r.notaFinal ?? null,
        corrigido,
      };
    }),
  );
  return results.filter((x): x is MinhaRespostaComProva => x !== null);
};

export const getProvaRelacional = async (provaId: string | number): Promise<ProvaRelApi | null> => {
  const id = parseNumericId(provaId);
  if (!id) return null;
  try {
    return await request<ProvaRelApi>(`/api/v1/provas-rel/${id}`);
  } catch {
    return null;
  }
};

export const getMinhaRespostaRelacional = async (
  provaId: string | number,
  alunoId: string | number,
): Promise<ProvaRespostaApi | null> => {
  const pid = parseNumericId(provaId);
  const aid = parseNumericId(alunoId);
  if (!pid || !aid) return null;
  try {
    return await request<ProvaRespostaApi>(`/api/v1/provas-rel/${pid}/respostas/me?alunoId=${aid}`);
  } catch {
    return null;
  }
};

export const submitRespostaRelacional = async (
  provaId: string | number,
  alunoId: string | number,
  respostas: ProvaRespostaItemApi[],
  finalizadaPorTempo = false,
): Promise<ProvaRespostaApi> => {
  const pid = parseNumericId(provaId);
  const aid = parseNumericId(alunoId);
  if (!pid || !aid) throw new Error('IDs inválidos');
  return request<ProvaRespostaApi>(`/api/v1/provas-rel/${pid}/respostas`, {
    method: 'POST',
    body: JSON.stringify({
      alunoId: aid,
      finalizadaPorTempo,
      respostas,
    }),
  });
};

export const listRespostasRelacionalParaProfessor = async (
  professorId: string | number,
): Promise<ProvaRespostaApi[]> => {
  const pid = parseNumericId(professorId);
  if (!pid) return [];
  return request<ProvaRespostaApi[]>(`/api/v1/provas-rel/respostas?professorId=${pid}`);
};

export const patchCorrecaoRespostaRelacional = async (
  provaId: string | number,
  alunoId: string | number,
  professorId: string | number,
  notaFinal: number,
): Promise<ProvaRespostaApi> => {
  const pr = parseNumericId(provaId);
  const al = parseNumericId(alunoId);
  const pf = parseNumericId(professorId);
  if (!pr || !al || !pf) throw new Error('IDs inválidos');
  return request<ProvaRespostaApi>(`/api/v1/provas-rel/${pr}/respostas/aluno/${al}`, {
    method: 'PATCH',
    body: JSON.stringify({ professorId: pf, notaFinal }),
  });
};

export const mapRelApiToStorageShape = (item: ProvaRelApi) => ({
  id: String(item.id ?? ''),
  titulo: item.titulo,
  turma: item.turmaNome ?? '',
  disciplina: item.disciplinaNome ?? '',
  periodo: item.periodo ?? '',
  data: item.data,
  horario: item.horario ?? '',
  sala: '',
  instrucoes: item.instrucoes ?? '',
  status: (item.status as 'Agendada' | 'Rascunho' | 'Concluida') ?? 'Agendada',
  publicada: Boolean(item.publicada),
  turno: item.turno ?? '',
  questoes: (item.questoes ?? []).map((q, idx) => ({
    id: String(q.id ?? `q-${idx}`),
    enunciado: q.enunciado,
    tipo: q.tipo === 'aberta' ? 'aberta' : 'multipla',
    pontos: q.pontos ?? 1,
    opcoes: q.opcoes ?? [],
    corretaIndex: q.corretaIndex ?? null,
  })),
});

/** Resolve nome por id do catálogo local quando disponível. */
export const resolveNamesFromLocalStorage = (disciplinaId: string, turmaId: string) => {
  const disciplinas = loadFromStorage<Array<{ id: string; nome: string }>>('school-compass:disciplinas', []);
  const turmas = loadFromStorage<Array<{ id: string; nome: string }>>('school-compass:turmas', []);
  const disciplinaNome = disciplinas.find((d) => d.id === disciplinaId)?.nome ?? '';
  const turmaNome = turmas.find((t) => t.id === turmaId)?.nome ?? '';
  return { disciplinaNome, turmaNome };
};
