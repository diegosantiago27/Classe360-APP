import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';
import { BarChart3, FileDown, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getInstituicaoApi,
  listAtividadesApi,
  listEntregasAtividadesApi,
  type UsuarioApi,
  type DisciplinaTurmaApi,
} from '@/lib/entityCrudApi';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/auth';
import { gerarRelatorioDesempenhoPdf } from '@/lib/relatorioDesempenhoPdf';
import {
  gerarRelatorioDesempenhoIndividualPdf,
  montarPayloadRelatorioIndividual,
} from '@/lib/relatorioDesempenhoIndividualPdf';
import {
  gerarRelatorioConsolidadoTurmaPdf,
  montarPayloadConsolidadoTurma,
} from '@/lib/relatorioConsolidadoTurmaPdf';
import {
  isNotasRelacionalEnabled,
  listNotasRelacionalPorAluno,
  listNotasRelacionalLancamentos,
  type NotaLancamentoRelApi,
} from '@/lib/notasRelApi';
import {
  isProvasRelacionalEnabled,
  listMinhasRespostasComContexto,
  listProvasRelacionalParaProfessor,
  listRespostasRelacionalParaProfessor,
} from '@/lib/provasRelApi';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

interface TurmaApi {
  id: number;
  nome?: string;
  alunosIds?: number[];
}

interface PeriodoApi {
  id: number;
  nome?: string;
}

interface DisciplinaApi {
  id: number;
  nome?: string;
}

interface NotaApi {
  id: number;
  alunoId?: number | null;
  turmaId?: number | null;
  disciplinaId?: number | null;
  periodoId?: number | null;
  valor?: number | null;
}

interface FrequenciaApi {
  id: number;
  alunoId?: number | null;
  turmaId?: number | null;
  disciplinaId?: number | null;
  data?: string | null;
  presente?: boolean | null;
}

interface AtividadeRelApi {
  id?: number;
  turmaId?: number | null;
  disciplinaId?: number | null;
  descricao?: string;
}

interface EntregaRelApi {
  atividadeId?: number | null;
  alunoId?: number | null;
  nota?: number | null;
}

interface MediasComplementaresAluno {
  trabalhos: number | null;
  provas: number | null;
}

interface PageResponse<T> {
  content?: T[];
  totalPages?: number;
  last?: boolean;
}

const getToken = () => (typeof window === 'undefined' ? null : window.localStorage.getItem('token'));

async function request<T>(path: string): Promise<T> {
  if (!API_URL) throw new Error('API_URL não configurada');
  const token = getToken();
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) {
    throw new Error(`Erro HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

async function fetchAllPages<T>(path: string): Promise<T[]> {
  const size = 500;
  let page = 0;
  const all: T[] = [];

  while (page < 200) {
    const separator = path.includes('?') ? '&' : '?';
    const data = await request<PageResponse<T> | T[]>(`${path}${separator}page=${page}&size=${size}`);
    if (Array.isArray(data)) return data;

    const content = Array.isArray(data.content) ? data.content : [];
    all.push(...content);

    const reachedEndByFlag = typeof data.last === 'boolean' ? data.last : false;
    const reachedEndByPages =
      typeof data.totalPages === 'number' ? page >= Math.max(0, data.totalPages - 1) : false;
    const reachedEndBySize = content.length < size;

    if (reachedEndByFlag || reachedEndByPages || reachedEndBySize) break;
    page += 1;
  }

  return all;
}

const toPercent = (value: number) => Math.round(value * 10) / 10;
const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const n = Number(value.replace(',', '.').trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
};
const normalizeText = (value?: string) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
const bimestreCanon = (value?: string) => {
  const normalized = normalizeText(value).replace(/º/g, 'o');
  const match = normalized.match(/(\d)/);
  return match ? match[1] : normalized.replace(/[^0-9]/g, '') || normalized;
};
const toIdOrNull = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const toNotaValor = (nota: NotaLancamentoRelApi): number | null => {
  const notaFinal = toFiniteNumber(nota.nota);
  if (notaFinal !== null) return notaFinal;
  const trabalhos = toFiniteNumber(nota.trabalhosNota);
  const provas = toFiniteNumber(nota.provasNota);
  if (trabalhos !== null && provas !== null) {
    return Math.round(((trabalhos + provas) / 2) * 10) / 10;
  }
  if (trabalhos !== null) return trabalhos;
  if (provas !== null) return provas;
  return null;
};

const Relatorios: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [turmas, setTurmas] = useState<TurmaApi[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoApi[]>([]);
  const [disciplinas, setDisciplinas] = useState<DisciplinaApi[]>([]);
  const [notas, setNotas] = useState<NotaApi[]>([]);
  const [frequencias, setFrequencias] = useState<FrequenciaApi[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioApi[]>([]);
  const [vinculos, setVinculos] = useState<DisciplinaTurmaApi[]>([]);
  const [notasRelLancamentos, setNotasRelLancamentos] = useState<NotaLancamentoRelApi[]>([]);
  const [falhaNotasRelLancamentos, setFalhaNotasRelLancamentos] = useState(false);
  const [notasRelEscopo, setNotasRelEscopo] = useState<NotaLancamentoRelApi[]>([]);
  const [falhaNotasRelEscopo, setFalhaNotasRelEscopo] = useState(false);
  const [notasRelPorAlunoEscopo, setNotasRelPorAlunoEscopo] = useState<NotaLancamentoRelApi[]>([]);
  const [notasCalculadasDb, setNotasCalculadasDb] = useState<NotaApi[]>([]);
  const [mediasComplementaresAluno, setMediasComplementaresAluno] = useState<Map<number, MediasComplementaresAluno>>(
    () => new Map(),
  );
  const [turma, setTurma] = useState<string>('todas');
  const [disciplina, setDisciplina] = useState<string>('todas');
  const [bimestre, setBimestre] = useState<string>('todos');
  const [alunoSelecionado, setAlunoSelecionado] = useState<string>('nenhum');

  const carregarDados = useCallback(async () => {
    if (!API_URL) {
      setErro('API não configurada. Defina VITE_API_URL para carregar dados do banco.');
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      const [
        turmasData,
        periodosData,
        disciplinasData,
        notasData,
        frequenciasData,
        usuariosData,
        vinculosData,
      ] = await Promise.all([
        fetchAllPages<TurmaApi>('/api/turmas'),
        fetchAllPages<PeriodoApi>('/api/periodos'),
        fetchAllPages<DisciplinaApi>('/api/disciplinas'),
        fetchAllPages<NotaApi>('/api/notas'),
        fetchAllPages<FrequenciaApi>('/api/frequencias'),
        fetchAllPages<UsuarioApi>('/api/usuarios'),
        fetchAllPages<DisciplinaTurmaApi>('/api/disciplina-turmas'),
      ]);
      setTurmas(turmasData);
      setPeriodos(periodosData);
      setDisciplinas(disciplinasData);
      setNotas(notasData);
      setFrequencias(frequenciasData);
      setUsuarios(usuariosData);
      setVinculos(vinculosData);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  const cardsRelatorio = useMemo(
    () => [
      {
        key: 'por-aluno',
        title: 'Relatório de Desempenho por Aluno',
        description: 'Notas, frequência e evolução individual',
        icon: Users,
        tone: 'cyan',
      },
      {
        key: 'consolidado',
        title: 'Relatório Consolidado por Turma',
        description: 'Visão geral de todas as turmas',
        icon: BarChart3,
        tone: 'orange',
      },
      {
        key: 'comparativo',
        title: 'Comparativo Entre Turmas',
        description: 'Análise comparativa de desempenho',
        icon: TrendingUp,
        tone: 'green',
      },
    ],
    [],
  );

  const periodosMap = useMemo(() => {
    const map = new Map<number, string>();
    periodos.forEach((p) => {
      map.set(p.id, p.nome?.trim() || `Período ${p.id}`);
    });
    return map;
  }, [periodos]);

  const periodosOrdenados = useMemo(() => {
    const extrairOrdemPeriodo = (p: PeriodoApi): number => {
      const nome = (p.nome ?? '').trim();
      const matchNumero = nome.match(/^(\d+)/);
      if (matchNumero) {
        return Number(matchNumero[1]);
      }
      return Number(p.id);
    };

    return [...periodos].sort((a, b) => {
      const ordemA = extrairOrdemPeriodo(a);
      const ordemB = extrairOrdemPeriodo(b);
      if (ordemA !== ordemB) {
        return ordemA - ordemB;
      }
      const nomeA = (a.nome ?? '').trim();
      const nomeB = (b.nome ?? '').trim();
      return nomeA.localeCompare(nomeB, 'pt-BR');
    });
  }, [periodos]);

  const disciplinasMap = useMemo(() => {
    const map = new Map<number, string>();
    disciplinas.forEach((d) => {
      map.set(d.id, d.nome?.trim() || `Disciplina ${d.id}`);
    });
    return map;
  }, [disciplinas]);

  const turmasMap = useMemo(() => {
    const map = new Map<number, string>();
    turmas.forEach((t) => {
      map.set(t.id, t.nome?.trim() || `Turma ${t.id}`);
    });
    return map;
  }, [turmas]);
  const turmaIdPorNomeCanon = useMemo(() => {
    const map = new Map<string, number>();
    turmas.forEach((t) => {
      const nome = t.nome?.trim();
      if (nome) map.set(normalizeText(nome), t.id);
    });
    return map;
  }, [turmas]);
  const disciplinaIdPorNomeCanon = useMemo(() => {
    const map = new Map<string, number>();
    disciplinas.forEach((d) => {
      const nome = d.nome?.trim();
      if (nome) map.set(normalizeText(nome), d.id);
    });
    return map;
  }, [disciplinas]);
  const periodoIdPorNomeCanon = useMemo(() => {
    const map = new Map<string, number>();
    periodos.forEach((p) => {
      const nome = p.nome?.trim();
      if (nome) map.set(bimestreCanon(nome), p.id);
    });
    return map;
  }, [periodos]);

  const ehProfessor = user?.perfil === UserProfile.PROFESSOR;

  const vinculosProfessor = useMemo(() => {
    if (!ehProfessor || !user?.id) {
      return [];
    }
    const professorId = String(user.id);
    return vinculos.filter((v) => String(v.professorId ?? '') === professorId);
  }, [ehProfessor, user?.id, vinculos]);

  const paresProfessor = useMemo(() => {
    const set = new Set<string>();
    vinculosProfessor.forEach((v) => {
      if (v.turmaId != null && v.disciplinaId != null) {
        set.add(`${v.turmaId}|${v.disciplinaId}`);
      }
    });
    return set;
  }, [vinculosProfessor]);

  const turmasVisiveis = useMemo(() => {
    if (!ehProfessor) {
      return turmas;
    }
    const ids = new Set(vinculosProfessor.map((v) => Number(v.turmaId)).filter((id) => Number.isFinite(id)));
    return turmas.filter((t) => ids.has(t.id));
  }, [ehProfessor, turmas, vinculosProfessor]);

  const turmaSelecionadaNome = useMemo(() => {
    if (turma === 'todas') return null;
    const turmaId = Number(turma);
    if (!Number.isFinite(turmaId)) return null;
    return turmasMap.get(turmaId) ?? null;
  }, [turma, turmasMap]);

  const disciplinaSelecionadaNome = useMemo(() => {
    if (disciplina === 'todas') return null;
    const disciplinaId = Number(disciplina);
    if (!Number.isFinite(disciplinaId)) return null;
    return disciplinasMap.get(disciplinaId) ?? null;
  }, [disciplina, disciplinasMap]);

  const bimestreSelecionadoNome = useMemo(() => {
    if (bimestre === 'todos') return null;
    const periodoId = Number(bimestre);
    if (!Number.isFinite(periodoId)) return null;
    return periodosMap.get(periodoId) ?? null;
  }, [bimestre, periodosMap]);

  const usarNotasRelFiltradas =
    isNotasRelacionalEnabled() &&
    Boolean(turmaSelecionadaNome && disciplinaSelecionadaNome && bimestreSelecionadoNome);
  const periodosConsultaEscopo = useMemo(() => {
    if (bimestre === 'todos') {
      return periodosOrdenados.map((p) => p.nome?.trim()).filter((nome): nome is string => Boolean(nome));
    }
    return bimestreSelecionadoNome ? [bimestreSelecionadoNome] : [];
  }, [bimestre, bimestreSelecionadoNome, periodosOrdenados]);
  const usarNotasRelEscopo = isNotasRelacionalEnabled() && periodosConsultaEscopo.length > 0;

  useEffect(() => {
    if (!usarNotasRelFiltradas) {
      setNotasRelLancamentos([]);
      setFalhaNotasRelLancamentos(false);
      return;
    }
    setFalhaNotasRelLancamentos(false);
    void listNotasRelacionalLancamentos(
      turmaSelecionadaNome!,
      disciplinaSelecionadaNome!,
      bimestreSelecionadoNome!,
    )
      .then((rows) => setNotasRelLancamentos(rows))
      .catch(() => {
        setFalhaNotasRelLancamentos(true);
        setNotasRelLancamentos([]);
      });
  }, [
    usarNotasRelFiltradas,
    turmaSelecionadaNome,
    disciplinaSelecionadaNome,
    bimestreSelecionadoNome,
  ]);

  useEffect(() => {
    if (!usarNotasRelEscopo) {
      setNotasRelEscopo([]);
      setFalhaNotasRelEscopo(false);
      return;
    }

    const turmasAlvo =
      turma === 'todas'
        ? turmasVisiveis
        : turmasVisiveis.filter((t) => String(t.id) === turma);
    const vinculosBase = ehProfessor ? vinculosProfessor : vinculos;
    const disciplinasBase = ehProfessor
      ? disciplinas.filter((d) =>
          vinculosProfessor.some((v) => Number(v.disciplinaId) === d.id && Number.isFinite(Number(v.disciplinaId))),
        )
      : disciplinas;
    const disciplinasVisiveisEscopo = (() => {
      if (!ehProfessor) return disciplinasBase;
      if (turma === 'todas') return disciplinasBase;
      const turmaId = Number(turma);
      if (!Number.isFinite(turmaId)) return disciplinasBase;
      const ids = new Set(
        vinculosBase
          .filter((v) => Number(v.turmaId) === turmaId && Number.isFinite(Number(v.disciplinaId)))
          .map((v) => Number(v.disciplinaId)),
      );
      if (ids.size === 0) return disciplinasBase;
      return disciplinasBase.filter((d) => ids.has(d.id));
    })();
    const disciplinasAlvo =
      disciplina === 'todas'
        ? disciplinasVisiveisEscopo
        : disciplinasVisiveisEscopo.filter((d) => String(d.id) === disciplina);

    const paresPermitidos = new Set<string>();
    if (ehProfessor) {
      vinculosBase.forEach((v) => {
        const tid = Number(v.turmaId);
        const did = Number(v.disciplinaId);
        if (Number.isFinite(tid) && Number.isFinite(did)) paresPermitidos.add(`${tid}|${did}`);
      });
    }

    const combos = turmasAlvo.flatMap((t) =>
      disciplinasAlvo
        .filter((d) => !ehProfessor || paresPermitidos.size === 0 || paresPermitidos.has(`${t.id}|${d.id}`))
        .map((d) => ({
          turmaNome: t.nome?.trim() || `Turma ${t.id}`,
          disciplinaNome: d.nome?.trim() || `Disciplina ${d.id}`,
        })),
    );

    if (combos.length === 0) {
      setNotasRelEscopo([]);
      setFalhaNotasRelEscopo(false);
      return;
    }

    setFalhaNotasRelEscopo(false);
    let cancelado = false;
    const consultas = combos.flatMap((c) =>
      periodosConsultaEscopo.map((periodoNome) => ({
        ...c,
        periodoNome,
      })),
    );
    void Promise.allSettled(
      consultas.map(async (c) => {
        const rows = await listNotasRelacionalLancamentos(c.turmaNome, c.disciplinaNome, c.periodoNome);
        return rows.map((r) => ({
          ...r,
          turmaNome: r.turmaNome?.trim() || c.turmaNome,
          disciplinaNome: r.disciplinaNome?.trim() || c.disciplinaNome,
          bimestre: r.bimestre?.trim() || c.periodoNome,
        }));
      }),
    )
      .then((resultados) => {
        if (cancelado) return;
        const listasOk = resultados
          .filter(
            (r): r is PromiseFulfilledResult<NotaLancamentoRelApi[]> =>
              r.status === 'fulfilled' && Array.isArray(r.value),
          )
          .map((r) => r.value);
        if (listasOk.length === 0) {
          setFalhaNotasRelEscopo(true);
          setNotasRelEscopo([]);
          return;
        }
        const flatOk = listasOk.flat();
        const dedupOk = new Map<string, NotaLancamentoRelApi>();
        flatOk.forEach((n) => {
          const turmaNomeCanon = normalizeText(n.turmaNome ?? '');
          const disciplinaNomeCanon = normalizeText(n.disciplinaNome ?? '');
          const key = [
            n.alunoId ?? '',
            n.turmaId ?? turmaNomeCanon,
            n.disciplinaId ?? disciplinaNomeCanon,
            bimestreCanon(n.bimestre),
          ].join('|');
          dedupOk.set(key, n);
        });
        setFalhaNotasRelEscopo(false);
        setNotasRelEscopo([...dedupOk.values()]);
      })
      .catch(() => {
        if (cancelado) return;
        setFalhaNotasRelEscopo(true);
        setNotasRelEscopo([]);
      });

    return () => {
      cancelado = true;
    };
  }, [
    bimestre,
    bimestreSelecionadoNome,
    disciplinas,
    disciplina,
    ehProfessor,
    periodosConsultaEscopo,
    turma,
    turmasVisiveis,
    usarNotasRelEscopo,
    vinculos,
    vinculosProfessor,
  ]);

  useEffect(() => {
    if (!isNotasRelacionalEnabled()) {
      setNotasRelPorAlunoEscopo([]);
      return;
    }
    const alunosIds = usuarios
      .filter((u) => String(u.role ?? '').toUpperCase().includes('ALUNO'))
      .map((u) => Number(u.id))
      .filter((id) => Number.isFinite(id));
    if (alunosIds.length === 0) {
      setNotasRelPorAlunoEscopo([]);
      return;
    }
    let cancelado = false;
    void Promise.allSettled(alunosIds.map((id) => listNotasRelacionalPorAluno(id)))
      .then((resultados) => {
        if (cancelado) return;
        const flat = resultados
          .filter(
            (r): r is PromiseFulfilledResult<NotaLancamentoRelApi[]> =>
              r.status === 'fulfilled' && Array.isArray(r.value),
          )
          .flatMap((r) => r.value);
        setNotasRelPorAlunoEscopo(flat);
      })
      .catch(() => {
        if (cancelado) return;
        setNotasRelPorAlunoEscopo([]);
      });
    return () => {
      cancelado = true;
    };
  }, [usuarios]);

  useEffect(() => {
    if (!isProvasRelacionalEnabled()) {
      setNotasCalculadasDb([]);
      return;
    }
    const professorIds = usuarios
      .filter((u) => String(u.role ?? '').toUpperCase().includes('PROFESSOR'))
      .map((u) => Number(u.id))
      .filter((id) => Number.isFinite(id));
    if (professorIds.length === 0) {
      setNotasCalculadasDb([]);
      return;
    }
    let cancelado = false;
    void (async () => {
      const lotes = await Promise.allSettled(
        professorIds.map(async (profId) => {
          const [respostas, provas] = await Promise.all([
            listRespostasRelacionalParaProfessor(profId).catch(() => []),
            listProvasRelacionalParaProfessor(profId).catch(() => []),
          ]);
          return { respostas, provas };
        }),
      );
      if (cancelado) return;
      const lotesOk = lotes
        .filter((r): r is PromiseFulfilledResult<{ respostas: any[]; provas: any[] }> => r.status === 'fulfilled')
        .map((r) => r.value);
      const periodoPorProvaId = new Map<string, string>();
      lotesOk.forEach((l) =>
        l.provas.forEach((p) => {
          if (p.id != null) periodoPorProvaId.set(String(p.id), p.periodo ?? '');
        }),
      );

      const [atividadesRaw, entregasRaw] = await Promise.all([
        listAtividadesApi().catch(() => [] as AtividadeRelApi[]),
        listEntregasAtividadesApi().catch(() => [] as EntregaRelApi[]),
      ]);
      const atividadeById = new Map<number, AtividadeRelApi>();
      atividadesRaw.forEach((a) => {
        const id = Number(a.id);
        if (Number.isFinite(id)) atividadeById.set(id, a);
      });

      const trabalhosByAlunoTurmaDisc = new Map<string, number[]>();
      entregasRaw.forEach((e) => {
        const alunoId = Number(e.alunoId);
        const atividadeId = Number(e.atividadeId);
        const nota = toFiniteNumber(e.nota);
        if (!Number.isFinite(alunoId) || !Number.isFinite(atividadeId) || nota === null) return;
        const atividade = atividadeById.get(atividadeId);
        const turmaId = Number(atividade?.turmaId);
        const disciplinaId = Number(atividade?.disciplinaId);
        if (!Number.isFinite(turmaId) || !Number.isFinite(disciplinaId)) return;
        const key = `${alunoId}|${turmaId}|${disciplinaId}`;
        const arr = trabalhosByAlunoTurmaDisc.get(key) ?? [];
        arr.push(nota);
        trabalhosByAlunoTurmaDisc.set(key, arr);
      });

      const provasByAlunoTurmaDiscPeriodo = new Map<string, number[]>();
      lotesOk.forEach((l) =>
        l.respostas.forEach((r) => {
          const nota = toFiniteNumber(r.notaFinal);
          const alunoId = Number(r.alunoId);
          if (!Number.isFinite(alunoId) || nota === null) return;
          const statusCorrigido =
            r.status === 'Corrigido' ||
            (typeof r.corrigidoEm === 'string' && r.corrigidoEm.length > 0) ||
            (Array.isArray(r.corrigidoEm) && r.corrigidoEm.length > 0);
          if (!statusCorrigido) return;
          const turmaId = turmaIdPorNomeCanon.get(normalizeText(r.turma ?? ''));
          const disciplinaId = disciplinaIdPorNomeCanon.get(normalizeText(r.disciplina ?? ''));
          const periodoNome = periodoPorProvaId.get(String(r.provaId)) ?? '';
          const periodoId = periodoIdPorNomeCanon.get(bimestreCanon(periodoNome));
          if (!turmaId || !disciplinaId || !periodoId) return;
          const key = `${alunoId}|${turmaId}|${disciplinaId}|${periodoId}`;
          const arr = provasByAlunoTurmaDiscPeriodo.get(key) ?? [];
          arr.push(nota);
          provasByAlunoTurmaDiscPeriodo.set(key, arr);
        }),
      );

      const sinteticas: NotaApi[] = [];
      provasByAlunoTurmaDiscPeriodo.forEach((notasProv, key) => {
        const [alunoIdStr, turmaIdStr, disciplinaIdStr, periodoIdStr] = key.split('|');
        const alunoId = Number(alunoIdStr);
        const turmaId = Number(turmaIdStr);
        const disciplinaId = Number(disciplinaIdStr);
        const periodoId = Number(periodoIdStr);
        const mediaProvas = Math.round((notasProv.reduce((a, b) => a + b, 0) / notasProv.length) * 10) / 10;
        const chaveTrab = `${alunoId}|${turmaId}|${disciplinaId}`;
        const notasTrab = trabalhosByAlunoTurmaDisc.get(chaveTrab) ?? [];
        const mediaTrabalhos =
          notasTrab.length > 0
            ? Math.round((notasTrab.reduce((a, b) => a + b, 0) / notasTrab.length) * 10) / 10
            : null;
        const componentes = [mediaProvas, mediaTrabalhos].filter(
          (v): v is number => typeof v === 'number' && Number.isFinite(v),
        );
        if (componentes.length === 0) return;
        const valor = Math.round((componentes.reduce((a, b) => a + b, 0) / componentes.length) * 10) / 10;
        sinteticas.push({
          id: 3000000 + sinteticas.length,
          alunoId,
          turmaId,
          disciplinaId,
          periodoId,
          valor,
        });
      });
      setNotasCalculadasDb(sinteticas);
    })();

    return () => {
      cancelado = true;
    };
  }, [usuarios, turmaIdPorNomeCanon, disciplinaIdPorNomeCanon, periodoIdPorNomeCanon]);

  useEffect(() => {
    if (!usarNotasRelFiltradas || falhaNotasRelLancamentos || notasRelLancamentos.length === 0) {
      setMediasComplementaresAluno(new Map());
      return;
    }
    if (!isProvasRelacionalEnabled()) {
      setMediasComplementaresAluno(new Map());
      return;
    }

    let cancelado = false;
    void (async () => {
      const alunosIds = [
        ...new Set(
          notasRelLancamentos
            .map((n) => n.alunoId)
            .filter((id): id is number => typeof id === 'number' && Number.isFinite(id)),
        ),
      ];
      if (alunosIds.length === 0) {
        if (!cancelado) setMediasComplementaresAluno(new Map());
        return;
      }

      const [atividadesRaw, entregasRaw] = await Promise.all([
        listAtividadesApi().catch(() => [] as AtividadeRelApi[]),
        listEntregasAtividadesApi().catch(() => [] as EntregaRelApi[]),
      ]);

      const atividadesFiltradasIds = new Set(
        atividadesRaw
          .filter((a) => Number(a.turmaId ?? null) === Number(turma))
          .filter((a) => Number(a.disciplinaId ?? null) === Number(disciplina))
          .map((a) => Number(a.id))
          .filter((id) => Number.isFinite(id)),
      );

      const provasPorAluno = new Map<number, number[]>();
      await Promise.all(
        alunosIds.map(async (alunoId) => {
          const respostas = await listMinhasRespostasComContexto(alunoId).catch(() => []);
          const notasValidas = respostas
            .filter((r) => r.corrigido && typeof r.notaFinal === 'number')
            .filter((r) => normalizeText(r.turma) === normalizeText(turmaSelecionadaNome ?? ''))
            .filter((r) => normalizeText(r.disciplina) === normalizeText(disciplinaSelecionadaNome ?? ''))
            .filter((r) => bimestreCanon(r.periodo) === bimestreCanon(bimestreSelecionadoNome ?? ''))
            .map((r) => Number(r.notaFinal))
            .filter((nota) => Number.isFinite(nota));
          provasPorAluno.set(alunoId, notasValidas);
        }),
      );

      const trabalhosPorAluno = new Map<number, number[]>();
      entregasRaw.forEach((e) => {
        const alunoId = Number(e.alunoId);
        const atividadeId = Number(e.atividadeId);
        const nota = Number(e.nota);
        if (!Number.isFinite(alunoId) || !Number.isFinite(atividadeId) || !Number.isFinite(nota)) return;
        if (!atividadesFiltradasIds.has(atividadeId)) return;
        const lista = trabalhosPorAluno.get(alunoId) ?? [];
        lista.push(nota);
        trabalhosPorAluno.set(alunoId, lista);
      });

      const mediasMap = new Map<number, MediasComplementaresAluno>();
      alunosIds.forEach((alunoId) => {
        const notasTrab = trabalhosPorAluno.get(alunoId) ?? [];
        const notasProv = provasPorAluno.get(alunoId) ?? [];
        const mediaTrab =
          notasTrab.length > 0
            ? Math.round((notasTrab.reduce((acc, item) => acc + item, 0) / notasTrab.length) * 10) / 10
            : null;
        const mediaProv =
          notasProv.length > 0
            ? Math.round((notasProv.reduce((acc, item) => acc + item, 0) / notasProv.length) * 10) / 10
            : null;
        mediasMap.set(alunoId, { trabalhos: mediaTrab, provas: mediaProv });
      });
      if (!cancelado) setMediasComplementaresAluno(mediasMap);
    })();

    return () => {
      cancelado = true;
    };
  }, [
    bimestre,
    bimestreSelecionadoNome,
    disciplina,
    disciplinaSelecionadaNome,
    falhaNotasRelLancamentos,
    notasRelLancamentos,
    turma,
    turmaSelecionadaNome,
    usarNotasRelFiltradas,
  ]);

  const alunosFiltrados = useMemo(() => {
    const turmaSelecionadaId = turma === 'todas' ? null : Number(turma);
    const disciplinaSelecionadaId = disciplina === 'todas' ? null : Number(disciplina);
    const periodoSelecionadoId = bimestre === 'todos' ? null : Number(bimestre);
    const alunoIdsEscopo = new Set<number>();

    notas.forEach((n) => {
      if (n.alunoId == null) return;
      if (ehProfessor) {
        if (n.turmaId == null || n.disciplinaId == null) return;
        if (!paresProfessor.has(`${n.turmaId}|${n.disciplinaId}`)) return;
      }
      if (turmaSelecionadaId != null && n.turmaId !== turmaSelecionadaId) return;
      if (disciplinaSelecionadaId != null && n.disciplinaId !== disciplinaSelecionadaId) return;
      if (periodoSelecionadoId != null && n.periodoId !== periodoSelecionadoId) return;
      alunoIdsEscopo.add(n.alunoId);
    });

    frequencias.forEach((f) => {
      if (f.alunoId == null) return;
      if (ehProfessor) {
        if (f.turmaId == null || f.disciplinaId == null) return;
        if (!paresProfessor.has(`${f.turmaId}|${f.disciplinaId}`)) return;
      }
      if (turmaSelecionadaId != null && f.turmaId !== turmaSelecionadaId) return;
      if (disciplinaSelecionadaId != null && f.disciplinaId !== disciplinaSelecionadaId) return;
      alunoIdsEscopo.add(f.alunoId);
    });

    if (turmaSelecionadaId != null) {
      const turmaSelecionada = turmas.find((t) => t.id === turmaSelecionadaId);
      (turmaSelecionada?.alunosIds ?? []).forEach((id) => {
        if (Number.isFinite(Number(id))) alunoIdsEscopo.add(Number(id));
      });
    }

    const restringirPorEscopo =
      ehProfessor || turmaSelecionadaId != null || disciplinaSelecionadaId != null || periodoSelecionadoId != null;

    return usuarios
      .filter((u) => String(u.role ?? '').toUpperCase().includes('ALUNO'))
      .filter((u) => u.ativo !== false)
      .filter((u) => {
        if (!restringirPorEscopo) return true;
        if (!Number.isFinite(Number(u.id))) return false;
        return alunoIdsEscopo.has(Number(u.id));
      })
      .sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR'));
  }, [bimestre, disciplina, ehProfessor, frequencias, notas, paresProfessor, turma, turmas, usuarios]);

  const disciplinasFiltradas = useMemo(() => {
    const disciplinasBase = ehProfessor
      ? disciplinas.filter((d) =>
          vinculosProfessor.some((v) => Number(v.disciplinaId) === d.id && Number.isFinite(Number(v.disciplinaId))),
        )
      : disciplinas;

    if (turma === 'todas') {
      return disciplinasBase;
    }
    const turmaId = Number(turma);
    if (!Number.isFinite(turmaId)) {
      return disciplinasBase;
    }
    const vinculosBase = ehProfessor ? vinculosProfessor : vinculos;
    const ids = new Set(
      vinculosBase
        .filter((v) => Number(v.turmaId) === turmaId && Number.isFinite(Number(v.disciplinaId)))
        .map((v) => Number(v.disciplinaId)),
    );
    if (ids.size === 0) {
      return disciplinasBase;
    }
    return disciplinasBase.filter((d) => ids.has(d.id));
  }, [disciplinas, ehProfessor, turma, vinculos, vinculosProfessor]);

  useEffect(() => {
    if (turma === 'todas') {
      return;
    }
    const selectedExists = turmasVisiveis.some((item) => String(item.id) === turma);
    if (!selectedExists) {
      setTurma('todas');
    }
  }, [turma, turmasVisiveis]);

  useEffect(() => {
    if (disciplina === 'todas') {
      return;
    }
    const selectedExists = disciplinasFiltradas.some((item) => String(item.id) === disciplina);
    if (!selectedExists) {
      setDisciplina('todas');
    }
  }, [disciplina, disciplinasFiltradas]);

  useEffect(() => {
    if (alunoSelecionado === 'nenhum') return;
    const existe = alunosFiltrados.some((u) => String(u.id ?? '') === alunoSelecionado);
    if (!existe) setAlunoSelecionado('nenhum');
  }, [alunoSelecionado, alunosFiltrados]);

  const notasFiltradas = useMemo(() => {
    const notasBaseFiltradas = notas
      .filter((n) => {
        if (ehProfessor) {
          if (n.turmaId == null || n.disciplinaId == null) return false;
          if (!paresProfessor.has(`${n.turmaId}|${n.disciplinaId}`)) return false;
        }
        if (turma !== 'todas' && String(n.turmaId ?? '') !== turma) return false;
        if (bimestre !== 'todos' && String(n.periodoId ?? '') !== bimestre) return false;
        if (disciplina !== 'todas' && String(n.disciplinaId ?? '') !== disciplina) return false;
        const valor = toFiniteNumber(n.valor);
        return typeof valor === 'number';
      })
      .map((n) => ({
        ...n,
        valor: toFiniteNumber(n.valor),
      })) as NotaApi[];

    const mapNotaRelToNotaApi = (
      fonte: NotaLancamentoRelApi[],
      turmaIdSelecionada: number,
      disciplinaIdSelecionada: number,
      periodoIdSelecionado: number,
    ) =>
      fonte
        .map((n, idx) => {
          const alunoId = n.alunoId ?? null;
          const complemento = typeof alunoId === 'number' ? mediasComplementaresAluno.get(alunoId) : undefined;
          const notaManual = toFiniteNumber(n.nota);
          const trabalhosComFallback = toFiniteNumber(n.trabalhosNota) ?? complemento?.trabalhos ?? null;
          const provasComFallback = toFiniteNumber(n.provasNota) ?? complemento?.provas ?? null;
          const turmaIdInferido =
            n.turmaId ??
            turmaIdPorNomeCanon.get(normalizeText(n.turmaNome ?? '')) ??
            (Number.isFinite(turmaIdSelecionada) ? turmaIdSelecionada : null);
          const disciplinaIdInferido =
            n.disciplinaId ??
            disciplinaIdPorNomeCanon.get(normalizeText(n.disciplinaNome ?? '')) ??
            (Number.isFinite(disciplinaIdSelecionada) ? disciplinaIdSelecionada : null);
          const periodoIdInferido =
            n.periodoId ??
            periodoIdPorNomeCanon.get(bimestreCanon(n.bimestre ?? '')) ??
            (Number.isFinite(periodoIdSelecionado) ? periodoIdSelecionado : null);
          let valor = notaManual;
          if (valor === null) {
            const componentes = [trabalhosComFallback, provasComFallback].filter(
              (item): item is number => typeof item === 'number' && Number.isFinite(item),
            );
            if (componentes.length > 0) {
              valor = Math.round((componentes.reduce((acc, item) => acc + item, 0) / componentes.length) * 10) / 10;
            } else {
              valor = toNotaValor(n);
            }
          }
          return {
            id: Number.isFinite(Number(n.id)) ? Number(n.id) : idx + 1,
            alunoId,
            turmaId: turmaIdInferido,
            disciplinaId: disciplinaIdInferido,
            periodoId: periodoIdInferido,
            valor: typeof valor === 'number' ? valor : null,
          } as NotaApi;
        })
        .filter((n) => {
          if (turma !== 'todas' && String(n.turmaId ?? '') !== turma) return false;
          if (bimestre !== 'todos' && String(n.periodoId ?? '') !== bimestre) return false;
          if (disciplina !== 'todas' && String(n.disciplinaId ?? '') !== disciplina) return false;
          return typeof n.valor === 'number';
        });

    if ((usarNotasRelFiltradas && !falhaNotasRelLancamentos) || (usarNotasRelEscopo && !falhaNotasRelEscopo)) {
      const turmaIdSelecionada = Number(turma);
      const disciplinaIdSelecionada = Number(disciplina);
      const periodoIdSelecionado = Number(bimestre);
      const notasRelFonte = usarNotasRelFiltradas && !falhaNotasRelLancamentos ? notasRelLancamentos : notasRelEscopo;
      const notasRelMapeadas = mapNotaRelToNotaApi(notasRelFonte, turmaIdSelecionada, disciplinaIdSelecionada, periodoIdSelecionado);
      const notasRelPorAlunoMapeadas = mapNotaRelToNotaApi(
        notasRelPorAlunoEscopo,
        turmaIdSelecionada,
        disciplinaIdSelecionada,
        periodoIdSelecionado,
      );
      const keyFromNota = (n: NotaApi) =>
        [n.alunoId ?? '', n.turmaId ?? '', n.disciplinaId ?? '', n.periodoId ?? ''].join('|');
      const relKeys = new Set(notasRelMapeadas.map((n) => keyFromNota(n)));
      const faltantesRelAluno = notasRelPorAlunoMapeadas.filter((n) => !relKeys.has(keyFromNota(n)));
      const keysPosAluno = new Set([...relKeys, ...faltantesRelAluno.map((n) => keyFromNota(n))]);
      const faltantesDoRaw = notasBaseFiltradas.filter((n) => !keysPosAluno.has(keyFromNota(n)));
      const keysPosRaw = new Set([...keysPosAluno, ...faltantesDoRaw.map((n) => keyFromNota(n))]);
      const faltantesCalculadas = notasCalculadasDb
        .filter((n) => {
          if (turma !== 'todas' && String(n.turmaId ?? '') !== turma) return false;
          if (bimestre !== 'todos' && String(n.periodoId ?? '') !== bimestre) return false;
          if (disciplina !== 'todas' && String(n.disciplinaId ?? '') !== disciplina) return false;
          return !keysPosRaw.has(keyFromNota(n));
        })
        .map((n) => ({ ...n, valor: toFiniteNumber(n.valor) }))
        .filter((n) => typeof n.valor === 'number');
      return [...notasRelMapeadas, ...faltantesRelAluno, ...faltantesDoRaw, ...faltantesCalculadas];
    }
    const keysBase = new Set(
      notasBaseFiltradas.map((n) => [n.alunoId ?? '', n.turmaId ?? '', n.disciplinaId ?? '', n.periodoId ?? ''].join('|')),
    );
    const fallbackCalculadas = notasCalculadasDb
      .filter((n) => {
        if (turma !== 'todas' && String(n.turmaId ?? '') !== turma) return false;
        if (bimestre !== 'todos' && String(n.periodoId ?? '') !== bimestre) return false;
        if (disciplina !== 'todas' && String(n.disciplinaId ?? '') !== disciplina) return false;
        const key = [n.alunoId ?? '', n.turmaId ?? '', n.disciplinaId ?? '', n.periodoId ?? ''].join('|');
        return !keysBase.has(key);
      })
      .map((n) => ({ ...n, valor: toFiniteNumber(n.valor) }))
      .filter((n) => typeof n.valor === 'number');
    return [...notasBaseFiltradas, ...fallbackCalculadas];
  }, [
    bimestre,
    disciplina,
    ehProfessor,
    falhaNotasRelEscopo,
    falhaNotasRelLancamentos,
    notas,
    notasCalculadasDb,
    notasRelPorAlunoEscopo,
    notasRelEscopo,
    notasRelLancamentos,
    paresProfessor,
    periodoIdPorNomeCanon,
    disciplinaIdPorNomeCanon,
    turmaIdPorNomeCanon,
    mediasComplementaresAluno,
    turma,
    usarNotasRelEscopo,
    usarNotasRelFiltradas,
  ]);

  const notasParaRelatorioIndividual = useMemo(() => {
    if (usarNotasRelFiltradas && !falhaNotasRelLancamentos) {
      return notasFiltradas as NotaApi[];
    }
    return notas;
  }, [falhaNotasRelLancamentos, notas, notasFiltradas, usarNotasRelFiltradas]);

  const frequenciasFiltradas = useMemo(() => {
    return frequencias.filter((f) => {
      if (ehProfessor) {
        if (f.turmaId == null || f.disciplinaId == null) return false;
        if (!paresProfessor.has(`${f.turmaId}|${f.disciplinaId}`)) return false;
      }
      if (turma !== 'todas' && String(f.turmaId ?? '') !== turma) return false;
      if (disciplina !== 'todas' && String(f.disciplinaId ?? '') !== disciplina) return false;
      return true;
    });
  }, [disciplina, ehProfessor, frequencias, paresProfessor, turma]);

  const distribuicaoNotas = useMemo(() => {
    const faixas = [
      { faixa: '0-4', min: 0, max: 4.99, color: '#ef4444', value: 0 },
      { faixa: '5-6', min: 5, max: 6.99, color: '#f59e0b', value: 0 },
      { faixa: '7-8', min: 7, max: 8.99, color: '#06b6d4', value: 0 },
      { faixa: '9-10', min: 9, max: 10, color: '#22c55e', value: 0 },
    ];

    notasFiltradas.forEach((n) => {
      const valor = Number(n.valor);
      if (!Number.isFinite(valor)) return;
      const idx = faixas.findIndex((f) => valor >= f.min && valor <= f.max);
      if (idx >= 0) faixas[idx].value += 1;
    });

    return faixas.map(({ faixa, value, color }) => ({ faixa, value, color }));
  }, [notasFiltradas]);

  const turmasNoComparativo = useMemo(() => {
    if (turma === 'todas') return turmas;
    return turmas.filter((t) => String(t.id) === turma);
  }, [turma, turmas]);

  const comparativoTurma = useMemo(() => {
    return turmasNoComparativo.map((t) => {
      const notasTurma = notasFiltradas
        .filter((n) => n.turmaId === t.id)
        .map((n) => ({ ...n, valorNum: toFiniteNumber(n.valor) }))
        .filter((n): n is NotaApi & { valorNum: number } => typeof n.valorNum === 'number');
      const somaNotas = notasTurma.reduce((acc, item) => acc + item.valorNum, 0);
      const media = notasTurma.length > 0 ? toPercent(somaNotas / notasTurma.length) : 0;

      const freqTurma = frequenciasFiltradas.filter((f) => f.turmaId === t.id);
      const total = freqTurma.length;
      const presentes = freqTurma.filter((f) => f.presente === true).length;
      const frequenciaPct = total > 0 ? toPercent((presentes / total) * 100) : 0;

      return {
        turmaId: t.id,
        turma: t.nome?.trim() || `Turma ${t.id}`,
        media,
        frequencia: frequenciaPct,
      };
    });
  }, [turmasNoComparativo, notasFiltradas, frequenciasFiltradas]);

  const dadosPdfDesempenho = useMemo(() => {
    const turmasAlvo = turma === 'todas' ? turmas : turmas.filter((t) => String(t.id) === turma);
    const nomeDisc = (id: number) => disciplinasMap.get(id) ?? `Disciplina ${id}`;

    const resumoTurmas = turmasAlvo.map((t) => {
      const notasT = notasFiltradas
        .filter((n) => n.turmaId === t.id)
        .map((n) => ({ ...n, valorNum: toFiniteNumber(n.valor) }))
        .filter((n): n is NotaApi & { valorNum: number } => typeof n.valorNum === 'number');
      const alunosIds = new Set(notasT.map((n) => n.alunoId).filter((x): x is number => x != null));
      const media =
        notasT.length > 0
          ? toPercent(notasT.reduce((s, n) => s + n.valorNum, 0) / notasT.length)
          : 0;
      const freqTurma = frequenciasFiltradas.filter((f) => f.turmaId === t.id);
      const frequenciaPct =
        freqTurma.length > 0
          ? toPercent((freqTurma.filter((f) => f.presente === true).length / freqTurma.length) * 100)
          : 0;

      const mediasPorAluno = new Map<number, number[]>();
      notasT.forEach((n) => {
        if (n.alunoId == null) return;
        if (!mediasPorAluno.has(n.alunoId)) mediasPorAluno.set(n.alunoId, []);
        mediasPorAluno.get(n.alunoId)!.push(n.valorNum);
      });
      let aprov = 0;
      let rec = 0;
      let rep = 0;
      mediasPorAluno.forEach((vals) => {
        const m = vals.reduce((a, b) => a + b, 0) / vals.length;
        if (m >= 7) aprov++;
        else if (m >= 5) rec++;
        else rep++;
      });

      return {
        turma: t.nome?.trim() || `Turma ${t.id}`,
        alunos: alunosIds.size,
        media,
        freqPct: frequenciaPct,
        aprovados: aprov,
        recuperacao: rec,
        reprovados: rep,
      };
    });

    const comparativo = comparativoTurma.map((c) => ({
      turma: c.turma,
      media: c.media,
      frequencia: c.frequencia,
    }));

    const discIds = [
      ...new Set(
        notasFiltradas
          .map((n) => n.disciplinaId)
          .filter((x): x is number => x != null && Number.isFinite(Number(x))),
      ),
    ];

    const rankingDisciplinas: Array<{
      disciplina: string;
      primeiroLugar: string;
      media1: number;
      segundoLugar: string;
      media2: number;
    }> = [];
    const comparativoDisciplinas: Array<{
      disciplina: string;
      col1Turma: string;
      col1Media: number;
      col2Turma: string;
      col2Media: number;
    }> = [];

    for (const dId of discIds) {
      const notasD = notasFiltradas
        .filter((n) => n.disciplinaId === dId)
        .map((n) => ({ ...n, valorNum: toFiniteNumber(n.valor) }))
        .filter((n): n is NotaApi & { valorNum: number } => typeof n.valorNum === 'number');
      const turmaIds = [
        ...new Set(
          notasD.map((n) => n.turmaId).filter((x): x is number => x != null && Number.isFinite(Number(x))),
        ),
      ];
      const avgs: Array<{ media: number; nome: string }> = [];
      turmaIds.forEach((tid) => {
        const nx = notasD.filter((n) => n.turmaId === tid);
        const media = nx.length > 0 ? toPercent(nx.reduce((s, n) => s + n.valorNum, 0) / nx.length) : 0;
        const nome = turmas.find((tt) => tt.id === tid)?.nome?.trim() ?? `Turma ${tid}`;
        avgs.push({ media, nome });
      });
      avgs.sort((a, b) => b.media - a.media);
      const first = avgs[0];
      const second = avgs[1];
      rankingDisciplinas.push({
        disciplina: nomeDisc(dId),
        primeiroLugar: first?.nome ?? '—',
        media1: first?.media ?? 0,
        segundoLugar: second?.nome ?? '—',
        media2: second?.media ?? 0,
      });
      comparativoDisciplinas.push({
        disciplina: nomeDisc(dId),
        col1Turma: first?.nome ?? '—',
        col1Media: first?.media ?? 0,
        col2Turma: second?.nome ?? '—',
        col2Media: second?.media ?? 0,
      });
    }

    return { resumoTurmas, comparativo, rankingDisciplinas, comparativoDisciplinas };
  }, [turma, turmas, notasFiltradas, frequenciasFiltradas, comparativoTurma, disciplinasMap]);

  const resumo = useMemo(() => {
    const melhorTurma =
      comparativoTurma.length > 0
        ? [...comparativoTurma].sort((a, b) => b.media - a.media)[0]
        : null;
    const turmaMaisFaltas =
      comparativoTurma.length > 0
        ? [...comparativoTurma].sort((a, b) => a.frequencia - b.frequencia)[0]
        : null;

    const alunosRecuperacaoIds = new Set(
      notasFiltradas
        .filter((n) => {
          const valor = toFiniteNumber(n.valor);
          return typeof valor === 'number' && valor < 6 && n.alunoId != null;
        })
        .map((n) => n.alunoId as number),
    );
    const totalAlunosIds = new Set(
      notasFiltradas.filter((n) => n.alunoId != null).map((n) => n.alunoId as number),
    );
    const aprovadas = notasFiltradas.filter((n) => {
      const valor = toFiniteNumber(n.valor);
      return typeof valor === 'number' && valor >= 6;
    }).length;
    const taxaAprovacao = notasFiltradas.length > 0 ? toPercent((aprovadas / notasFiltradas.length) * 100) : 0;
    const pctRecuperacao =
      totalAlunosIds.size > 0 ? toPercent((alunosRecuperacaoIds.size / totalAlunosIds.size) * 100) : 0;

    return {
      melhorTurma,
      turmaMaisFaltas,
      alunosRecuperacao: alunosRecuperacaoIds.size,
      pctRecuperacao,
      taxaAprovacao,
    };
  }, [comparativoTurma, notasFiltradas]);

  const handleGerarPdfComparativoTurmas = async () => {
    if (!API_URL) {
      toast({
        title: 'API não configurada',
        description: 'Defina VITE_API_URL para gerar o PDF.',
        variant: 'destructive',
      });
      return;
    }
    try {
      let escola = 'Escola';
      try {
        const inst = await getInstituicaoApi();
        escola = inst?.nome?.trim() || escola;
      } catch {
        /* mantém padrão */
      }
      const periodoLabel =
        bimestre === 'todos'
          ? 'Todos os períodos'
          : periodosMap.get(Number(bimestre)) ?? `Período ${bimestre}`;
      gerarRelatorioDesempenhoPdf({
        escolaNome: escola,
        periodoLabel,
        comparativo: dadosPdfDesempenho.comparativo,
        resumoTurmas: dadosPdfDesempenho.resumoTurmas,
        rankingDisciplinas: dadosPdfDesempenho.rankingDisciplinas,
        comparativoDisciplinas: dadosPdfDesempenho.comparativoDisciplinas,
      });
      toast({
        title: 'PDF gerado',
        description: 'Relatório comparativo entre turmas — download iniciado.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao gerar PDF',
        description: error instanceof Error ? error.message : 'Falha desconhecida',
        variant: 'destructive',
      });
    }
  };

  const handleGerarPdfDesempenhoIndividual = async () => {
    if (!API_URL) {
      toast({
        title: 'API não configurada',
        description: 'Defina VITE_API_URL para gerar o PDF.',
        variant: 'destructive',
      });
      return;
    }
    if (alunoSelecionado === 'nenhum') {
      toast({
        title: 'Selecione um aluno',
        description: 'Escolha o aluno no campo acima para gerar o relatório individual.',
        variant: 'destructive',
      });
      return;
    }
    const aid = Number(alunoSelecionado);
    if (!Number.isFinite(aid)) {
      toast({ title: 'Aluno inválido', variant: 'destructive' });
      return;
    }
    try {
      let escola = 'Escola';
      try {
        const inst = await getInstituicaoApi();
        escola = inst?.nome?.trim() || escola;
      } catch {
        /* mantém padrão */
      }
      const usuarioAluno = usuarios.find((u) => Number(u.id) === aid);
      const nome = usuarioAluno?.nome?.trim() ?? `Aluno ${aid}`;
      let notasBase = notasParaRelatorioIndividual;
      let payload = montarPayloadRelatorioIndividual({
        alunoId: aid,
        alunoNome: nome,
        alunoCpf: usuarioAluno?.cpf,
        notas: notasBase,
        frequencias,
        periodos,
        disciplinasMap,
        turmasMap,
        vinculos,
        turmaFiltro: turma,
        bimestreFiltro: bimestre,
        disciplinaFiltro: disciplina,
        periodosMap,
        escolaNome: escola,
      });
      if (!payload && isProvasRelacionalEnabled()) {
        const respostas = await listMinhasRespostasComContexto(aid).catch(() => []);
        if (respostas.length > 0) {
          const periodosPorNomeCanon = new Map<string, number>();
          periodos.forEach((p) => {
            periodosPorNomeCanon.set(bimestreCanon(p.nome ?? `Periodo ${p.id}`), p.id);
          });
          const turmaPorNomeCanon = new Map<string, number>();
          turmas.forEach((t) => {
            turmaPorNomeCanon.set(normalizeText(t.nome ?? `Turma ${t.id}`), t.id);
          });
          const disciplinaPorNomeCanon = new Map<string, number>();
          disciplinas.forEach((d) => {
            disciplinaPorNomeCanon.set(normalizeText(d.nome ?? `Disciplina ${d.id}`), d.id);
          });

          const notasFallback: NotaApi[] = respostas
            .filter((r) => r.corrigido && typeof r.notaFinal === 'number')
            .filter((r) => {
              if (turma !== 'todas' && normalizeText(r.turma) !== normalizeText(turmasMap.get(Number(turma)))) {
                return false;
              }
              if (
                disciplina !== 'todas' &&
                normalizeText(r.disciplina) !== normalizeText(disciplinasMap.get(Number(disciplina)))
              ) {
                return false;
              }
              if (
                bimestre !== 'todos' &&
                bimestreCanon(r.periodo) !== bimestreCanon(periodosMap.get(Number(bimestre)))
              ) {
                return false;
              }
              return true;
            })
            .map((r, idx) => ({
              id: 900000 + idx,
              alunoId: aid,
              turmaId: turmaPorNomeCanon.get(normalizeText(r.turma)) ?? toIdOrNull(turma),
              disciplinaId:
                disciplinaPorNomeCanon.get(normalizeText(r.disciplina)) ?? toIdOrNull(disciplina),
              periodoId: periodosPorNomeCanon.get(bimestreCanon(r.periodo)) ?? toIdOrNull(bimestre),
              valor: r.notaFinal ?? null,
            }));

          if (notasFallback.length > 0) {
            notasBase = [...notasBase, ...notasFallback];
            payload = montarPayloadRelatorioIndividual({
              alunoId: aid,
              alunoNome: nome,
              alunoCpf: usuarioAluno?.cpf,
              notas: notasBase,
              frequencias,
              periodos,
              disciplinasMap,
              turmasMap,
              vinculos,
              turmaFiltro: turma,
              bimestreFiltro: bimestre,
              disciplinaFiltro: disciplina,
              periodosMap,
              escolaNome: escola,
            });
          }
        }
      }
      if (!payload) {
        toast({
          title: 'Sem dados para o PDF',
          description:
            'Não há notas deste aluno com os filtros de turma/período atuais. Ajuste os filtros ou o aluno.',
          variant: 'destructive',
        });
        return;
      }
      gerarRelatorioDesempenhoIndividualPdf(payload);
      toast({
        title: 'PDF gerado',
        description: 'Relatório de desempenho individual — download iniciado.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao gerar PDF',
        description: error instanceof Error ? error.message : 'Falha desconhecida',
        variant: 'destructive',
      });
    }
  };

  const handleGerarPdfConsolidadoTurma = async () => {
    if (!API_URL) {
      toast({
        title: 'API não configurada',
        description: 'Defina VITE_API_URL para gerar o PDF.',
        variant: 'destructive',
      });
      return;
    }
    if (turma === 'todas') {
      toast({
        title: 'Selecione uma turma',
        description: 'Escolha uma turma no filtro para gerar o consolidado.',
        variant: 'destructive',
      });
      return;
    }
    const tid = Number(turma);
    if (!Number.isFinite(tid)) {
      toast({ title: 'Turma inválida', variant: 'destructive' });
      return;
    }
    try {
      let escola = 'Escola';
      try {
        const inst = await getInstituicaoApi();
        escola = inst?.nome?.trim() || escola;
      } catch {
        /* mantém padrão */
      }
      const turmaNome = turmasMap.get(tid) ?? `Turma ${tid}`;
      const payload = montarPayloadConsolidadoTurma({
        turmaId: tid,
        turmaNome,
        notas: notasFiltradas,
        frequencias: frequenciasFiltradas,
        usuarios,
        disciplinasMap,
        vinculos,
        bimestreFiltro: bimestre,
        disciplinaFiltro: disciplina,
        periodosMap,
        escolaNome: escola,
      });
      if (!payload) {
        toast({
          title: 'Sem dados para o PDF',
          description: 'Não há notas para esta turma com o período selecionado.',
          variant: 'destructive',
        });
        return;
      }
      gerarRelatorioConsolidadoTurmaPdf(payload);
      toast({
        title: 'PDF gerado',
        description: 'Relatório consolidado por turma — download iniciado.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao gerar PDF',
        description: error instanceof Error ? error.message : 'Falha desconhecida',
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">Análises de desempenho e frequência</p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Select value={turma} onValueChange={setTurma}>
            <SelectTrigger className="w-full md:w-[220px]">
              <SelectValue placeholder="Todas as turmas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as turmas</SelectItem>
              {turmasVisiveis.map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>
                  {item.nome?.trim() || `Turma ${item.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={bimestre} onValueChange={setBimestre}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Todos os períodos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os períodos</SelectItem>
              {periodosOrdenados.map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>
                  {periodosMap.get(item.id) ?? `Período ${item.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={disciplina} onValueChange={setDisciplina}>
            <SelectTrigger className="w-full md:w-[240px]">
              <SelectValue placeholder="Todas as disciplinas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as disciplinas</SelectItem>
              {disciplinasFiltradas.map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>
                  {disciplinasMap.get(item.id) ?? `Disciplina ${item.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={alunoSelecionado} onValueChange={setAlunoSelecionado}>
            <SelectTrigger className="w-full md:w-[260px]">
              <SelectValue placeholder="Aluno (relatório individual)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nenhum">Nenhum (só para PDF por aluno)</SelectItem>
              {alunosFiltrados.map((u) => (
                <SelectItem key={String(u.id)} value={String(u.id ?? '')}>
                  {u.nome?.trim() ?? `Aluno ${u.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {erro && (
          <Card>
            <CardContent className="pt-6 text-sm text-destructive">{erro}</CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {cardsRelatorio.map((item) => {
            const Icon = item.icon;
            const toneClasses =
              item.tone === 'cyan'
                ? 'bg-cyan-500/15 text-cyan-300'
                : item.tone === 'orange'
                  ? 'bg-orange-500/15 text-orange-300'
                  : 'bg-emerald-500/15 text-emerald-300';

            return (
              <Card key={item.key} className="overflow-hidden">
                <CardContent className="p-6 space-y-4">
                  <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center', toneClasses)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display font-semibold text-base">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      if (item.key === 'comparativo') {
                        void handleGerarPdfComparativoTurmas();
                      } else if (item.key === 'consolidado') {
                        void handleGerarPdfConsolidadoTurma();
                      } else if (item.key === 'por-aluno') {
                        void handleGerarPdfDesempenhoIndividual();
                      }
                    }}
                  >
                    <FileDown className="h-4 w-4" />
                    Gerar Relatório
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <h2 className="font-display text-lg font-semibold">Distribuição de Notas</h2>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distribuicaoNotas}
                      dataKey="value"
                      nameKey="faixa"
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={2}
                      stroke="rgba(255,255,255,0.08)"
                      label={({ cx, cy, midAngle, outerRadius, index }) => {
                        const RADIAN = Math.PI / 180;
                        const safeIndex = typeof index === 'number' ? index : -1;
                        const item = distribuicaoNotas[safeIndex];
                        if (!item) return null;

                        const safeOuterRadius = typeof outerRadius === 'number' ? outerRadius : 110;
                        const radius = safeOuterRadius + 18;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                          <text
                            x={x}
                            y={y}
                            fill={item.color}
                            textAnchor={x > cx ? 'start' : 'end'}
                            dominantBaseline="central"
                            fontSize={12}
                          >
                            {item.faixa}: {item.value}
                          </text>
                        );
                      }}
                    >
                      {distribuicaoNotas.map((entry) => (
                        <Cell key={entry.faixa} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
                {distribuicaoNotas.map((item) => (
                  <div key={item.faixa} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: item.color }} />
                    <span>{item.faixa}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <h2 className="font-display text-lg font-semibold">Comparativo por Turma</h2>
            </CardHeader>
            <CardContent className="pt-0">
              <ChartContainer
                className="aspect-[2/1] w-full"
                config={{
                  media: { label: 'Média', color: '#06b6d4' },
                  frequencia: { label: 'Frequência %', color: '#22c55e' },
                }}
              >
                <BarChart data={comparativoTurma} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="turma" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="media" fill="var(--color-media)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="frequencia" fill="var(--color-frequencia)" radius={[6, 6, 0, 0]} />
                  <ChartLegend content={<ChartLegendContent />} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <h2 className="font-display text-lg font-semibold">Resumo Geral</h2>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Melhor Turma</p>
                  <p className="mt-1 text-lg font-semibold">{resumo.melhorTurma?.turma ?? '-'}</p>
                  <p className="text-xs text-emerald-400">Média: {resumo.melhorTurma?.media ?? 0}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Turma com Mais Faltas</p>
                  <p className="mt-1 text-lg font-semibold">{resumo.turmaMaisFaltas?.turma ?? '-'}</p>
                  <p className="text-xs text-red-400">Frequência: {resumo.turmaMaisFaltas?.frequencia ?? 0}%</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Alunos em Recuperação</p>
                  <p className="mt-1 text-lg font-semibold">{resumo.alunosRecuperacao}</p>
                  <p className="text-xs text-muted-foreground">{resumo.pctRecuperacao}% do total</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Taxa de Aprovação</p>
                  <p className="mt-1 text-lg font-semibold">{resumo.taxaAprovacao}%</p>
                  <p className="text-xs text-muted-foreground">Com base nas notas lançadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Relatorios;

