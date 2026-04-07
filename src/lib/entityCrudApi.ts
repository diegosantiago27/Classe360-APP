const API_URL = import.meta.env.VITE_API_URL as string | undefined;

const getToken = () => (typeof window === 'undefined' ? null : window.localStorage.getItem('token'));

type PageResponse<T> = {
  content?: T[];
  totalPages?: number;
  last?: boolean;
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  if (!API_URL) throw new Error('API_URL not configured');
  const token = getToken();
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
};

export const isApiEnabled = () => Boolean(API_URL && getToken());

export async function fetchAllPages<T>(path: string): Promise<T[]> {
  const size = 500;
  const rows: T[] = [];
  let page = 0;
  while (page < 200) {
    const separator = path.includes('?') ? '&' : '?';
    const data = await request<PageResponse<T> | T[]>(`${path}${separator}page=${page}&size=${size}`);
    if (Array.isArray(data)) return data;
    const content = Array.isArray(data.content) ? data.content : [];
    rows.push(...content);
    const endByLast = data.last === true;
    const endByPages = typeof data.totalPages === 'number' ? page >= Math.max(0, data.totalPages - 1) : false;
    const endBySize = content.length < size;
    if (endByLast || endByPages || endBySize) break;
    page += 1;
  }
  return rows;
}

export interface PeriodoApi {
  id?: number;
  nome: string;
}

export const listPeriodosApi = () => fetchAllPages<PeriodoApi>('/api/periodos');
export const savePeriodoApi = (payload: PeriodoApi) =>
  request<PeriodoApi>('/api/periodos', { method: 'POST', body: JSON.stringify(payload) });
export const deletePeriodoApi = (id: number) =>
  request<void>(`/api/periodos/${id}`, { method: 'DELETE' });

export interface AvisoApi {
  id?: number;
  titulo: string;
  conteudo: string;
  criadoPorId?: number | null;
  dataCriacao?: string;
}

export const listAvisosApi = () => fetchAllPages<AvisoApi>('/api/avisos');
export const saveAvisoApi = (payload: AvisoApi) =>
  request<AvisoApi>('/api/avisos', { method: 'POST', body: JSON.stringify(payload) });
export const deleteAvisoApi = (id: number) =>
  request<void>(`/api/avisos/${id}`, { method: 'DELETE' });

export interface UsuarioApi {
  id?: number;
  role?: string;
  nome?: string;
  email?: string;
  cpf?: string;
  ativo?: boolean;
  telefone?: string;
  dataNascimento?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  turno?: string;
  materias?: string[];
  turmas?: string[];
  senha?: string;
}

export interface TurnoApi {
  id: number;
  codigo?: string;
  nome?: string;
}

export interface TurmaApi {
  id?: number;
  nome?: string;
  /** Identificador do turno no catálogo (`/api/turnos`). */
  turnoId?: number | null;
  /** Rótulo amigável preenchido pelo backend na leitura. */
  turnoNome?: string | null;
  status?: string;
  professorId?: number | null;
  alunosIds?: number[];
}

export interface NotaApi {
  id?: number;
  valor?: number | null;
}

export interface FrequenciaApi {
  id?: number;
  alunoId?: number | null;
  turmaId?: number | null;
  disciplinaId?: number | null;
  data?: string;
  presente?: boolean | null;
}

export interface ProvaApi {
  id?: number;
  data?: string;
  horario?: string;
  titulo?: string;
  status?: string;
  descricao?: string;
  turmaId?: number | null;
  disciplinaId?: number | null;
  periodo?: string;
  instrucoes?: string;
  publicada?: boolean;
  ativa?: boolean;
  professorId?: number | null;
  turno?: string;
}

export const listUsuariosApi = () => fetchAllPages<UsuarioApi>('/api/usuarios');
export const getUsuarioApi = (id: number) => request<UsuarioApi>(`/api/usuarios/${id}`);
export const saveUsuarioApi = (payload: UsuarioApi) =>
  request<UsuarioApi>('/api/usuarios', { method: 'POST', body: JSON.stringify(payload) });
export const deleteUsuarioApi = (id: number) =>
  request<void>(`/api/usuarios/${id}`, { method: 'DELETE' });
export const listTurmasApi = () => fetchAllPages<TurmaApi>('/api/turmas');
export const listTurnosApi = () => request<TurnoApi[]>('/api/turnos');
export const getTurmaApi = (id: number) => request<TurmaApi>(`/api/turmas/${id}`);
export const saveTurmaApi = (payload: TurmaApi) =>
  request<TurmaApi>('/api/turmas', { method: 'POST', body: JSON.stringify(payload) });
export const deleteTurmaApi = (id: number) =>
  request<void>(`/api/turmas/${id}`, { method: 'DELETE' });
export const listNotasApi = () => fetchAllPages<NotaApi>('/api/notas');
export const listFrequenciasApi = () => fetchAllPages<FrequenciaApi>('/api/frequencias');
export const saveFrequenciaApi = (payload: FrequenciaApi) =>
  request<FrequenciaApi>('/api/frequencias', { method: 'POST', body: JSON.stringify(payload) });
export const listProvasApi = () => fetchAllPages<ProvaApi>('/api/provas');

export const saveProvaApi = (payload: ProvaApi) =>
  request<ProvaApi>('/api/provas', { method: 'POST', body: JSON.stringify(payload) });
export const deleteProvaApi = (id: number) =>
  request<void>(`/api/provas/${id}`, { method: 'DELETE' });

export interface DisciplinaApi {
  id?: number;
  nome?: string;
  descricao?: string;
  cor?: string | null;
}

export const listDisciplinasApi = () => fetchAllPages<DisciplinaApi>('/api/disciplinas');
export const saveDisciplinaApi = (payload: DisciplinaApi) =>
  request<DisciplinaApi>('/api/disciplinas', { method: 'POST', body: JSON.stringify(payload) });
export const deleteDisciplinaApi = (id: number) =>
  request<void>(`/api/disciplinas/${id}`, { method: 'DELETE' });

export interface AtividadeApi {
  id?: number;
  titulo?: string;
  descricao?: string;
  turmaId?: number | null;
  disciplinaId?: number | null;
  dataEntrega?: string;
}

export const listAtividadesApi = () => fetchAllPages<AtividadeApi>('/api/atividades');
export const saveAtividadeApi = (payload: AtividadeApi) =>
  request<AtividadeApi>('/api/atividades', { method: 'POST', body: JSON.stringify(payload) });
export const deleteAtividadeApi = (id: number) =>
  request<void>(`/api/atividades/${id}`, { method: 'DELETE' });

export interface EntregaAtividadeApi {
  id?: number;
  atividadeId?: number | null;
  alunoId?: number | null;
  resposta?: string;
  nota?: number | null;
  corrigido?: boolean | null;
}

export const listEntregasAtividadesApi = () =>
  fetchAllPages<EntregaAtividadeApi>('/api/entregas-atividades');
export const saveEntregaAtividadeApi = (payload: EntregaAtividadeApi) =>
  request<EntregaAtividadeApi>('/api/entregas-atividades', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export interface InstituicaoApi {
  id?: number;
  nome?: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
}

export const getInstituicaoApi = () => request<InstituicaoApi>('/api/instituicao');
export const saveInstituicaoApi = (payload: InstituicaoApi) =>
  request<InstituicaoApi>('/api/instituicao', { method: 'PUT', body: JSON.stringify(payload) });

export interface PreferenciasApi {
  id?: number;
  usuarioId?: number;
  notificacoes?: boolean;
  emails?: boolean;
  modoEscuro?: boolean;
  duploFator?: boolean;
}

export const getPreferenciasApi = () => request<PreferenciasApi>('/api/v1/preferencias/me');
export const savePreferenciasApi = (payload: PreferenciasApi) =>
  request<PreferenciasApi>('/api/v1/preferencias/me', { method: 'PUT', body: JSON.stringify(payload) });

export interface GradeAulaApi {
  id?: number;
  disciplinaId?: number | null;
  turmaId?: number | null;
  dia?: string;
  inicio?: string;
  fim?: string;
}

export const listGradeAulasApi = () => fetchAllPages<GradeAulaApi>('/api/grade-aulas');
export const saveGradeAulaApi = (payload: GradeAulaApi) =>
  request<GradeAulaApi>('/api/grade-aulas', { method: 'POST', body: JSON.stringify(payload) });
export const deleteGradeAulaApi = (id: number) =>
  request<void>(`/api/grade-aulas/${id}`, { method: 'DELETE' });

export interface DisciplinaTurmaApi {
  id?: number;
  disciplinaId?: number | null;
  turmaId?: number | null;
  professorId?: number | null;
  disciplinaNome?: string;
  turmaNome?: string;
  professorNome?: string;
}

export const listDisciplinaTurmasApi = () => fetchAllPages<DisciplinaTurmaApi>('/api/disciplina-turmas');
export const saveDisciplinaTurmaApi = (payload: DisciplinaTurmaApi) =>
  request<DisciplinaTurmaApi>('/api/disciplina-turmas', { method: 'POST', body: JSON.stringify(payload) });
export const deleteDisciplinaTurmaApi = (id: number) =>
  request<void>(`/api/disciplina-turmas/${id}`, { method: 'DELETE' });
