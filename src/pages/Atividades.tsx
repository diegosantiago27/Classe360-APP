import React, { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, ClipboardList, MapPin, Pencil, Trash2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createId, loadFromStorage, saveToStorage } from '@/lib/mockStorage';
import {
  CatalogItem,
  defaultDisciplinas,
  defaultPeriodos,
  disciplinasStorageKey,
  periodosStorageKey,
} from '@/lib/mockAcademics';
import { defaultTurmas, turmasStorageKey } from '@/lib/mockTurmas';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/auth';
import { Link, useSearchParams } from 'react-router-dom';

type AtividadeStatus = 'Pendente' | 'Entregue';
type QuestionType = 'multipla' | 'aberta';

interface AtividadeQuestion {
  id: string;
  enunciado: string;
  tipo: QuestionType;
  pontos: number;
  opcoes: string[];
  corretaIndex: number | null;
}

interface Atividade {
  id: string;
  professorId?: string;
  professorNome?: string;
  titulo: string;
  turma: string;
  disciplina: string;
  periodo: string;
  sala: string;
  data: string;
  horario: string;
  instrucoes: string;
  descricao: string;
  entrega?: string;
  questoes?: AtividadeQuestion[];
  status: AtividadeStatus;
}

const storageKey = 'school-compass:atividades';
const entregasStorageKey = 'school-compass:atividades-entregas';

interface AtividadeEntrega {
  id: string;
  atividadeId: string;
  alunoId: string;
  alunoNome: string;
  disciplina: string;
  resposta: string;
  linkAnexo?: string;
  enviadoEm: string;
  nota?: number | null;
}

const defaultAtividades: Atividade[] = [
  {
    id: 'ATV-001',
    titulo: 'Lista de exercicios - Funcoes',
    turma: '9º Ano A',
    disciplina: 'Matematica',
    periodo: '1º Bimestre',
    sala: 'Sala 12',
    data: '2026-01-23',
    horario: '08:00',
    instrucoes: 'Resolver com calculadora simples.',
    descricao: 'Resolva os exercicios 1 a 10 do capitulo de funcoes.',
    questoes: [
      {
        id: 'ATV-001-Q1',
        enunciado: 'Explique o conceito de funcao afim.',
        tipo: 'aberta',
        pontos: 2,
        opcoes: [],
        corretaIndex: null,
      },
    ],
    status: 'Pendente',
  },
  {
    id: 'ATV-002',
    titulo: 'Resumo sobre a Revolucao Industrial',
    turma: '9º Ano A',
    disciplina: 'Historia',
    periodo: '2º Bimestre',
    sala: 'Sala 03',
    data: '2026-01-24',
    horario: '09:30',
    instrucoes: 'Entrega via texto no sistema.',
    descricao: 'Elabore um resumo de 15 linhas sobre a Revolucao Industrial.',
    questoes: [
      {
        id: 'ATV-002-Q1',
        enunciado: 'Quais foram as principais mudancas sociais do periodo?',
        tipo: 'aberta',
        pontos: 3,
        opcoes: [],
        corretaIndex: null,
      },
    ],
    status: 'Entregue',
  },
  {
    id: 'ATV-003',
    titulo: 'Relatorio de experimento',
    turma: '8º Ano A',
    disciplina: 'Fisica',
    periodo: '3º Bimestre',
    sala: 'Lab. Fisica',
    data: '2026-01-26',
    horario: '13:40',
    instrucoes: 'Enviar fotos do experimento no link.',
    descricao: 'Descreva o experimento realizado em sala e apresente conclusoes.',
    questoes: [
      {
        id: 'ATV-003-Q1',
        enunciado: 'Qual foi o objetivo do experimento?',
        tipo: 'multipla',
        pontos: 2,
        opcoes: ['Medir velocidade', 'Avaliar massa', 'Estudar forca', 'Medir temperatura'],
        corretaIndex: 0,
      },
    ],
    status: 'Pendente',
  },
];

const Atividades: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const disciplinaInicial = searchParams.get('disciplina') ?? 'todas';
  const isAluno = user?.perfil === UserProfile.ALUNO;
  const isProfessor =
    user?.perfil === UserProfile.PROFESSOR ||
    String((user as { role?: unknown } | null)?.role ?? '')
      .trim()
      .toUpperCase() === 'ROLE_PROFESSOR';
  const [atividades, setAtividades] = useState<Atividade[]>(
    () => loadFromStorage<Atividade[]>(storageKey, defaultAtividades),
  );
  const [entregas, setEntregas] = useState<AtividadeEntrega[]>(
    () => loadFromStorage<AtividadeEntrega[]>(entregasStorageKey, []),
  );
  const [correcaoOpen, setCorrecaoOpen] = useState(false);
  const [entregaSelecionada, setEntregaSelecionada] = useState<AtividadeEntrega | null>(null);
  const [notaDraft, setNotaDraft] = useState<number>(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<Atividade, 'id'>>({
    titulo: '',
    turma: '',
    disciplina: '',
    periodo: '',
    sala: '',
    data: '',
    horario: '',
    instrucoes: '',
    descricao: '',
    questoes: [
      {
        id: createId('questao'),
        enunciado: '',
        tipo: 'multipla',
        pontos: 1,
        opcoes: ['', '', '', '', ''],
        corretaIndex: null,
      },
    ],
    status: 'Pendente',
  });
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState(disciplinaInicial);
  const disciplinasDisponiveis = useMemo(
    () => loadFromStorage<CatalogItem[]>(disciplinasStorageKey, defaultDisciplinas),
    [],
  );
  const periodosDisponiveis = useMemo(
    () => loadFromStorage<CatalogItem[]>(periodosStorageKey, defaultPeriodos),
    [],
  );
  const turmasDisponiveis = useMemo(
    () => loadFromStorage<{ nome: string }[]>(turmasStorageKey, defaultTurmas),
    [],
  );
  const disciplinaOptions = useMemo(
    () => disciplinasDisponiveis.map((item) => item.nome),
    [disciplinasDisponiveis],
  );
  const periodoOptions = useMemo(
    () => periodosDisponiveis.map((item) => item.nome),
    [periodosDisponiveis],
  );
  const turmaOptions = useMemo(
    () => turmasDisponiveis.map((item) => item.nome),
    [turmasDisponiveis],
  );
  const hasTurmas = turmaOptions.length > 0;
  const hasDisciplinas = disciplinaOptions.length > 0;
  const hasPeriodos = periodoOptions.length > 0;

  const atividadesVisiveis = useMemo(() => {
    if (!isProfessor || !user?.id) return atividades;
    return atividades.filter((item) => item.professorId === user.id);
  }, [atividades, isProfessor, user?.id]);

  const atividadesFiltradas = useMemo(() => {
    if (disciplinaSelecionada === 'todas') return atividadesVisiveis;
    return atividadesVisiveis.filter((item) => item.disciplina === disciplinaSelecionada);
  }, [atividadesVisiveis, disciplinaSelecionada]);

  const getEntrega = (atividadeId: string) =>
    entregas.find((item) => item.atividadeId === atividadeId && item.alunoId === user?.id);

  const totalPendentes = useMemo(
    () => {
      if (!isAluno) return atividadesFiltradas.filter((item) => item.status === 'Pendente').length;
      return atividadesFiltradas.filter((item) => !getEntrega(item.id)).length;
    },
    [atividadesFiltradas, entregas, isAluno, user],
  );
  const totalEntregues = useMemo(
    () => {
      if (!isAluno) return atividadesFiltradas.filter((item) => item.status === 'Entregue').length;
      return atividadesFiltradas.filter((item) => Boolean(getEntrega(item.id))).length;
    },
    [atividadesFiltradas, entregas, isAluno, user],
  );

  const entregasRecentes = useMemo(() => {
    if (isAluno) return [];
    const idsAtividadesVisiveis = new Set(atividadesVisiveis.map((item) => item.id));
    return [...entregas]
      .filter((item) => idsAtividadesVisiveis.has(item.atividadeId))
      .sort((a, b) => b.enviadoEm.localeCompare(a.enviadoEm))
      .slice(0, 5);
  }, [entregas, isAluno, atividadesVisiveis]);

  const getAtividadeById = (atividadeId: string) =>
    atividades.find((item) => item.id === atividadeId);

  const handleOpenCorrecao = (entrega: AtividadeEntrega) => {
    setEntregaSelecionada(entrega);
    setNotaDraft(entrega.nota ?? 0);
    setCorrecaoOpen(true);
  };

  const handleSalvarCorrecao = () => {
    if (!entregaSelecionada) return;
    const notaNormalizada = Math.max(0, Math.min(10, notaDraft));
    const updated = entregas.map((item) =>
      item.id === entregaSelecionada.id ? { ...item, nota: notaNormalizada } : item,
    );
    setEntregas(updated);
    saveToStorage(entregasStorageKey, updated);
    setCorrecaoOpen(false);
  };

  const handleQuestionChange = (questionId: string, value: string) => {
    setDraft((prev) => ({
      ...prev,
      questoes: prev.questoes?.map((questao) =>
        questao.id === questionId ? { ...questao, enunciado: value } : questao,
      ),
    }));
  };

  const handleQuestionTypeChange = (questionId: string, tipo: QuestionType) => {
    setDraft((prev) => ({
      ...prev,
      questoes: prev.questoes?.map((questao) =>
        questao.id === questionId
          ? {
              ...questao,
              tipo,
              opcoes: tipo === 'aberta' ? [] : questao.opcoes.length ? questao.opcoes : ['', ''],
              corretaIndex: tipo === 'aberta' ? null : questao.corretaIndex,
            }
          : questao,
      ),
    }));
  };

  const handleQuestionPointsChange = (questionId: string, pontos: number) => {
    setDraft((prev) => ({
      ...prev,
      questoes: prev.questoes?.map((questao) =>
        questao.id === questionId ? { ...questao, pontos } : questao,
      ),
    }));
  };

  const handleOptionChange = (questionId: string, optionIndex: number, value: string) => {
    setDraft((prev) => ({
      ...prev,
      questoes: prev.questoes?.map((questao) => {
        if (questao.id !== questionId) return questao;
        const opcoes = [...questao.opcoes];
        opcoes[optionIndex] = value;
        return { ...questao, opcoes };
      }),
    }));
  };

  const handleCorrectChange = (questionId: string, optionIndex: number) => {
    setDraft((prev) => ({
      ...prev,
      questoes: prev.questoes?.map((questao) =>
        questao.id === questionId ? { ...questao, corretaIndex: optionIndex } : questao,
      ),
    }));
  };

  const handleAddOption = (questionId: string) => {
    setDraft((prev) => ({
      ...prev,
      questoes: prev.questoes?.map((questao) =>
        questao.id === questionId
          ? { ...questao, opcoes: [...questao.opcoes, ''] }
          : questao,
      ),
    }));
  };

  const handleRemoveOption = (questionId: string, optionIndex: number) => {
    setDraft((prev) => ({
      ...prev,
      questoes: prev.questoes?.map((questao) => {
        if (questao.id !== questionId) return questao;
        if (questao.opcoes.length <= 2) return questao;
        const opcoes = questao.opcoes.filter((_, index) => index !== optionIndex);
        let corretaIndex = questao.corretaIndex;
        if (corretaIndex !== null) {
          if (optionIndex === corretaIndex) {
            corretaIndex = null;
          } else if (optionIndex < corretaIndex) {
            corretaIndex = corretaIndex - 1;
          }
        }
        return { ...questao, opcoes, corretaIndex };
      }),
    }));
  };

  const handleAddQuestion = () => {
    setDraft((prev) => {
      const questoes = prev.questoes ?? [];
      return {
        ...prev,
        questoes: [
          ...questoes,
          {
            id: createId('questao'),
            enunciado: '',
            tipo: 'multipla',
            pontos: 1,
            opcoes: ['', '', '', '', ''],
            corretaIndex: null,
          },
        ],
      };
    });
  };

  const handleRemoveQuestion = (questionId: string) => {
    setDraft((prev) => ({
      ...prev,
      questoes: prev.questoes?.filter((questao) => questao.id !== questionId),
    }));
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setDraft({
      titulo: '',
      turma: '',
      disciplina: '',
      periodo: '',
      sala: '',
      data: '',
      horario: '',
      instrucoes: '',
      descricao: '',
      questoes: [
        {
          id: createId('questao'),
          enunciado: '',
          tipo: 'multipla',
          pontos: 1,
          opcoes: ['', '', '', '', ''],
          corretaIndex: null,
        },
      ],
      status: 'Pendente',
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (atividade: Atividade) => {
    setEditingId(atividade.id);
    setDraft({
      titulo: atividade.titulo,
      turma: atividade.turma ?? '',
      disciplina: atividade.disciplina,
      periodo: atividade.periodo ?? '',
      sala: atividade.sala ?? '',
      data: atividade.data ?? '',
      horario: atividade.horario ?? '',
      instrucoes: atividade.instrucoes ?? '',
      descricao: atividade.descricao ?? '',
      questoes: (atividade.questoes ?? []).map((questao) => ({
        id: questao.id,
        enunciado: questao.enunciado ?? '',
        tipo: questao.tipo ?? 'multipla',
        pontos: questao.pontos ?? 1,
        opcoes: questao.opcoes?.length ? questao.opcoes : ['', '', '', '', ''],
        corretaIndex: questao.corretaIndex ?? null,
      })),
      status: atividade.status,
    });
    setDialogOpen(true);
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.titulo || !draft.turma || !draft.disciplina || !draft.periodo) {
      window.alert('Preencha titulo, turma, disciplina e periodo.');
      return;
    }
    if (!draft.data || !draft.horario || !draft.sala) {
      window.alert('Preencha data, horario e sala.');
      return;
    }
    const questoes = draft.questoes ?? [];
    if (questoes.length === 0) {
      window.alert('Adicione pelo menos uma questão.');
      return;
    }
    const questaoInvalida = questoes.find(
      (questao) =>
        !questao.enunciado.trim() ||
        (questao.pontos ?? 0) <= 0 ||
        (questao.tipo === 'multipla' && questao.opcoes.length < 2),
    );
    if (questaoInvalida) {
      window.alert('Revise as questões. Todas precisam de enunciado, pontuação e opções válidas.');
      return;
    }

    const descricaoFinal =
      draft.descricao?.trim() ||
      (draft.questoes?.[0]?.enunciado?.trim() ?? '');
    const normalized = { ...draft, descricao: descricaoFinal };

    if (editingId) {
      const updated = atividades.map((item) =>
        item.id === editingId ? { ...item, ...normalized } : item,
      );
      setAtividades(updated);
      saveToStorage(storageKey, updated);
    } else {
      const updated = [
        {
          id: createId('atividade'),
          professorId: user?.id ?? '',
          professorNome: user?.nome ?? '',
          ...normalized,
        },
        ...atividades,
      ];
      setAtividades(updated);
      saveToStorage(storageKey, updated);
    }

    setDialogOpen(false);
  };

  const handleDelete = (atividade: Atividade) => {
    const confirmed = window.confirm(
      `Deseja remover a atividade "${atividade.titulo}"?`,
    );
    if (!confirmed) return;
    const updated = atividades.filter((item) => item.id !== atividade.id);
    setAtividades(updated);
    saveToStorage(storageKey, updated);
  };


  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Atividades
            </h1>
            <p className="text-muted-foreground">
              Organize suas entregas e acompanhe os prazos das atividades.
            </p>
          </div>
          {!isAluno && (
            <Button variant="gradient" asChild>
              <Link to="/atividades/nova">
                <ClipboardList className="w-4 h-4" />
                Nova atividade
              </Link>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pendentes
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">
                  {totalPendentes}
                </div>
              </div>
              <ClipboardList className="w-5 h-5 text-warning" />
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Entregues
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">
                  {totalEntregues}
                </div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-success" />
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de atividades
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">
                  {atividadesFiltradas.length}
                </div>
              </div>
              <CalendarClock className="w-5 h-5 text-primary" />
            </CardHeader>
          </Card>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-[220px]">
            <Label htmlFor="filtro-disciplina" className="text-xs text-muted-foreground">
              Filtrar por materia
            </Label>
            <Select value={disciplinaSelecionada} onValueChange={setDisciplinaSelecionada}>
              <SelectTrigger id="filtro-disciplina">
                <SelectValue placeholder="Todas as materias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as materias</SelectItem>
                {disciplinaOptions.map((disciplina) => (
                  <SelectItem key={disciplina} value={disciplina}>
                    {disciplina}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {atividadesFiltradas.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhuma atividade cadastrada. Clique em "Nova atividade".
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {atividadesFiltradas.map((atividade) => {
              const entrega = isAluno ? getEntrega(atividade.id) : null;
              const statusAluno: AtividadeStatus = entrega ? 'Entregue' : 'Pendente';
              const statusAtual = isAluno ? statusAluno : atividade.status;
              const dataExibicao = atividade.data || atividade.entrega || 'Sem data';
              const horarioExibicao = atividade.horario || '';
              return (
                <Card key={atividade.id} className="card-hover">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant={statusAtual === 'Pendente' ? 'destructive' : 'secondary'}>
                        {statusAtual}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {atividade.turma || 'Turma'}
                      </span>
                    </div>
                    <CardTitle className="text-lg">{atividade.titulo}</CardTitle>
                    <CardDescription>
                      {atividade.disciplina} • {atividade.periodo || 'Periodo'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {atividade.descricao && (
                      <div className="text-sm text-muted-foreground">
                        {atividade.descricao}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarClock className="w-4 h-4" />
                      {dataExibicao}
                      {horarioExibicao ? ` • ${horarioExibicao}` : ''}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {atividade.sala}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {isAluno ? (
                        <Link to={`/atividades/${atividade.id}`}>
                          <Button size="sm" variant="outline">
                            {entrega ? 'Ver envio' : 'Fazer atividade'}
                          </Button>
                        </Link>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleOpenEdit(atividade)}>
                            <Pencil className="w-4 h-4" />
                            Editar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(atividade)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                    {statusAtual === 'Entregue' && (
                      <div className="flex items-center gap-2 text-xs text-success">
                        <CheckCircle2 className="w-4 h-4" />
                        Entregue com sucesso
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        {!isAluno && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Correções de atividades</CardTitle>
              <CardDescription>
                Avalie as atividades entregues pelos alunos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {entregasRecentes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Nenhuma atividade entregue ainda.
                </div>
              ) : (
                <div className="space-y-3">
                  {entregasRecentes.map((entrega) => {
                    const atividade = getAtividadeById(entrega.atividadeId);
                    return (
                      <div
                        key={entrega.id}
                        className="flex flex-col gap-3 rounded-lg border border-border/60 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {atividade?.titulo ?? 'Atividade'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entrega.alunoNome} • {atividade?.turma ?? 'Turma'} •{' '}
                            {atividade?.disciplina ?? entrega.disciplina}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            Nota: {typeof entrega.nota === 'number' ? entrega.nota.toFixed(1) : '-'}
                          </span>
                          <Button size="sm" variant="outline" onClick={() => handleOpenCorrecao(entrega)}>
                            Avaliar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] w-full max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar atividade' : 'Nova atividade'}
            </DialogTitle>
            <DialogDescription>
              Preencha as informacoes da atividade e defina a data de entrega.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Titulo</Label>
              <Input
                id="titulo"
                value={draft.titulo}
                onChange={(event) => setDraft((prev) => ({ ...prev, titulo: event.target.value }))}
                placeholder="Ex: Lista de exercicios"
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="turma">Turma</Label>
                <Select
                  value={draft.turma}
                  onValueChange={(value) => setDraft((prev) => ({ ...prev, turma: value }))}
                  disabled={!hasTurmas}
                >
                  <SelectTrigger id="turma">
                    <SelectValue placeholder="Selecione a turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {turmaOptions.map((turma) => (
                      <SelectItem key={turma} value={turma}>
                        {turma}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!hasTurmas && (
                  <p className="text-xs text-muted-foreground">
                    Cadastre turmas antes de criar uma atividade.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="disciplina">Disciplina</Label>
                <Select
                  value={draft.disciplina}
                  onValueChange={(value) => setDraft((prev) => ({ ...prev, disciplina: value }))}
                  disabled={!hasDisciplinas}
                >
                  <SelectTrigger id="disciplina">
                    <SelectValue placeholder="Selecione a disciplina" />
                  </SelectTrigger>
                  <SelectContent>
                    {disciplinaOptions.map((disciplina) => (
                      <SelectItem key={disciplina} value={disciplina}>
                        {disciplina}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!hasDisciplinas && (
                  <p className="text-xs text-muted-foreground">
                    Cadastre disciplinas antes de criar uma atividade.
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sala">Sala</Label>
                <Input
                  id="sala"
                  value={draft.sala}
                  onChange={(event) => setDraft((prev) => ({ ...prev, sala: event.target.value }))}
                  placeholder="Ex: Sala 12"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodo">Periodo</Label>
                <Select
                  value={draft.periodo}
                  onValueChange={(value) => setDraft((prev) => ({ ...prev, periodo: value }))}
                  disabled={!hasPeriodos}
                >
                  <SelectTrigger id="periodo">
                    <SelectValue placeholder="Selecione o periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodoOptions.map((periodo) => (
                      <SelectItem key={periodo} value={periodo}>
                        {periodo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!hasPeriodos && (
                  <p className="text-xs text-muted-foreground">
                    Cadastre periodos antes de criar uma atividade.
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={draft.data}
                  onChange={(event) => setDraft((prev) => ({ ...prev, data: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="horario">Horario</Label>
                <Input
                  id="horario"
                  type="time"
                  value={draft.horario}
                  onChange={(event) => setDraft((prev) => ({ ...prev, horario: event.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="instrucoes">Instrucoes</Label>
              <Textarea
                id="instrucoes"
                value={draft.instrucoes}
                onChange={(event) => setDraft((prev) => ({ ...prev, instrucoes: event.target.value }))}
                placeholder="Orientacoes gerais para os alunos"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={draft.status}
                onValueChange={(value) => setDraft((prev) => ({ ...prev, status: value as AtividadeStatus }))}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Entregue">Entregue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4 rounded-lg border border-border p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Questões</h3>
                  <p className="text-xs text-muted-foreground">
                    Defina quantas questões quiser e a pontuação de cada uma.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground">
                    {draft.questoes?.length ?? 0} questões •{' '}
                    {(draft.questoes ?? []).reduce((acc, questao) => acc + (questao.pontos || 0), 0)} pontos
                  </div>
                  <Button type="button" variant="outline" onClick={handleAddQuestion}>
                    Adicionar questão
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                {(draft.questoes ?? []).map((questao, index) => (
                  <div key={questao.id} className="rounded-md border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">
                        Questão {index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveQuestion(questao.id)}
                        disabled={(draft.questoes?.length ?? 0) <= 1}
                      >
                        Remover
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`enunciado-${questao.id}`}>Enunciado</Label>
                      <Input
                        id={`enunciado-${questao.id}`}
                        value={questao.enunciado}
                        onChange={(event) => handleQuestionChange(questao.id, event.target.value)}
                        placeholder="Digite o enunciado da questão"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor={`tipo-${questao.id}`}>Tipo</Label>
                        <Select
                          value={questao.tipo}
                          onValueChange={(value) =>
                            handleQuestionTypeChange(questao.id, value as QuestionType)
                          }
                        >
                          <SelectTrigger id={`tipo-${questao.id}`}>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="multipla">Multipla escolha</SelectItem>
                            <SelectItem value="aberta">Resposta aberta</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`pontos-${questao.id}`}>Pontuação</Label>
                        <Input
                          id={`pontos-${questao.id}`}
                          type="number"
                          min={0}
                          step="0.5"
                          value={questao.pontos}
                          onChange={(event) =>
                            handleQuestionPointsChange(questao.id, Number(event.target.value))
                          }
                          required
                        />
                      </div>
                    </div>
                    {questao.tipo === 'multipla' ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Opções de resposta</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddOption(questao.id)}
                          >
                            Adicionar opção
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {questao.opcoes.map((opcao, optionIndex) => (
                            <div key={`${questao.id}-${optionIndex}`} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correta-${questao.id}`}
                                checked={questao.corretaIndex === optionIndex}
                                onChange={() => handleCorrectChange(questao.id, optionIndex)}
                              />
                              <span className="text-xs text-muted-foreground w-5">
                                {String.fromCharCode(65 + optionIndex)})
                              </span>
                              <Input
                                value={opcao}
                                onChange={(event) =>
                                  handleOptionChange(questao.id, optionIndex, event.target.value)
                                }
                                placeholder={`Alternativa ${String.fromCharCode(65 + optionIndex)}`}
                                required
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveOption(questao.id, optionIndex)}
                                disabled={questao.opcoes.length <= 2}
                              >
                                Remover
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                        Questão aberta: o aluno digitará a resposta.
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
      <Dialog open={correcaoOpen} onOpenChange={setCorrecaoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avaliar atividade</DialogTitle>
            <DialogDescription>
              Defina a nota da atividade entregue.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nota-atividade">Nota</Label>
              <Input
                id="nota-atividade"
                type="number"
                min={0}
                max={10}
                step="0.5"
                value={notaDraft}
                onChange={(event) => setNotaDraft(Number(event.target.value))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCorrecaoOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" variant="gradient" onClick={handleSalvarCorrecao}>
                Salvar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Atividades;
