import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import type { NotasListFiltersState } from '@/pages/Notas';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/auth';
import { StoredUser, usersStorageKey } from '@/lib/mockUsers';
import { Turma, turmasStorageKey } from '@/lib/mockTurmas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createId, loadFromStorage, saveToStorage, syncKeysFromBackend } from '@/lib/mockStorage';
import {
  isProvasRelacionalEnabled,
  listProvasRelacionalParaProfessor,
  listRespostasRelacionalParaProfessor,
} from '@/lib/provasRelApi';
import {
  isNotasRelacionalEnabled,
  listNotasRelacionalLancamentos,
  listNotasRelacionalResumo,
  patchNotaRelacional,
} from '@/lib/notasRelApi';
import {
  isApiEnabled,
  listAtividadesApi,
  listDisciplinasApi,
  listEntregasAtividadesApi,
  listTurmasApi,
  listUsuariosApi,
} from '@/lib/entityCrudApi';
import { loadVinculosDisciplinaTurma } from '@/lib/vinculosRelacional';

interface Lancamento {
  id: string;
  turma: string;
  disciplina: string;
  bimestre: string;
}

interface AlunoTurma {
  id: string;
  nome: string;
  turma: string;
}

interface NotaAluno {
  id: string;
  alunoId: string;
  alunoNome: string;
  turma: string;
  disciplina: string;
  bimestre: string;
  trabalhosNota?: number | null;
  provasNota?: number | null;
  nota: number | null;
}

interface ProvaResposta {
  id: string;
  provaId: string;
  alunoId: string;
  alunoNome: string;
  turma: string;
  disciplina: string;
  status: 'Enviado' | 'Corrigido';
  notaFinal?: number | null;
  /** Período/bimestre da prova (para filtrar média no lançamento correto). */
  periodo?: string;
}

interface AtividadeEntrega {
  id: string;
  atividadeId: string;
  alunoId: string;
  alunoNome: string;
  disciplina: string;
  turma?: string;
  periodo?: string;
  nota?: number | null;
}

interface AtividadeCatalogo {
  id: string;
  turma?: string;
  disciplina?: string;
  periodo?: string;
  descricao?: string;
}

const parsePeriodoFromDescricao = (descricao?: string) => {
  if (!descricao?.trim()) return '';
  try {
    const parsed = JSON.parse(descricao) as { periodo?: string };
    return parsed?.periodo?.trim() ?? '';
  } catch {
    return '';
  }
};

const lancamentosStorageKey = 'school-compass:notas';
const notasAlunosStorageKey = 'school-compass:notas-alunos';
const provasRespostasStorageKey = 'school-compass:provas-respostas';
const provasStorageKey = 'school-compass:provas';
const atividadesStorageKey = 'school-compass:atividades';
const atividadesEntregasStorageKey = 'school-compass:atividades-entregas';
const vinculosStorageKey = 'school-compass:disciplinas-vinculos';

interface DisciplinaVinculoStorage {
  turmaId: string;
  turmaNome: string;
  alunos?: Array<{
    alunoId: string;
    alunoNome: string;
  }>;
}

const normalizeText = (value?: string) =>
  (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const getTurmaKey = (value?: string) => {
  const normalized = normalizeText(value)
    .replace(/º/g, 'o')
    .replace(/\s+/g, ' ');
  const match = normalized.match(/(\d+)\s*(?:o|ano)?\s*([a-z])/i);
  if (match) return `${match[1]}${match[2]}`.toLowerCase();
  return normalized.replace(/[^a-z0-9]/g, '');
};

/** Compara rótulos de bimestre (ex.: "2º Bimestre" com cadastro da prova). */
const bimestreCompativel = (periodoProva: string | undefined, bimestreLancamento: string) => {
  const p = normalizeText(periodoProva ?? '').replace(/º/g, 'o').replace(/[^a-z0-9]/g, '');
  const b = normalizeText(bimestreLancamento).replace(/º/g, 'o').replace(/[^a-z0-9]/g, '');
  if (!p) return true;
  return p === b;
};
const round1 = (value: number) => Math.round(value * 10) / 10;
const asNota = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return round1(value);
};
const notasIguais = (a: number | null | undefined, b: number | null | undefined) =>
  (a == null ? null : round1(a)) === (b == null ? null : round1(b));
const mesmoLancamento = (
  nota: Pick<NotaAluno, 'turma' | 'disciplina' | 'bimestre'>,
  lancamento: Pick<Lancamento, 'turma' | 'disciplina' | 'bimestre'>,
) =>
  normalizeText(nota.turma) === normalizeText(lancamento.turma) &&
  normalizeText(nota.disciplina) === normalizeText(lancamento.disciplina) &&
  bimestreCompativel(nota.bimestre, lancamento.bimestre);

const NotaTurma: React.FC = () => {
  const { user } = useAuth();
  const podeEditarNotas = user?.perfil !== UserProfile.SECRETARIA;
  const { id } = useParams();
  const location = useLocation();
  const [lancamentoRelApi, setLancamentoRelApi] = useState<Lancamento | null>(null);
  const lancamentos = useMemo(
    () => (isNotasRelacionalEnabled() ? [] : loadFromStorage<Lancamento[]>(lancamentosStorageKey, [])),
    [],
  );
  const lancamento = useMemo(
    () => lancamentos.find((item) => item.id === id) ?? null,
    [id, lancamentos],
  );
  const lancamentoFromState = useMemo(() => {
    const state = location.state as { lancamento?: Lancamento; listFilters?: NotasListFiltersState } | null;
    return state?.lancamento ?? null;
  }, [location.state]);

  useEffect(() => {
    if (!isNotasRelacionalEnabled() || !id || lancamentoFromState) {
      if (!isNotasRelacionalEnabled() || lancamentoFromState) setLancamentoRelApi(null);
      return;
    }
    void listNotasRelacionalResumo()
      .then((rows) => {
        const hit = rows.find((r) => r.id === id);
        if (!hit) {
          setLancamentoRelApi(null);
          return;
        }
        setLancamentoRelApi({
          id: hit.id ?? id,
          turma: hit.turmaNome ?? '',
          disciplina: hit.disciplinaNome ?? '',
          bimestre: hit.bimestre ?? '',
        });
      })
      .catch(() => setLancamentoRelApi(null));
  }, [id, lancamentoFromState]);

  const lancamentoAtual = lancamentoFromState ?? lancamentoRelApi ?? lancamento;

  const listFiltersRetorno = useMemo((): NotasListFiltersState => {
    const st = location.state as { listFilters?: NotasListFiltersState } | null;
    if (st?.listFilters) return st.listFilters;
    if (lancamentoAtual) {
      return {
        turmaSelecionada: lancamentoAtual.turma,
        disciplinaSelecionada: lancamentoAtual.disciplina,
        bimestreSelecionado: lancamentoAtual.bimestre,
        busca: '',
        statusSelecionado: 'todos',
      };
    }
    return {
      turmaSelecionada: 'todas',
      disciplinaSelecionada: 'todas',
      bimestreSelecionado: 'todos',
      busca: '',
      statusSelecionado: 'todos',
    };
  }, [location.state, lancamentoAtual]);
  const [notasAlunos, setNotasAlunos] = useState<NotaAluno[]>(
    () => (isNotasRelacionalEnabled() ? [] : loadFromStorage<NotaAluno[]>(notasAlunosStorageKey, [])),
  );
  const [storageTick, setStorageTick] = useState(0);
  const [respostasProvasRel, setRespostasProvasRel] = useState<ProvaResposta[]>([]);
  const [entregasAtividadesApi, setEntregasAtividadesApi] = useState<AtividadeEntrega[]>([]);
  const [carregandoNotasRel, setCarregandoNotasRel] = useState(false);

  useEffect(() => {
    const keysBase = [
      notasAlunosStorageKey,
      provasRespostasStorageKey,
      provasStorageKey,
      atividadesStorageKey,
      atividadesEntregasStorageKey,
      usersStorageKey,
      turmasStorageKey,
    ];
    const keys = isApiEnabled() ? keysBase : [...keysBase, vinculosStorageKey];
    void syncKeysFromBackend(keys).finally(() => {
      setNotasAlunos(
        isNotasRelacionalEnabled() ? [] : loadFromStorage<NotaAluno[]>(notasAlunosStorageKey, []),
      );
      setStorageTick((t) => t + 1);
      if (isApiEnabled()) {
        void loadVinculosDisciplinaTurma()
          .then((rows) => {
            if (!isNotasRelacionalEnabled()) {
              saveToStorage(vinculosStorageKey, rows);
            }
            setStorageTick((k) => k + 1);
          })
          .catch(() => null);
      }
    });
  }, []);

  useEffect(() => {
    if (!isProvasRelacionalEnabled() || !user?.id) {
      setRespostasProvasRel([]);
      return;
    }
    const carregarRespostas = async () => {
      const ehProfessor = user.perfil === UserProfile.PROFESSOR;
      if (ehProfessor) {
        return Promise.all([
          listRespostasRelacionalParaProfessor(user.id),
          listProvasRelacionalParaProfessor(user.id),
        ]);
      }
      const usuarios = await listUsuariosApi();
      const professoresIds = Array.from(
        new Set(
          usuarios
            .filter((u) => String(u.role ?? '').toUpperCase().includes('PROFESSOR'))
            .map((u) => String(u.id ?? '').trim())
            .filter((id) => id.length > 0),
        ),
      );
      if (professoresIds.length === 0) return [[], []] as const;
      const lotes = await Promise.all(
        professoresIds.map(async (professorId) => {
          const [respostas, provas] = await Promise.all([
            listRespostasRelacionalParaProfessor(professorId).catch(() => []),
            listProvasRelacionalParaProfessor(professorId).catch(() => []),
          ]);
          return { respostas, provas };
        }),
      );
      return [
        lotes.flatMap((lote) => lote.respostas),
        lotes.flatMap((lote) => lote.provas),
      ] as const;
    };
    void carregarRespostas()
      .then(([respostas, provas]) => {
        const periodoPorProva = new Map<string, string>();
        const turmaPorProva = new Map<string, string>();
        const disciplinaPorProva = new Map<string, string>();
        provas.forEach((p) => {
          if (p.id != null) {
            const provaId = String(p.id);
            periodoPorProva.set(provaId, p.periodo ?? '');
            turmaPorProva.set(provaId, p.turmaNome ?? '');
            disciplinaPorProva.set(provaId, p.disciplinaNome ?? '');
          }
        });
        setRespostasProvasRel(
          respostas.map((r) => {
            const corrigido =
              r.status === 'Corrigido' ||
              (typeof r.corrigidoEm === 'string' && r.corrigidoEm.length > 0) ||
              (Array.isArray(r.corrigidoEm) && r.corrigidoEm.length > 0);
            return {
              id: String(r.id ?? `${r.provaId}-${r.alunoId}`),
              provaId: String(r.provaId),
              alunoId: String(r.alunoId),
              alunoNome: r.alunoNome ?? '',
              turma: r.turma ?? turmaPorProva.get(String(r.provaId)) ?? '',
              disciplina: r.disciplina ?? disciplinaPorProva.get(String(r.provaId)) ?? '',
              status: corrigido ? 'Corrigido' : 'Enviado',
              notaFinal: r.notaFinal ?? null,
              periodo: periodoPorProva.get(String(r.provaId)) ?? '',
            };
          }),
        );
      })
      .catch(() => setRespostasProvasRel([]));
  }, [user?.id, user?.perfil]);

  useEffect(() => {
    if (!isApiEnabled()) {
      setEntregasAtividadesApi([]);
      return;
    }
    let cancelado = false;
    void Promise.all([listEntregasAtividadesApi(), listAtividadesApi(), listTurmasApi(), listDisciplinasApi()])
      .then(([entregas, atividades, turmasApi, disciplinasApi]) => {
        if (cancelado) return;
        const turmaNomeById = new Map(
          turmasApi.map((t) => [String(t.id ?? ''), (t.nome ?? `Turma ${t.id ?? ''}`).trim()]),
        );
        const disciplinaNomeById = new Map(
          disciplinasApi.map((d) => [String(d.id ?? ''), (d.nome ?? `Disciplina ${d.id ?? ''}`).trim()]),
        );
        const atividadeById = new Map(
          atividades.map((a) => {
            const metaPeriodo = parsePeriodoFromDescricao(a.descricao);
            return [
              String(a.id ?? ''),
              {
                turma: turmaNomeById.get(String(a.turmaId ?? '')) ?? '',
                disciplina: disciplinaNomeById.get(String(a.disciplinaId ?? '')) ?? '',
                periodo: metaPeriodo,
              },
            ] as const;
          }),
        );
        const mapped: AtividadeEntrega[] = entregas.map((e) => {
          const meta = atividadeById.get(String(e.atividadeId ?? ''));
          return {
            id: String(e.id ?? ''),
            atividadeId: String(e.atividadeId ?? ''),
            alunoId: String(e.alunoId ?? ''),
            alunoNome: '',
            disciplina: meta?.disciplina ?? '',
            turma: meta?.turma ?? '',
            periodo: meta?.periodo ?? '',
            nota: e.nota ?? null,
          };
        });
        setEntregasAtividadesApi(mapped);
      })
      .catch(() => {
        if (cancelado) return;
        setEntregasAtividadesApi([]);
      });
    return () => {
      cancelado = true;
    };
  }, [storageTick]);

  useEffect(() => {
    if (!lancamentoAtual || !isNotasRelacionalEnabled()) return;
    setCarregandoNotasRel(true);
    void listNotasRelacionalLancamentos(lancamentoAtual.turma, lancamentoAtual.disciplina, lancamentoAtual.bimestre)
      .then((rows) => {
        const fromApi: NotaAluno[] = rows.map((r) => ({
          id: String(r.id ?? createId('nota-aluno-rel')),
          alunoId: String(r.alunoId ?? ''),
          alunoNome: r.alunoNome ?? `Aluno ${r.alunoId ?? ''}`,
          turma: r.turmaNome ?? lancamentoAtual.turma,
          disciplina: r.disciplinaNome ?? lancamentoAtual.disciplina,
          bimestre: r.bimestre ?? lancamentoAtual.bimestre,
          trabalhosNota: r.trabalhosNota ?? null,
          provasNota: r.provasNota ?? null,
          nota: r.nota ?? null,
        }));
        if (fromApi.length === 0) return;
        setNotasAlunos((prev) => {
          const keyOf = (n: NotaAluno) => `${n.alunoId}::${normalizeText(n.turma)}::${normalizeText(n.disciplina)}::${normalizeText(n.bimestre)}`;
          const map = new Map<string, NotaAluno>(prev.map((n) => [keyOf(n), n]));
          fromApi.forEach((n) => map.set(keyOf(n), n));
          const merged = Array.from(map.values());
          return merged;
        });
      })
      .catch(() => {
        // fallback local
      })
      .finally(() => setCarregandoNotasRel(false));
  }, [lancamentoAtual?.turma, lancamentoAtual?.disciplina, lancamentoAtual?.bimestre]);

  const usuarios = useMemo(
    () => loadFromStorage<StoredUser[]>(usersStorageKey, []),
    [storageTick],
  );
  const vinculos = useMemo(
    () => loadFromStorage<DisciplinaVinculoStorage[]>(vinculosStorageKey, []),
    [storageTick],
  );
  const turmas = useMemo(
    () => loadFromStorage<Turma[]>(turmasStorageKey, []),
    [storageTick],
  );
  const respostasProvasLocal = useMemo(
    () => loadFromStorage<ProvaResposta[]>(provasRespostasStorageKey, []),
    [storageTick],
  );
  const provasCatalogo = useMemo(
    () => loadFromStorage<Array<{ id: string; periodo?: string }>>(provasStorageKey, []),
    [storageTick],
  );
  const atividadesCatalogo = useMemo(
    () => loadFromStorage<AtividadeCatalogo[]>(atividadesStorageKey, []),
    [storageTick],
  );
  const periodoPorProvaIdLocal = useMemo(
    () => new Map(provasCatalogo.map((p) => [p.id, p.periodo ?? ''])),
    [provasCatalogo],
  );
  const atividadeMetaPorId = useMemo(() => {
    const map = new Map<string, { turma: string; disciplina: string; periodo: string }>();
    atividadesCatalogo.forEach((a) => {
      map.set(String(a.id), {
        turma: a.turma ?? '',
        disciplina: a.disciplina ?? '',
        periodo: a.periodo ?? parsePeriodoFromDescricao(a.descricao),
      });
    });
    return map;
  }, [atividadesCatalogo]);

  const respostasProvas = useMemo(() => {
    const byKey = new Map<string, ProvaResposta>();
    const keyOf = (r: ProvaResposta) => `${r.provaId}-${r.alunoId}`;
    const enriquecer = (r: ProvaResposta): ProvaResposta => ({
      ...r,
      periodo: r.periodo ?? periodoPorProvaIdLocal.get(r.provaId) ?? '',
    });
    respostasProvasLocal.forEach((r) => byKey.set(keyOf(r), enriquecer({ ...r })));
    respostasProvasRel.forEach((r) => byKey.set(keyOf(r), enriquecer({ ...r })));
    return Array.from(byKey.values());
  }, [respostasProvasLocal, respostasProvasRel, periodoPorProvaIdLocal]);

  const entregasAtividadesLocal = useMemo(
    () => loadFromStorage<AtividadeEntrega[]>(atividadesEntregasStorageKey, []),
    [storageTick],
  );
  const entregasAtividades = useMemo(
    () => (isApiEnabled() ? entregasAtividadesApi : entregasAtividadesLocal),
    [entregasAtividadesApi, entregasAtividadesLocal],
  );

  const alunosTurmaAtual = useMemo(() => {
    if (!lancamentoAtual) return [];
    const turmaKey = getTurmaKey(lancamentoAtual.turma);

    const alunosPorCadastro = usuarios
      .filter(
        (u) =>
          u.perfil === UserProfile.ALUNO &&
          u.status === 'ativo' &&
          (u.turmas ?? []).some((turmaNome) => getTurmaKey(turmaNome) === turmaKey),
      )
      .map((u) => ({ id: u.id, nome: u.nome, turma: lancamentoAtual.turma }));

    const alunosPorVinculo = vinculos
      .filter((v) => {
        const turmaNomePorId = turmas.find((t) => t.id === v.turmaId)?.nome;
        return (
          getTurmaKey(v.turmaNome) === turmaKey ||
          getTurmaKey(turmaNomePorId) === turmaKey ||
          getTurmaKey(v.turmaId) === turmaKey
        );
      })
      .flatMap((v) => v.alunos ?? [])
      .map((a) => {
        const usuario = usuarios.find((u) => u.id === a.alunoId);
        return {
          id: a.alunoId,
          nome: usuario?.nome ?? a.alunoNome,
          turma: lancamentoAtual.turma,
        };
      });

    const alunosPorProvaCorrigida = respostasProvas
      .filter((resposta) => {
        const mesmaTurma = getTurmaKey(resposta.turma) === turmaKey;
        const mesmaDisciplina =
          normalizeText(resposta.disciplina) === normalizeText(lancamentoAtual.disciplina);
        const mesmoBimestre = bimestreCompativel(resposta.periodo, lancamentoAtual.bimestre);
        return mesmaTurma && mesmaDisciplina && mesmoBimestre;
      })
      .map((resposta) => {
        const usuario = usuarios.find((u) => u.id === resposta.alunoId);
        return {
          id: resposta.alunoId,
          nome: usuario?.nome ?? resposta.alunoNome ?? `Aluno ${resposta.alunoId}`,
          turma: lancamentoAtual.turma,
        };
      });

    const unicos = new Map<string, AlunoTurma>();
    [...alunosPorCadastro, ...alunosPorVinculo, ...alunosPorProvaCorrigida].forEach((aluno) => {
      if (!unicos.has(aluno.id)) {
        unicos.set(aluno.id, aluno);
      }
    });

    return Array.from(unicos.values()).sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }),
    );
  }, [lancamentoAtual, turmas, usuarios, vinculos, respostasProvas]);

  const notasDaTurma = useMemo(() => {
    if (!lancamentoAtual) return [];
    return notasAlunos.filter(
      (nota) => mesmoLancamento(nota, lancamentoAtual),
    );
  }, [lancamentoAtual, notasAlunos]);

  useEffect(() => {
    if (!lancamentoAtual) return;
    const idsExistentes = new Set(notasDaTurma.map((nota) => nota.alunoId));
    const novasNotas: NotaAluno[] = alunosTurmaAtual
      .filter((aluno) => !idsExistentes.has(aluno.id))
      .map((aluno) => ({
      id: createId('nota-aluno'),
      alunoId: aluno.id,
      alunoNome: aluno.nome,
      turma: lancamentoAtual.turma,
      disciplina: lancamentoAtual.disciplina,
      bimestre: lancamentoAtual.bimestre,
      trabalhosNota: null,
      provasNota: null,
      nota: null,
    }));
    if (novasNotas.length === 0) return;
    const updated = [...notasAlunos, ...novasNotas];
    setNotasAlunos(updated);
    if (!isNotasRelacionalEnabled()) {
      saveToStorage(notasAlunosStorageKey, updated);
    }
    if (isNotasRelacionalEnabled()) {
      void Promise.allSettled(
        novasNotas.map((notaNova) => {
          const alunoIdNum = Number(notaNova.alunoId);
          return patchNotaRelacional({
            alunoId: Number.isFinite(alunoIdNum) ? alunoIdNum : undefined,
            alunoNome: notaNova.alunoNome,
            turmaNome: notaNova.turma,
            disciplinaNome: notaNova.disciplina,
            bimestre: notaNova.bimestre,
            trabalhosNota: notaNova.trabalhosNota ?? null,
            provasNota: notaNova.provasNota ?? null,
            nota: notaNova.nota ?? null,
          });
        }),
      );
    }
  }, [alunosTurmaAtual, lancamentoAtual, notasDaTurma, notasAlunos]);

  const notasExibidas = useMemo(() => {
    const idsAlunosAtuais = new Set(alunosTurmaAtual.map((aluno) => aluno.id));
    if (idsAlunosAtuais.size === 0) return [];
    return notasDaTurma.filter((nota) => idsAlunosAtuais.has(nota.alunoId));
  }, [alunosTurmaAtual, notasDaTurma]);

  const notasOrdenadas = useMemo(() => {
    return [...notasExibidas].sort((a, b) =>
      a.alunoNome.localeCompare(b.alunoNome, 'pt-BR', { sensitivity: 'base' }),
    );
  }, [notasExibidas]);

  const alunosDaTurma = useMemo(() => {
    return [...notasOrdenadas].map((nota) => ({
      alunoId: nota.alunoId,
      alunoNome: nota.alunoNome,
    }));
  }, [notasOrdenadas]);

  const calcularMediaFinal = (alunoId: string, turma: string, disciplina: string, bimestre: string) => {
    const provasAluno = respostasProvas.filter(
      (resposta) =>
        String(resposta.alunoId) === String(alunoId) &&
        normalizeText(resposta.turma) === normalizeText(turma) &&
        normalizeText(resposta.disciplina) === normalizeText(disciplina) &&
        resposta.status === 'Corrigido' &&
        typeof resposta.notaFinal === 'number' &&
        bimestreCompativel(resposta.periodo, bimestre),
    );
    const trabalhosAluno = entregasAtividades.filter(
      (entrega) => {
        if (String(entrega.alunoId) !== String(alunoId)) return false;
        if (typeof entrega.nota !== 'number') return false;
        const atividadeMeta = atividadeMetaPorId.get(String(entrega.atividadeId));
        const disciplinaEntrega = entrega.disciplina || atividadeMeta?.disciplina || '';
        const turmaEntrega = entrega.turma || atividadeMeta?.turma || '';
        // Atividade pode ter período textual livre ("Periodo"), então não bloqueamos por bimestre.
        if (normalizeText(disciplinaEntrega) !== normalizeText(disciplina)) return false;
        if (turmaEntrega && getTurmaKey(turmaEntrega) !== getTurmaKey(turma)) return false;
        return true;
      },
    );

    const mediaProvas =
      provasAluno.length > 0
        ? Math.round(
            (provasAluno.reduce((acc, item) => acc + (item.notaFinal ?? 0), 0) /
              provasAluno.length) *
              10,
          ) / 10
        : null;

    const mediaTrabalhos =
      trabalhosAluno.length > 0
        ? Math.round(
            (trabalhosAluno.reduce((acc, item) => acc + (item.nota ?? 0), 0) /
              trabalhosAluno.length) *
              10,
          ) / 10
        : null;

    const componentes = [mediaProvas, mediaTrabalhos].filter(
      (valor): valor is number => typeof valor === 'number',
    );
    const mediaFinal =
      componentes.length > 0
        ? Math.round((componentes.reduce((acc, item) => acc + item, 0) / componentes.length) * 10) /
          10
        : null;

    return { mediaProvas, mediaTrabalhos, mediaFinal };
  };

  const notasPorAluno = useMemo(() => {
    if (!lancamentoAtual) return [];
    return alunosDaTurma.map((aluno) => {
      const { mediaProvas, mediaTrabalhos, mediaFinal } = calcularMediaFinal(
        aluno.alunoId,
        lancamentoAtual.turma,
        lancamentoAtual.disciplina,
        lancamentoAtual.bimestre,
      );
      const notaAtualBimestre =
        notasAlunos.find(
          (nota) =>
            nota.alunoId === aluno.alunoId &&
            mesmoLancamento(nota, lancamentoAtual),
        ) ?? null;
      const trabalhosExibicao =
        typeof notaAtualBimestre?.trabalhosNota === 'number'
          ? notaAtualBimestre.trabalhosNota
          : mediaTrabalhos;
      const provasExibicao =
        typeof notaAtualBimestre?.provasNota === 'number'
          ? notaAtualBimestre.provasNota
          : mediaProvas;
      const notaExibicao =
        typeof mediaFinal === 'number'
          ? mediaFinal
          : typeof notaAtualBimestre?.nota === 'number'
            ? notaAtualBimestre.nota
            : null;

      return {
        ...aluno,
        mediaProvas,
        mediaTrabalhos,
        mediaFinal,
        trabalhosExibicao,
        provasExibicao,
        notaExibicao,
        /** Média do bimestre atual (mesma lógica da coluna Nota). */
        totalBimestres: typeof notaExibicao === 'number' ? notaExibicao : null,
      };
    });
  }, [alunosDaTurma, atividadeMetaPorId, entregasAtividades, lancamentoAtual, notasAlunos, respostasProvas]);

  useEffect(() => {
    if (!isNotasRelacionalEnabled() || !lancamentoAtual) return;
    const pendencias = notasPorAluno.filter((linha) => {
      const atual = notasAlunos.find(
        (n) => n.alunoId === linha.alunoId && mesmoLancamento(n, lancamentoAtual),
      );
      if (!atual) return false;
      return (
        !notasIguais(atual.trabalhosNota ?? null, asNota(linha.trabalhosExibicao)) ||
        !notasIguais(atual.provasNota ?? null, asNota(linha.provasExibicao)) ||
        !notasIguais(atual.nota ?? null, asNota(linha.notaExibicao))
      );
    });
    if (pendencias.length === 0) return;
    void Promise.allSettled(
      pendencias.map((linha) => {
        const alunoIdNum = Number(linha.alunoId);
        return patchNotaRelacional({
          alunoId: Number.isFinite(alunoIdNum) ? alunoIdNum : undefined,
          alunoNome: linha.alunoNome,
          turmaNome: lancamentoAtual.turma,
          disciplinaNome: lancamentoAtual.disciplina,
          bimestre: lancamentoAtual.bimestre,
          trabalhosNota: asNota(linha.trabalhosExibicao),
          provasNota: asNota(linha.provasExibicao),
          nota: asNota(linha.notaExibicao),
        });
      }),
    ).then(() => {
      setNotasAlunos((prev) =>
        prev.map((n) => {
          if (n.alunoId === '' || !mesmoLancamento(n, lancamentoAtual)) return n;
          const linha = pendencias.find((p) => p.alunoId === n.alunoId);
          if (!linha) return n;
          return {
            ...n,
            trabalhosNota: asNota(linha.trabalhosExibicao),
            provasNota: asNota(linha.provasExibicao),
            nota: asNota(linha.notaExibicao),
          };
        }),
      );
    });
  }, [lancamentoAtual, notasAlunos, notasPorAluno]);

  const handleNotaChange = (alunoId: string, field: 'trabalhosNota' | 'provasNota' | 'nota', rawValue: string) => {
    if (!lancamentoAtual) return;
    const normalizedValue =
      rawValue.trim() === ''
        ? null
        : Math.max(0, Math.min(10, Number(rawValue.replace(',', '.'))));
    if (normalizedValue !== null && Number.isNaN(normalizedValue)) return;

    const updated = notasAlunos.map((nota) => {
      const isTarget =
        nota.alunoId === alunoId &&
        mesmoLancamento(nota, lancamentoAtual);
      return isTarget ? { ...nota, [field]: normalizedValue } : nota;
    });
    setNotasAlunos(updated);
    if (!isNotasRelacionalEnabled()) {
      saveToStorage(notasAlunosStorageKey, updated);
    }

    if (isNotasRelacionalEnabled()) {
      const row = updated.find(
        (nota) =>
          nota.alunoId === alunoId &&
          mesmoLancamento(nota, lancamentoAtual),
      );
      const alunoNome = row?.alunoNome ?? usuarios.find((u) => String(u.id) === String(alunoId))?.nome ?? '';
      const alunoIdNum = Number(alunoId);
      void patchNotaRelacional({
        alunoId: Number.isFinite(alunoIdNum) ? alunoIdNum : undefined,
        alunoNome,
        turmaNome: lancamentoAtual.turma,
        disciplinaNome: lancamentoAtual.disciplina,
        bimestre: lancamentoAtual.bimestre,
        trabalhosNota: field === 'trabalhosNota' ? normalizedValue : row?.trabalhosNota ?? null,
        provasNota: field === 'provasNota' ? normalizedValue : row?.provasNota ?? null,
        nota: field === 'nota' ? normalizedValue : row?.nota ?? null,
      }).catch(() => {
        window.alert('Não foi possível salvar a nota. Verifique a API e tente novamente.');
      });
    }
  };

  if (!lancamentoAtual) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <h1 className="font-display text-3xl font-bold text-foreground">
            Notas nao encontradas
          </h1>
          <Link to="/notas" state={{ listFilters: listFiltersRetorno }}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-row items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl font-bold text-foreground">
              Notas da turma
            </h1>
            <p className="text-muted-foreground">
              {lancamentoAtual.turma} - {lancamentoAtual.disciplina} - {lancamentoAtual.bimestre}
            </p>
          </div>
          <Link to="/notas" state={{ listFilters: listFiltersRetorno }} className="shrink-0">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Alunos e notas</CardTitle>
            <CardDescription>
              Visualize as notas registradas para esta turma.
              {carregandoNotasRel ? ' Sincronizando banco...' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {notasOrdenadas.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nenhum aluno encontrado para esta turma.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">No</TableHead>
                    <TableHead>Aluno</TableHead>
                    <TableHead className="text-right">Trabalhos</TableHead>
                    <TableHead className="text-right">Provas</TableHead>
                    <TableHead className="text-right">Nota</TableHead>
                    <TableHead className="text-right">Final</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notasPorAluno.map((nota, index) => (
                    <TableRow key={`${nota.alunoId}-${index}`}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">{nota.alunoNome}</TableCell>
                      <TableCell className="text-right">
                        {podeEditarNotas ? (
                          <Input
                            className="ml-auto h-8 w-24 text-right"
                            value={typeof nota.trabalhosExibicao === 'number' ? nota.trabalhosExibicao.toFixed(1) : ''}
                            onChange={(event) => handleNotaChange(nota.alunoId, 'trabalhosNota', event.target.value)}
                            placeholder="-"
                          />
                        ) : typeof nota.trabalhosExibicao === 'number' ? (
                          nota.trabalhosExibicao.toFixed(1)
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {podeEditarNotas ? (
                          <Input
                            className="ml-auto h-8 w-24 text-right"
                            value={typeof nota.provasExibicao === 'number' ? nota.provasExibicao.toFixed(1) : ''}
                            onChange={(event) => handleNotaChange(nota.alunoId, 'provasNota', event.target.value)}
                            placeholder="-"
                          />
                        ) : typeof nota.provasExibicao === 'number' ? (
                          nota.provasExibicao.toFixed(1)
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {podeEditarNotas ? (
                          <Input
                            className="ml-auto h-8 w-24 text-right"
                            value={typeof nota.notaExibicao === 'number' ? nota.notaExibicao.toFixed(1) : ''}
                            onChange={(event) => handleNotaChange(nota.alunoId, 'nota', event.target.value)}
                            placeholder="-"
                          />
                        ) : typeof nota.notaExibicao === 'number' ? (
                          nota.notaExibicao.toFixed(1)
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {typeof nota.totalBimestres === 'number' ? nota.totalBimestres.toFixed(1) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default NotaTurma;
