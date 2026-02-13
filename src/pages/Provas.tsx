import React, { useMemo, useState } from 'react';
import { Calendar, FileText, MapPin, Pencil, Trash2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { createId, loadFromStorage, saveToStorage } from '@/lib/mockStorage';
import { Turma, defaultTurmas, turmasStorageKey } from '@/lib/mockTurmas';
import {
  CatalogItem,
  defaultDisciplinas,
  defaultPeriodos,
  disciplinasStorageKey,
  periodosStorageKey,
} from '@/lib/mockAcademics';
import { defaultUsers, StoredUser, usersStorageKey } from '@/lib/mockUsers';
import { UserProfile } from '@/types/auth';
import { Link } from 'react-router-dom';

type ProvaStatus = 'Agendada' | 'Rascunho' | 'Concluida';
type QuestionType = 'multipla' | 'aberta';

interface ProvaQuestion {
  id: string;
  enunciado: string;
  tipo: QuestionType;
  pontos: number;
  opcoes: string[];
  corretaIndex: number | null;
}

interface Prova {
  id: string;
  titulo: string;
  turma: string;
  disciplina: string;
  periodo: string;
  data: string;
  horario: string;
  sala: string;
  instrucoes: string;
  status: ProvaStatus;
  publicada: boolean;
  questoes?: ProvaQuestion[];
}

const storageKey = 'school-compass:provas';

const defaultProvas: Prova[] = [
  {
    id: 'PROVA-001',
    titulo: 'Prova de Matematica',
    turma: '9º Ano A',
    disciplina: 'Matematica',
    periodo: '1º Bimestre',
    data: '25/01/2026',
    horario: '08:00',
    sala: 'Sala 12',
    instrucoes: 'Responda todas as questões com atenção.',
    status: 'Agendada',
    publicada: true,
  },
  {
    id: 'PROVA-002',
    titulo: 'Prova de Fisica',
    turma: '8º Ano A',
    disciplina: 'Fisica',
    periodo: '2º Bimestre',
    data: '27/01/2026',
    horario: '09:30',
    sala: 'Lab. Fisica',
    instrucoes: '',
    status: 'Agendada',
    publicada: false,
  },
  {
    id: 'PROVA-003',
    titulo: 'Simulado Integrado',
    turma: '7º Ano C',
    disciplina: 'Ciencias',
    periodo: 'Simulado',
    data: '29/01/2026',
    horario: '13:40',
    sala: 'Sala 03',
    instrucoes: '',
    status: 'Rascunho',
    publicada: false,
  },
];

const Provas: React.FC = () => {
  const { user } = useAuth();
  const [provas, setProvas] = useState<Prova[]>(
    () => loadFromStorage<Prova[]>(storageKey, defaultProvas),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<Prova, 'id'>>({
    titulo: '',
    turma: '',
    disciplina: '',
    periodo: '',
    data: '',
    horario: '',
    sala: '',
    instrucoes: '',
    status: 'Agendada',
    publicada: false,
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
  });
  const totalAgendadas = useMemo(
    () => provas.filter((prova) => prova.status === 'Agendada').length,
    [provas],
  );
  const turmasDisponiveis = useMemo(
    () => loadFromStorage<Turma[]>(turmasStorageKey, defaultTurmas),
    [],
  );
  const usuariosCadastrados = useMemo(
    () => loadFromStorage<StoredUser[]>(usersStorageKey, defaultUsers),
    [],
  );
  const professorLogado = useMemo(() => {
    if (!user) return null;
    return usuariosCadastrados.find((item) => item.id === user.id) ?? null;
  }, [usuariosCadastrados, user]);
  const disciplinasDisponiveis = useMemo(
    () => loadFromStorage<CatalogItem[]>(disciplinasStorageKey, defaultDisciplinas),
    [],
  );
  const periodosDisponiveis = useMemo(
    () => loadFromStorage<CatalogItem[]>(periodosStorageKey, defaultPeriodos),
    [],
  );
  const turmaOptions = useMemo(() => {
    const baseOptions = turmasDisponiveis.map((turma) => turma.nome);
    const professorTurmas =
      user?.perfil === UserProfile.PROFESSOR ? professorLogado?.turmas ?? [] : [];
    const options = professorTurmas.length > 0 ? professorTurmas : baseOptions;
    if (draft.turma && !options.includes(draft.turma)) {
      return [draft.turma, ...options];
    }
    return options;
  }, [turmasDisponiveis, draft.turma, professorLogado, user?.perfil]);
  const disciplinaOptions = useMemo(() => {
    const options = disciplinasDisponiveis.map((item) => item.nome);
    if (draft.disciplina && !options.includes(draft.disciplina)) {
      return [draft.disciplina, ...options];
    }
    return options;
  }, [disciplinasDisponiveis, draft.disciplina]);
  const periodoOptions = useMemo(() => {
    const options = periodosDisponiveis.map((item) => item.nome);
    if (draft.periodo && !options.includes(draft.periodo)) {
      return [draft.periodo, ...options];
    }
    return options;
  }, [periodosDisponiveis, draft.periodo]);
  const hasTurmas = turmaOptions.length > 0;
  const hasDisciplinas = disciplinaOptions.length > 0;
  const hasPeriodos = periodoOptions.length > 0;

  const handleOpenCreate = () => {
    setEditingId(null);
    setDraft({
      titulo: '',
      turma: '',
      disciplina: '',
      periodo: '',
      data: '',
      horario: '',
      sala: '',
      instrucoes: '',
      status: 'Agendada',
      publicada: false,
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
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (prova: Prova) => {
    setEditingId(prova.id);
    setDraft({
      titulo: prova.titulo,
      turma: prova.turma,
      disciplina: prova.disciplina ?? '',
      periodo: prova.periodo ?? '',
      data: prova.data,
      horario: prova.horario,
      sala: prova.sala,
      instrucoes: prova.instrucoes ?? '',
      status: prova.status,
      publicada: prova.publicada ?? false,
      questoes:
        prova.questoes && prova.questoes.length > 0
          ? prova.questoes.map((questao) => ({
              id: questao.id,
              enunciado: questao.enunciado ?? '',
              tipo: questao.tipo ?? 'multipla',
              pontos: Number.isFinite(questao.pontos) ? questao.pontos : 1,
              opcoes: questao.opcoes?.length ? questao.opcoes : ['', ''],
              corretaIndex: questao.corretaIndex ?? null,
            }))
          : [
              {
                id: createId('questao'),
                enunciado: '',
                tipo: 'multipla',
                pontos: 1,
                opcoes: ['', '', '', '', ''],
                corretaIndex: null,
              },
            ],
    });
    setDialogOpen(true);
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    const questoes = draft.questoes ?? [];
    if (!draft.titulo.trim() || !draft.turma.trim() || !draft.disciplina.trim() || !draft.periodo.trim()) {
      window.alert('Preencha o titulo, a turma, a disciplina e o periodo.');
      return;
    }
    if (!hasTurmas || !hasDisciplinas || !hasPeriodos) {
      window.alert('Cadastre turmas, disciplinas e periodos antes de criar a prova.');
      return;
    }
    if (questoes.length === 0) {
      window.alert('Adicione pelo menos 1 questão.');
      return;
    }
    const questaoInvalida = questoes.some((questao) => {
      if (questao.enunciado.trim().length === 0) return true;
      if (!Number.isFinite(questao.pontos) || questao.pontos <= 0) return true;
      if (questao.tipo === 'aberta') return false;
      if (questao.opcoes.length < 2) return true;
      if (questao.opcoes.some((opcao) => opcao.trim().length === 0)) return true;
      if (questao.corretaIndex === null) return true;
      return false;
    });
    if (questaoInvalida) {
      window.alert('Preencha enunciado, pontuação e as opções/correta das questões.');
      return;
    }

    if (editingId) {
      const updated = provas.map((prova) =>
        prova.id === editingId ? { ...prova, ...draft } : prova,
      );
      setProvas(updated);
      saveToStorage(storageKey, updated);
    } else {
      const newProvas = [...provas, { id: createId('prova'), ...draft }];
      setProvas(newProvas);
      saveToStorage(storageKey, newProvas);
    }

    setDialogOpen(false);
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

  const handleDelete = (prova: Prova) => {
    const confirmed = window.confirm(
      `Deseja remover a prova "${prova.titulo}" da turma ${prova.turma}?`,
    );
    if (!confirmed) return;
    const updated = provas.filter((item) => item.id !== prova.id);
    setProvas(updated);
    saveToStorage(storageKey, updated);
  };

  const handleTogglePublicada = (provaId: string) => {
    const updated = provas.map((prova) =>
      prova.id === provaId ? { ...prova, publicada: !prova.publicada } : prova,
    );
    setProvas(updated);
    saveToStorage(storageKey, updated);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Provas
            </h1>
            <p className="text-muted-foreground">
              Organize provas, simulados e aplicacoes por turma.
            </p>
          </div>
          <Button variant="gradient" asChild>
            <Link to="/provas/nova">
              <FileText className="w-4 h-4" />
              Criar prova
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Provas agendadas
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">
                  {totalAgendadas}
                </div>
              </div>
              <Calendar className="w-5 h-5 text-primary" />
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de provas
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">
                  {provas.length}
                </div>
              </div>
              <FileText className="w-5 h-5 text-accent" />
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Rascunhos
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">
                  {provas.filter((prova) => prova.status === 'Rascunho').length}
                </div>
              </div>
              <FileText className="w-5 h-5 text-warning" />
            </CardHeader>
          </Card>
        </div>

        {provas.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhuma prova cadastrada. Clique em "Criar prova" para adicionar.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {provas.map((prova) => (
              <Card key={prova.id} className="card-hover">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={prova.status === 'Rascunho' ? 'secondary' : prova.status === 'Concluida' ? 'outline' : 'default'}
                    >
                      {prova.status}
                    </Badge>
                    {prova.publicada && (
                      <Badge variant="outline">Disponível</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{prova.turma}</span>
                  </div>
                  <CardTitle className="text-lg">{prova.titulo}</CardTitle>
                  <CardDescription>
                    Codigo {prova.id} • {prova.disciplina || 'Disciplina'} • {prova.questoes?.length ?? 0} questões • {(
                      prova.questoes ?? []
                    ).reduce((acc, questao) => acc + (questao.pontos || 0), 0)} pts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {prova.data} • {prova.horario}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {prova.sala}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => handleOpenEdit(prova)}>
                      <Pencil className="w-4 h-4" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant={prova.publicada ? 'secondary' : 'default'}
                      onClick={() => handleTogglePublicada(prova.id)}
                    >
                      {prova.publicada ? 'Ocultar' : 'Disponibilizar'}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(prova)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] w-full max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar prova' : 'Nova prova'}
            </DialogTitle>
            <DialogDescription>
              Preencha as informacoes da prova e defina a data de aplicacao.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Titulo</Label>
              <Input
                id="titulo"
                value={draft.titulo}
                onChange={(event) => setDraft((prev) => ({ ...prev, titulo: event.target.value }))}
                placeholder="Ex: Prova de Matematica"
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
                    Cadastre turmas antes de criar uma prova.
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
                    Cadastre disciplinas antes de criar uma prova.
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
                    Cadastre periodos antes de criar uma prova.
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
                onValueChange={(value) => setDraft((prev) => ({ ...prev, status: value as ProvaStatus }))}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Agendada">Agendada</SelectItem>
                  <SelectItem value="Rascunho">Rascunho</SelectItem>
                  <SelectItem value="Concluida">Concluida</SelectItem>
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
    </DashboardLayout>
  );
};

export default Provas;
