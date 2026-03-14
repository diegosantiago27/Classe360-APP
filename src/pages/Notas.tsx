import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ClipboardList, PenLine, Pencil, Trash2 } from 'lucide-react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createId, loadFromStorage, saveToStorage } from '@/lib/mockStorage';
import { CatalogItem, defaultDisciplinas, disciplinasStorageKey } from '@/lib/mockAcademics';
import { Turma, defaultTurmas, turmasStorageKey } from '@/lib/mockTurmas';

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
}

const storageKey = 'school-compass:notas';
const vinculosStorageKey = 'school-compass:disciplinas-vinculos';

const normalizeText = (value?: string) =>
  (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const defaultLancamentos: Lancamento[] = [
  {
    id: 'MAT-9A-1',
    turma: '9º Ano A',
    disciplina: 'Matematica',
    bimestre: '1º Bimestre',
    pendentes: 6,
    status: 'Pendente',
  },
  {
    id: 'MAT-9B-1',
    turma: '9º Ano B',
    disciplina: 'Matematica',
    bimestre: '1º Bimestre',
    pendentes: 0,
    status: 'Concluida',
  },
  {
    id: 'FIS-8A-2',
    turma: '8º Ano A',
    disciplina: 'Fisica',
    bimestre: '2º Bimestre',
    pendentes: 3,
    status: 'Pendente',
  },
  {
    id: 'POR-7C-1',
    turma: '7º Ano C',
    disciplina: 'Portugues',
    bimestre: '1º Bimestre',
    pendentes: 0,
    status: 'Concluida',
  },
];


const Notas: React.FC = () => {
  const { user } = useAuth();
  const ehProfessor =
    user?.perfil === UserProfile.PROFESSOR ||
    String((user as { role?: unknown } | null)?.role ?? '').toUpperCase() === 'ROLE_PROFESSOR';
  const somenteConsulta =
    user?.perfil === UserProfile.SECRETARIA || user?.perfil === UserProfile.PROFESSOR;
  const [lancamentos, setLancamentos] = useState<Lancamento[]>(
    () => loadFromStorage<Lancamento[]>(storageKey, defaultLancamentos),
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
  const [turnoSelecionado, setTurnoSelecionado] = useState<string>('todos');
  const disciplinasDisponiveis = useMemo(
    () => loadFromStorage<CatalogItem[]>(disciplinasStorageKey, defaultDisciplinas),
    [],
  );
  const turmasDisponiveis = useMemo(
    () => loadFromStorage<Turma[]>(turmasStorageKey, defaultTurmas),
    [],
  );
  const vinculos = useMemo(
    () => loadFromStorage<DisciplinaVinculo[]>(vinculosStorageKey, []),
    [],
  );
  const professorVinculos = useMemo(() => {
    if (!ehProfessor || !user?.id) return [];
    return vinculos.filter((v) => v.professorId === user.id);
  }, [ehProfessor, user?.id, vinculos]);
  const turnoPorTurma = useMemo(
    () => new Map(turmasDisponiveis.map((turma) => [turma.nome, turma.turno])),
    [turmasDisponiveis],
  );
  const disciplinaNomePorId = useMemo(
    () => new Map(disciplinasDisponiveis.map((item) => [item.id, item.nome])),
    [disciplinasDisponiveis],
  );
  const paresVinculadosProfessor = useMemo(() => {
    return new Set(
      professorVinculos.map((v) => {
        const disciplinaNome = disciplinaNomePorId.get(v.disciplinaId) ?? '';
        const turmaNome =
          turmasDisponiveis.find((t) => t.id === v.turmaId)?.nome ??
          v.turmaNome ??
          v.turmaId;
        return `${normalizeText(turmaNome)}::${normalizeText(disciplinaNome)}`;
      }),
    );
  }, [professorVinculos, disciplinaNomePorId, turmasDisponiveis]);
  const lancamentosVisiveis = useMemo(() => {
    if (!ehProfessor) return lancamentos;
    return lancamentos.filter((item) =>
      paresVinculadosProfessor.has(`${normalizeText(item.turma)}::${normalizeText(item.disciplina)}`),
    );
  }, [ehProfessor, lancamentos, paresVinculadosProfessor]);
  const disciplinaOptions = useMemo(
    () => {
      if (!ehProfessor) return disciplinasDisponiveis.map((item) => item.nome);
      const nomes = professorVinculos
        .map((v) => disciplinaNomePorId.get(v.disciplinaId) ?? '')
        .filter(Boolean);
      return Array.from(new Set(nomes)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    },
    [ehProfessor, disciplinasDisponiveis, professorVinculos, disciplinaNomePorId],
  );
  const turmaOptions = useMemo(() => {
    if (!ehProfessor) {
      return turmasDisponiveis
        .map((item) => item.nome)
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }
    const nomes = professorVinculos
      .map((v) => turmasDisponiveis.find((t) => t.id === v.turmaId)?.nome ?? v.turmaNome ?? '')
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
        disciplinaSelecionada === 'todas' || item.disciplina === disciplinaSelecionada;
      const matchBimestre =
        bimestreSelecionado === 'todos' || item.bimestre === bimestreSelecionado;
      const matchTurma =
        turmaSelecionada === 'todas' || item.turma === turmaSelecionada;
      const matchTurno =
        turnoSelecionado === 'todos' || turnoPorTurma.get(item.turma) === turnoSelecionado;
      return matchDisciplina && matchBimestre && matchTurma && matchTurno;
    });
  }, [lancamentosVisiveis, disciplinaSelecionada, bimestreSelecionado, turmaSelecionada, turnoSelecionado, turnoPorTurma]);

  const pendentes = useMemo(
    () => lancamentosFiltrados.filter((item) => item.status === 'Pendente').length,
    [lancamentosFiltrados],
  );
  const concluidas = useMemo(
    () => lancamentosFiltrados.filter((item) => item.status === 'Concluida').length,
    [lancamentosFiltrados],
  );

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
            <div className="flex flex-col gap-3 pt-3 md:flex-row md:items-end">
              <div className="max-w-xs">
                <Label htmlFor="filtro-disciplina" className="text-xs text-muted-foreground">
                  Filtrar por disciplina
                </Label>
                <Select value={disciplinaSelecionada} onValueChange={setDisciplinaSelecionada}>
                  <SelectTrigger id="filtro-disciplina">
                    <SelectValue placeholder="Todas as disciplinas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as disciplinas</SelectItem>
                    {disciplinaOptions.map((disciplina) => (
                      <SelectItem key={disciplina} value={disciplina}>
                        {disciplina}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="max-w-xs">
                <Label htmlFor="filtro-bimestre" className="text-xs text-muted-foreground">
                  Filtrar por bimestre
                </Label>
                <Select value={bimestreSelecionado} onValueChange={setBimestreSelecionado}>
                  <SelectTrigger id="filtro-bimestre">
                    <SelectValue placeholder="Todos os bimestres" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os bimestres</SelectItem>
                    {bimestreOptions.map((bimestre) => (
                      <SelectItem key={bimestre} value={bimestre}>
                        {bimestre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="max-w-xs">
                <Label htmlFor="filtro-turno" className="text-xs text-muted-foreground">
                  Filtrar por turno
                </Label>
                <Select value={turnoSelecionado} onValueChange={setTurnoSelecionado}>
                  <SelectTrigger id="filtro-turno">
                    <SelectValue placeholder="Todos os turnos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os turnos</SelectItem>
                    <SelectItem value="Manha">Manha</SelectItem>
                    <SelectItem value="Tarde">Tarde</SelectItem>
                    <SelectItem value="Noite">Noite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="max-w-xs">
                <Label htmlFor="filtro-turma" className="text-xs text-muted-foreground">
                  Filtrar por turma
                </Label>
                <Select value={turmaSelecionada} onValueChange={setTurmaSelecionada}>
                  <SelectTrigger id="filtro-turma">
                    <SelectValue placeholder="Todas as turmas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as turmas</SelectItem>
                    {turmaOptions.map((turma) => (
                      <SelectItem key={turma} value={turma}>
                        {turma}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {lancamentosFiltrados.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nenhum lancamento encontrado para esta disciplina.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Turma</TableHead>
                    <TableHead>Disciplina</TableHead>
                    <TableHead>Bimestre</TableHead>
                    <TableHead>Pendentes</TableHead>
                    <TableHead>Status</TableHead>
                    {!somenteConsulta && (
                    <TableHead className="text-right">Acoes</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lancamentosFiltrados.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <Link to={`/notas/${item.id}`}>
                          <Button variant="ghost" size="sm">
                            {item.turma}
                          </Button>
                        </Link>
                      </TableCell>
                      <TableCell>{item.disciplina}</TableCell>
                      <TableCell>{item.bimestre}</TableCell>
                      <TableCell>{item.pendentes}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'Pendente' ? 'destructive' : 'secondary'}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      {!somenteConsulta && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenEdit(item)}>
                            <Pencil className="w-4 h-4" />
                            Editar
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(item)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
