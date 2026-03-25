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
  patchNotaRelacional,
} from '@/lib/notasRelApi';

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
  nota?: number | null;
}

const lancamentosStorageKey = 'school-compass:notas';
const notasAlunosStorageKey = 'school-compass:notas-alunos';
const provasRespostasStorageKey = 'school-compass:provas-respostas';
const provasStorageKey = 'school-compass:provas';
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

const NotaTurma: React.FC = () => {
  const { user } = useAuth();
  const podeEditarNotas = user?.perfil !== UserProfile.SECRETARIA;
  const { id } = useParams();
  const location = useLocation();
  const lancamentos = useMemo(
    () => loadFromStorage<Lancamento[]>(lancamentosStorageKey, []),
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

  const lancamentoAtual = lancamento ?? lancamentoFromState;

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
    () => loadFromStorage<NotaAluno[]>(notasAlunosStorageKey, []),
  );
  const [storageTick, setStorageTick] = useState(0);
  const [respostasProvasRel, setRespostasProvasRel] = useState<ProvaResposta[]>([]);
  const [carregandoNotasRel, setCarregandoNotasRel] = useState(false);

  useEffect(() => {
    const keys = [
      notasAlunosStorageKey,
      provasRespostasStorageKey,
      provasStorageKey,
      atividadesEntregasStorageKey,
      usersStorageKey,
      vinculosStorageKey,
      turmasStorageKey,
    ];
    void syncKeysFromBackend(keys).finally(() => {
      setNotasAlunos(loadFromStorage<NotaAluno[]>(notasAlunosStorageKey, []));
      setStorageTick((t) => t + 1);
    });
  }, []);

  useEffect(() => {
    if (!isProvasRelacionalEnabled() || !user?.id) {
      setRespostasProvasRel([]);
      return;
    }
    void Promise.all([
      listRespostasRelacionalParaProfessor(user.id),
      listProvasRelacionalParaProfessor(user.id),
    ])
      .then(([respostas, provas]) => {
        const periodoPorProva = new Map<string, string>();
        provas.forEach((p) => {
          if (p.id != null) periodoPorProva.set(String(p.id), p.periodo ?? '');
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
              turma: r.turma ?? '',
              disciplina: r.disciplina ?? '',
              status: corrigido ? 'Corrigido' : 'Enviado',
              notaFinal: r.notaFinal ?? null,
              periodo: periodoPorProva.get(String(r.provaId)) ?? '',
            };
          }),
        );
      })
      .catch(() => setRespostasProvasRel([]));
  }, [user?.id]);

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
          saveToStorage(notasAlunosStorageKey, merged);
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
  const periodoPorProvaIdLocal = useMemo(
    () => new Map(provasCatalogo.map((p) => [p.id, p.periodo ?? ''])),
    [provasCatalogo],
  );

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

  const entregasAtividades = useMemo(
    () => loadFromStorage<AtividadeEntrega[]>(atividadesEntregasStorageKey, []),
    [storageTick],
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

    const unicos = new Map<string, AlunoTurma>();
    [...alunosPorCadastro, ...alunosPorVinculo].forEach((aluno) => {
      if (!unicos.has(aluno.id)) {
        unicos.set(aluno.id, aluno);
      }
    });

    return Array.from(unicos.values()).sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }),
    );
  }, [lancamentoAtual, turmas, usuarios, vinculos]);

  const notasDaTurma = useMemo(() => {
    if (!lancamentoAtual) return [];
    return notasAlunos.filter(
      (nota) =>
        nota.turma === lancamentoAtual.turma &&
        nota.disciplina === lancamentoAtual.disciplina &&
        nota.bimestre === lancamentoAtual.bimestre,
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
    saveToStorage(notasAlunosStorageKey, updated);
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
      (entrega) =>
        String(entrega.alunoId) === String(alunoId) &&
        normalizeText(entrega.disciplina) === normalizeText(disciplina) &&
        typeof entrega.nota === 'number',
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
            nota.turma === lancamentoAtual.turma &&
            nota.disciplina === lancamentoAtual.disciplina &&
            nota.bimestre === lancamentoAtual.bimestre,
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
        typeof notaAtualBimestre?.nota === 'number' ? notaAtualBimestre.nota : mediaFinal;

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
  }, [alunosDaTurma, entregasAtividades, lancamentoAtual, notasAlunos, respostasProvas]);

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
        nota.turma === lancamentoAtual.turma &&
        nota.disciplina === lancamentoAtual.disciplina &&
        nota.bimestre === lancamentoAtual.bimestre;
      return isTarget ? { ...nota, [field]: normalizedValue } : nota;
    });
    setNotasAlunos(updated);
    saveToStorage(notasAlunosStorageKey, updated);

    if (isNotasRelacionalEnabled()) {
      const row = updated.find(
        (nota) =>
          nota.alunoId === alunoId &&
          nota.turma === lancamentoAtual.turma &&
          nota.disciplina === lancamentoAtual.disciplina &&
          nota.bimestre === lancamentoAtual.bimestre,
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
        // mantém fallback local quando API indisponível
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
