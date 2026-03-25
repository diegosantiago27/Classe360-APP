import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, ClipboardList, PenLine, Pencil, Search, Trash2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createId, loadFromStorage, saveToStorage, syncKeysFromBackend } from '@/lib/mockStorage';
import { recalcularPendenciasLancamentos } from '@/lib/notasPendenciasLancamento';
import {
  isProvasRelacionalEnabled,
  listProvasRelacionalParaProfessor,
  listRespostasRelacionalParaProfessor,
} from '@/lib/provasRelApi';
import { defaultUsers, StoredUser, usersStorageKey } from '@/lib/mockUsers';
import { CatalogItem, disciplinasStorageKey } from '@/lib/mockAcademics';
import { Turma, turmasStorageKey } from '@/lib/mockTurmas';

type LancamentoStatus = 'Pendente' | 'Concluida';

interface Lancamento {
  id: string;
  turma: string;
  disciplina: string;
  bimestre: string;
  pendentes: number;
  status: LancamentoStatus;
}

interface DisciplinaVinculo {
  disciplinaId: string;
  turmaId: string;
  turmaNome: string;
  professorId: string;
  professorNome: string;
  alunos?: Array<{
    alunoId: string;
    alunoNome: string;
  }>;
}

const storageKey = 'school-compass:notas';
const vinculosStorageKey = 'school-compass:disciplinas-vinculos';
const notasAlunosStorageKey = 'school-compass:notas-alunos';
const provasRespostasStorageKey = 'school-compass:provas-respostas';
const provasStorageKey = 'school-compass:provas';
const atividadesEntregasStorageKey = 'school-compass:atividades-entregas';

interface NotaAlunoStorage {
  alunoId: string;
  turma: string;
  disciplina: string;
  bimestre: string;
  trabalhosNota?: number | null;
  provasNota?: number | null;
  nota: number | null;
}

interface ProvaRespostaStorage {
  provaId: string;
  alunoId: string;
  turma?: string;
  disciplina?: string;
  status: string;
  notaFinal?: number | null;
  periodo?: string;
  corrigidoEm?: string;
}

interface AtividadeEntregaStorage {
  alunoId: string;
  disciplina: string;
  nota?: number | null;
}

interface ProvaCatalogStorage {
  id: string;
  turma?: string;
  disciplina?: string;
  periodo?: string;
}

const normalizeText = (value?: string) =>
  (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

/** Filtros da lista de lançamentos — restaurados ao voltar de Notas da turma. */
export type NotasListFiltersState = {
  turmaSelecionada: string;
  disciplinaSelecionada: string;
  bimestreSelecionado: string;
  busca: string;
  statusSelecionado: 'todos' | 'pendentes' | 'completos';
};

const Notas: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const ehProfessor =
    user?.perfil === UserProfile.PROFESSOR ||
    String((user as { role?: unknown } | null)?.role ?? '').toUpperCase() === 'ROLE_PROFESSOR';
  const somenteConsulta =
    user?.perfil === UserProfile.SECRETARIA || user?.perfil === UserProfile.PROFESSOR;
  const [lancamentos, setLancamentos] = useState<Lancamento[]>(
    () => loadFromStorage<Lancamento[]>(storageKey, []),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<Lancamento, 'id'>>({
    turma: '',
    disciplina: '',
    bimestre: '1º Bimestre',
    pendentes: 0,
    status: 'Pendente',
  });
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState<string>('todas');
  const [bimestreSelecionado, setBimestreSelecionado] = useState<string>('todos');
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>('todas');
  const [busca, setBusca] = useState('');
  const [statusSelecionado, setStatusSelecionado] = useState<'todos' | 'pendentes' | 'completos'>('todos');
  const disciplinasDisponiveis = useMemo(
    () => loadFromStorage<CatalogItem[]>(disciplinasStorageKey, []),
    [],
  );
  const turmasDisponiveis = useMemo(
    () => loadFromStorage<Turma[]>(turmasStorageKey, []),
    [],
  );
  const vinculos = useMemo(
    () => loadFromStorage<DisciplinaVinculo[]>(vinculosStorageKey, []),
    [],
  );
  const professorVinculos = useMemo(() => {
    if (!ehProfessor || !user?.id) return [];
    return vinculos.filter((v) => normalizeText(v.professorId) === normalizeText(user.id));
  }, [ehProfessor, user?.id, vinculos]);
  const turnoPorTurma = useMemo(
    () => new Map(turmasDisponiveis.map((turma) => [turma.nome, turma.turno])),
    [turmasDisponiveis],
  );
  const disciplinaNomePorId = useMemo(
    () => new Map(disciplinasDisponiveis.map((item) => [item.id, item.nome])),
    [disciplinasDisponiveis],
  );
  const resolveDisciplinaNome = (disciplinaIdOuNome: string) => {
    const porId = disciplinaNomePorId.get(disciplinaIdOuNome);
    if (porId) return porId;
    const key = normalizeText(disciplinaIdOuNome);
    const fallback = disciplinasDisponiveis.find(
      (item) => normalizeText(item.id) === key || normalizeText(item.nome) === key,
    );
    return fallback?.nome ?? disciplinaIdOuNome;
  };
  const resolveTurmaNome = (turmaIdOuNome: string, turmaNomeVinculo?: string) => {
    const keyId = normalizeText(turmaIdOuNome);
    const keyNome = normalizeText(turmaNomeVinculo);
    const fallback = turmasDisponiveis.find(
      (t) =>
        normalizeText(t.id) === keyId ||
        normalizeText(t.nome) === keyId ||
        (keyNome ? normalizeText(t.nome) === keyNome : false),
    );
    return fallback?.nome ?? turmaNomeVinculo ?? turmaIdOuNome;
  };
  const lancamentosCompletos = useMemo(() => {
    const existentes = [...lancamentos];
    const existentesKeys = new Set(
      existentes.map(
        (item) =>
          `${normalizeText(item.turma)}::${normalizeText(item.disciplina)}::${normalizeText(item.bimestre)}`,
      ),
    );

    const bimestresVinculo = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];
    vinculos.forEach((vinculo) => {
      const turmaNome = resolveTurmaNome(vinculo.turmaId, vinculo.turmaNome);
      const disciplinaNome = resolveDisciplinaNome(vinculo.disciplinaId);
      const pendentes = Math.max(0, Number(vinculo.alunos?.length ?? 0));
      bimestresVinculo.forEach((bimestrePadrao) => {
        const key = `${normalizeText(turmaNome)}::${normalizeText(disciplinaNome)}::${normalizeText(bimestrePadrao)}`;
        if (existentesKeys.has(key)) return;
        const idEstavel = `auto-${key.replace(/[^a-z0-9]+/g, '-')}`;
        existentes.push({
          id: idEstavel,
          turma: turmaNome,
          disciplina: disciplinaNome,
          bimestre: bimestrePadrao,
          pendentes,
          status: pendentes > 0 ? 'Pendente' : 'Concluida',
        });
        existentesKeys.add(key);
      });
    });

    return existentes;
  }, [lancamentos, vinculos, turmasDisponiveis, disciplinasDisponiveis, disciplinaNomePorId]);

  const [storageTick, setStorageTick] = useState(0);
  const [respostasProvasRel, setRespostasProvasRel] = useState<ProvaRespostaStorage[]>([]);

  useEffect(() => {
    void syncKeysFromBackend([
      notasAlunosStorageKey,
      provasRespostasStorageKey,
      provasStorageKey,
      atividadesEntregasStorageKey,
      usersStorageKey,
      vinculosStorageKey,
      turmasStorageKey,
    ]).finally(() => setStorageTick((t) => t + 1));
  }, []);

  useEffect(() => {
    const lf = (location.state as { listFilters?: NotasListFiltersState } | null)?.listFilters;
    if (!lf) return;
    setTurmaSelecionada(lf.turmaSelecionada);
    setDisciplinaSelecionada(lf.disciplinaSelecionada);
    setBimestreSelecionado(lf.bimestreSelecionado);
    setBusca(lf.busca);
    setStatusSelecionado(lf.statusSelecionado);
    navigate('.', { replace: true, state: {} });
  }, [location.state, navigate]);

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
        const mapped: ProvaRespostaStorage[] = respostas.map((r) => {
          const corrigido =
            r.status === 'Corrigido' ||
            (typeof r.corrigidoEm === 'string' && r.corrigidoEm.length > 0) ||
            (Array.isArray(r.corrigidoEm) && r.corrigidoEm.length > 0);
          return {
            provaId: String(r.provaId),
            alunoId: String(r.alunoId),
            turma: r.turma ?? '',
            disciplina: r.disciplina ?? '',
            status: corrigido ? 'Corrigido' : ((r.status as string) ?? 'Enviado'),
            notaFinal: r.notaFinal ?? null,
            periodo: periodoPorProva.get(String(r.provaId)) ?? '',
            corrigidoEm:
              typeof r.corrigidoEm === 'string'
                ? r.corrigidoEm
                : Array.isArray(r.corrigidoEm)
                  ? new Date(
                      (r.corrigidoEm as number[])[0],
                      ((r.corrigidoEm as number[])[1] ?? 1) - 1,
                      (r.corrigidoEm as number[])[2] ?? 1,
                    ).toISOString()
                  : undefined,
          };
        });
        setRespostasProvasRel(mapped);
      })
      .catch(() => setRespostasProvasRel([]));
  }, [user?.id]);

  const respostasProvasMescladas = useMemo(() => {
    const local = loadFromStorage<ProvaRespostaStorage[]>(provasRespostasStorageKey, []);
    const byKey = new Map<string, ProvaRespostaStorage>();
    const keyOf = (r: { provaId: string; alunoId: string }) => `${r.provaId}-${r.alunoId}`;
    local.forEach((r) => byKey.set(keyOf(r), r));
    respostasProvasRel.forEach((r) => byKey.set(keyOf(r), r));
    return Array.from(byKey.values());
  }, [storageTick, respostasProvasRel]);

  const lancamentosComMetricas = useMemo(() => {
    const notasAlunos = loadFromStorage<NotaAlunoStorage[]>(notasAlunosStorageKey, []);
    const provasCatalogo = loadFromStorage<ProvaCatalogStorage[]>(provasStorageKey, []);
    const entregasAtividades = loadFromStorage<AtividadeEntregaStorage[]>(atividadesEntregasStorageKey, []);
    const usuarios = loadFromStorage<StoredUser[]>(usersStorageKey, defaultUsers);

    return recalcularPendenciasLancamentos(lancamentosCompletos, {
      vinculos,
      usuarios,
      notasAlunos,
      respostasProvas: respostasProvasMescladas,
      entregasAtividades,
      provasCatalogo,
      resolveTurmaNome,
      resolveDisciplinaNome,
    });
  }, [lancamentosCompletos, vinculos, storageTick, respostasProvasMescladas]);

  const paresVinculadosProfessor = useMemo(() => {
    return new Set(
      professorVinculos.map((v) => {
        const disciplinaNome = resolveDisciplinaNome(v.disciplinaId);
        const turmaNome = resolveTurmaNome(v.turmaId, v.turmaNome);
        return `${normalizeText(turmaNome)}::${normalizeText(disciplinaNome)}`;
      }),
    );
  }, [professorVinculos, disciplinaNomePorId, turmasDisponiveis, disciplinasDisponiveis]);
  const paresVinculadosGerais = useMemo(() => {
    return new Set(
      vinculos.map((v) => {
        const disciplinaNome = resolveDisciplinaNome(v.disciplinaId);
        const turmaNome = resolveTurmaNome(v.turmaId, v.turmaNome);
        return `${normalizeText(turmaNome)}::${normalizeText(disciplinaNome)}`;
      }),
    );
  }, [vinculos, disciplinaNomePorId, turmasDisponiveis, disciplinasDisponiveis]);
  const lancamentosVisiveis = useMemo(() => {
    if (ehProfessor) {
      return lancamentosComMetricas.filter((item) =>
        paresVinculadosProfessor.has(`${normalizeText(item.turma)}::${normalizeText(item.disciplina)}`),
      );
    }
    // Para perfis administrativos/consulta, quando há vínculos cadastrados
    // mostramos apenas lançamentos coerentes com os vínculos reais.
    if (paresVinculadosGerais.size > 0) {
      return lancamentosComMetricas.filter((item) =>
        paresVinculadosGerais.has(`${normalizeText(item.turma)}::${normalizeText(item.disciplina)}`),
      );
    }
    return lancamentosComMetricas;
  }, [ehProfessor, lancamentosComMetricas, paresVinculadosProfessor, paresVinculadosGerais]);
  const disciplinaOptions = useMemo(
    () => {
      if (!ehProfessor) return disciplinasDisponiveis.map((item) => item.nome);
      const nomes = professorVinculos
        .map((v) => resolveDisciplinaNome(v.disciplinaId))
        .filter(Boolean);
      return Array.from(new Set(nomes)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    },
    [ehProfessor, disciplinasDisponiveis, professorVinculos, disciplinaNomePorId, turmasDisponiveis],
  );
  const turmaOptions = useMemo(() => {
    if (!ehProfessor) {
      return turmasDisponiveis
        .map((item) => item.nome)
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }
    const nomes = professorVinculos
      .map((v) => resolveTurmaNome(v.turmaId, v.turmaNome))
      .filter(Boolean);
    return Array.from(new Set(nomes)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [ehProfessor, professorVinculos, turmasDisponiveis]);
  const bimestreOptions = useMemo(
    () => ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'],
    [],
  );

  const lancamentosFiltrados = useMemo(() => {
    return lancamentosVisiveis.filter((item) => {
      const matchDisciplina =
        disciplinaSelecionada === 'todas' ||
        normalizeText(item.disciplina) === normalizeText(disciplinaSelecionada);
      const matchBimestre =
        bimestreSelecionado === 'todos' ||
        normalizeText(item.bimestre) === normalizeText(bimestreSelecionado);
      const matchTurma =
        turmaSelecionada === 'todas' ||
        normalizeText(item.turma) === normalizeText(turmaSelecionada);
      return matchDisciplina && matchBimestre && matchTurma;
    });
  }, [lancamentosVisiveis, disciplinaSelecionada, bimestreSelecionado, turmaSelecionada]);

  const totalTodos = lancamentosFiltrados.length;
  const totalPendentes = useMemo(
    () => lancamentosFiltrados.filter((item) => item.status === 'Pendente').length,
    [lancamentosFiltrados],
  );
  const totalCompletos = useMemo(
    () => lancamentosFiltrados.filter((item) => item.status === 'Concluida').length,
    [lancamentosFiltrados],
  );

  const lancamentosLista = useMemo(() => {
    return lancamentosFiltrados.filter((item) => {
      if (statusSelecionado === 'pendentes' && item.status !== 'Pendente') return false;
      if (statusSelecionado === 'completos' && item.status !== 'Concluida') return false;
      if (!busca.trim()) return true;
      const texto = normalizeText(`${item.turma} ${item.disciplina} ${item.bimestre}`);
      return texto.includes(normalizeText(busca));
    });
  }, [lancamentosFiltrados, statusSelecionado, busca]);

  const listFiltersAtuais = useMemo(
    (): NotasListFiltersState => ({
      turmaSelecionada,
      disciplinaSelecionada,
      bimestreSelecionado,
      busca,
      statusSelecionado,
    }),
    [turmaSelecionada, disciplinaSelecionada, bimestreSelecionado, busca, statusSelecionado],
  );

  const pendentes = totalPendentes;
  const concluidas = totalCompletos;

  const mediaGeral = useMemo(() => {
    if (lancamentosFiltrados.length === 0) return 0;
    const base = lancamentosFiltrados.reduce(
      (acc, item) => acc + (item.status === 'Concluida' ? 8 : 6.5),
      0,
    );
    return Math.round((base / lancamentosFiltrados.length) * 10) / 10;
  }, [lancamentosFiltrados]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setDraft({
      turma: '',
      disciplina: '',
      bimestre: '1º Bimestre',
      pendentes: 0,
      status: 'Pendente',
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: Lancamento) => {
    setEditingId(item.id);
    setDraft({
      turma: item.turma,
      disciplina: item.disciplina,
      bimestre: item.bimestre,
      pendentes: item.pendentes,
      status: item.status,
    });
    setDialogOpen(true);
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = {
      ...draft,
      pendentes: Math.max(0, draft.pendentes),
    };

    if (editingId) {
      const updated = lancamentos.map((item) =>
        item.id === editingId ? { ...item, ...normalized } : item,
      );
      setLancamentos(updated);
      saveToStorage(storageKey, updated);
    } else {
      const newLancamentos = [
        ...lancamentos,
        { id: createId('nota'), ...normalized },
      ];
      setLancamentos(newLancamentos);
      saveToStorage(storageKey, newLancamentos);
    }

    setDialogOpen(false);
  };

  const handleDelete = (item: Lancamento) => {
    const confirmed = window.confirm(
      `Deseja remover o lancamento de ${item.disciplina} (${item.turma})?`,
    );
    if (!confirmed) return;
    const updated = lancamentos.filter((row) => row.id !== item.id);
    setLancamentos(updated);
    saveToStorage(storageKey, updated);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Notas
            </h1>
            <p className="text-muted-foreground">
              Controle os lancamentos por turma e acompanhe pendencias.
            </p>
          </div>
          {!somenteConsulta && (
          <Button variant="gradient" onClick={handleOpenCreate}>
            <PenLine className="w-4 h-4" />
            Novo lancamento
          </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Lancamentos pendentes
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">
                  {pendentes}
                </div>
              </div>
              <ClipboardList className="w-5 h-5 text-warning" />
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Concluidos
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">
                  {concluidas}
                </div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-success" />
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Media geral
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">{mediaGeral}</div>
              </div>
              <ClipboardList className="w-5 h-5 text-primary" />
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lancamentos por turma</CardTitle>
            <CardDescription>
              Visualize o status de cada bimestre e complete pendencias.
            </CardDescription>
            <div className="flex flex-col gap-3 pt-3 md:flex-row md:items-center">
              <div className="relative w-full md:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar aluno ou disciplina"
                  className="pl-9"
                />
              </div>
              <div className="inline-flex rounded-md border border-border bg-muted/20 p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={statusSelecionado === 'todos' ? 'default' : 'ghost'}
                  onClick={() => setStatusSelecionado('todos')}
                >
                  Todos {totalTodos}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={statusSelecionado === 'pendentes' ? 'default' : 'ghost'}
                  onClick={() => setStatusSelecionado('pendentes')}
                >
                  Pendentes {totalPendentes}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={statusSelecionado === 'completos' ? 'default' : 'ghost'}
                  onClick={() => setStatusSelecionado('completos')}
                >
                  Completos {totalCompletos}
                </Button>
              </div>
              <Select value={turmaSelecionada} onValueChange={setTurmaSelecionada}>
                <SelectTrigger className="w-full md:w-[170px]">
                  <SelectValue placeholder="Todas turmas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas turmas</SelectItem>
                  {turmaOptions.map((turma) => (
                    <SelectItem key={turma} value={turma}>
                      {turma}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={disciplinaSelecionada} onValueChange={setDisciplinaSelecionada}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Todas disciplinas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas disciplinas</SelectItem>
                  {disciplinaOptions.map((disciplina) => (
                    <SelectItem key={disciplina} value={disciplina}>
                      {disciplina}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={bimestreSelecionado} onValueChange={setBimestreSelecionado}>
                <SelectTrigger className="w-full md:w-[170px]">
                  <SelectValue placeholder="Todos bimestres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos bimestres</SelectItem>
                  {bimestreOptions.map((bimestre) => (
                    <SelectItem key={bimestre} value={bimestre}>
                      {bimestre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {lancamentosLista.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nenhum lancamento encontrado para esta disciplina.
              </div>
            ) : (
              <div className="divide-y divide-border/60 rounded-lg border border-border/60">
                {lancamentosLista.map((item) => {
                  const mediaItem = item.status === 'Concluida'
                    ? Math.max(5, 9 - item.pendentes * 0.5)
                    : null;
                  const iniciais = item.turma
                    .replace('º', '')
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')
                    .toUpperCase();
                  return (
                    <div key={item.id} className="flex items-center gap-4 px-4 py-3">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                        {iniciais || 'NT'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/notas/${item.id}`}
                          state={{
                            lancamento: { id: item.id, turma: item.turma, disciplina: item.disciplina, bimestre: item.bimestre },
                            listFilters: listFiltersAtuais,
                          }}
                          className="truncate text-sm font-medium text-primary hover:underline"
                        >
                          {item.turma}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.disciplina} • {item.bimestre}
                        </p>
                      </div>
                      <div className="hidden min-w-[60px] text-xs text-muted-foreground md:block">
                        {item.pendentes} pend.
                      </div>
                      <Badge variant={item.status === 'Pendente' ? 'destructive' : 'secondary'}>
                        {item.status === 'Pendente' ? 'PENDENTE' : 'COMPLETO'}
                      </Badge>
                      <div className="w-12 text-right text-sm font-semibold text-foreground">
                        {mediaItem === null ? '—' : mediaItem.toFixed(1)}
                      </div>
                      {!somenteConsulta && (
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenEdit(item)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(item)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      {somenteConsulta && (
                        <Link
                          to={`/notas/${item.id}`}
                          state={{
                            lancamento: { id: item.id, turma: item.turma, disciplina: item.disciplina, bimestre: item.bimestre },
                            listFilters: listFiltersAtuais,
                          }}
                        >
                          <Button variant="outline" size="sm">Ver</Button>
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar lancamento' : 'Novo lancamento'}
            </DialogTitle>
            <DialogDescription>
              Defina turma, disciplina e status do lancamento.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="turma">Turma</Label>
              <Input
                id="turma"
                value={draft.turma}
                onChange={(event) => setDraft((prev) => ({ ...prev, turma: event.target.value }))}
                placeholder="Ex: 9º Ano A"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="disciplina">Disciplina</Label>
              <Input
                id="disciplina"
                value={draft.disciplina}
                onChange={(event) => setDraft((prev) => ({ ...prev, disciplina: event.target.value }))}
                placeholder="Ex: Matematica"
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bimestre">Bimestre</Label>
                <Select
                  value={draft.bimestre}
                  onValueChange={(value) => setDraft((prev) => ({ ...prev, bimestre: value }))}
                >
                  <SelectTrigger id="bimestre">
                    <SelectValue placeholder="Selecione o bimestre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1º Bimestre">1º Bimestre</SelectItem>
                    <SelectItem value="2º Bimestre">2º Bimestre</SelectItem>
                    <SelectItem value="3º Bimestre">3º Bimestre</SelectItem>
                    <SelectItem value="4º Bimestre">4º Bimestre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={draft.status}
                  onValueChange={(value) => setDraft((prev) => ({ ...prev, status: value as LancamentoStatus }))}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Concluida">Concluida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pendentes">Pendencias</Label>
              <Input
                id="pendentes"
                type="number"
                min={0}
                value={draft.pendentes}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    pendentes: Number(event.target.value),
                  }))
                }
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="gradient">
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Notas;
