import React, { useMemo, useState } from 'react';
import { CalendarCheck, Pencil, Trash2, Users } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createId, loadFromStorage, saveToStorage } from '@/lib/mockStorage';

type FrequenciaStatus = 'Atualizado' | 'Pendente';
type PresencaStatus = 'Presente' | 'Falta';

interface RegistroFrequencia {
  id: string;
  turma: string;
  disciplina: string;
  presencas: number;
  ausencias: number;
  ultimaAtualizacao: string;
  status: FrequenciaStatus;
}

const storageKey = 'school-compass:frequencia';
const presencasStorageKey = 'school-compass:frequencia-diaria';

interface AlunoTurma {
  id: string;
  nome: string;
  turma: string;
}

interface RegistroPresenca {
  id: string;
  turma: string;
  alunoId: string;
  alunoNome: string;
  data: string;
  status: PresencaStatus;
}

const defaultRegistros: RegistroFrequencia[] = [
  {
    id: 'FREQ-9A',
    turma: '9º Ano A',
    disciplina: 'Matematica',
    presencas: 94,
    ausencias: 6,
    ultimaAtualizacao: 'Hoje, 09:10',
    status: 'Atualizado',
  },
  {
    id: 'FREQ-9B',
    turma: '9º Ano B',
    disciplina: 'Matematica',
    presencas: 92,
    ausencias: 8,
    ultimaAtualizacao: 'Hoje, 10:00',
    status: 'Atualizado',
  },
  {
    id: 'FREQ-8A',
    turma: '8º Ano A',
    disciplina: 'Fisica',
    presencas: 88,
    ausencias: 12,
    ultimaAtualizacao: 'Ontem, 14:20',
    status: 'Pendente',
  },
];

const defaultAlunos: AlunoTurma[] = [
  { id: 'AL-9A-1', nome: 'Pedro Oliveira', turma: '9º Ano A' },
  { id: 'AL-9A-2', nome: 'Maria Souza', turma: '9º Ano A' },
  { id: 'AL-9B-1', nome: 'Joao Pedro', turma: '9º Ano B' },
  { id: 'AL-8A-1', nome: 'Lucia Ferreira', turma: '8º Ano A' },
];

const Frequencia: React.FC = () => {
  const [registros, setRegistros] = useState<RegistroFrequencia[]>(
    () => loadFromStorage<RegistroFrequencia[]>(storageKey, defaultRegistros),
  );
  const [presencas, setPresencas] = useState<RegistroPresenca[]>(
    () => loadFromStorage<RegistroPresenca[]>(presencasStorageKey, []),
  );
  const [turmaSelecionada, setTurmaSelecionada] = useState(
    defaultAlunos[0]?.turma ?? '9º Ano A',
  );
  const [alunoSelecionado, setAlunoSelecionado] = useState(
    defaultAlunos[0]?.id ?? '',
  );
  const [mesSelecionado, setMesSelecionado] = useState(() => {
    const now = new Date();
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${mes}`;
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<RegistroFrequencia, 'id'>>({
    turma: '',
    disciplina: '',
    presencas: 0,
    ausencias: 0,
    ultimaAtualizacao: '',
    status: 'Atualizado',
  });

  const mediaPresenca = useMemo(() => {
    if (registros.length === 0) return 0;
    return Math.round(
      registros.reduce((acc, item) => acc + item.presencas, 0) / registros.length
    );
  }, [registros]);

  const turmasDisponiveis = useMemo(() => {
    const turmasRegistros = registros.map((item) => item.turma);
    const turmasAlunos = defaultAlunos.map((item) => item.turma);
    return Array.from(new Set([...turmasRegistros, ...turmasAlunos])).sort();
  }, [registros]);

  const alunosDaTurma = useMemo(
    () => defaultAlunos.filter((item) => item.turma === turmaSelecionada),
    [turmaSelecionada],
  );

  const alunoAtual = useMemo(
    () => alunosDaTurma.find((item) => item.id === alunoSelecionado) ?? alunosDaTurma[0],
    [alunosDaTurma, alunoSelecionado],
  );

  const diasDoMes = useMemo(() => {
    const [ano, mes] = mesSelecionado.split('-').map(Number);
    const total = new Date(ano, mes, 0).getDate();
    return Array.from({ length: total }, (_, index) => {
      const dia = index + 1;
      const data = new Date(ano, mes - 1, dia);
      const dataFormatada = data.toISOString().slice(0, 10);
      return { dia, data: dataFormatada };
    });
  }, [mesSelecionado]);

  const presencasAluno = useMemo(
    () =>
      presencas.filter(
        (item) =>
          item.alunoId === alunoAtual?.id &&
          item.turma === turmaSelecionada &&
          item.data.startsWith(mesSelecionado),
      ),
    [presencas, alunoAtual, turmaSelecionada, mesSelecionado],
  );

  const handleTogglePresenca = (data: string) => {
    if (!alunoAtual) return;
    const existente = presencas.find(
      (item) => item.alunoId === alunoAtual.id && item.data === data,
    );
    const atualizado = existente
      ? presencas.map((item) =>
          item.id === existente.id
            ? {
                ...item,
                status: item.status === 'Presente' ? 'Falta' : 'Presente',
              }
            : item,
        )
      : [
          ...presencas,
          {
            id: createId('presenca'),
            turma: turmaSelecionada,
            alunoId: alunoAtual.id,
            alunoNome: alunoAtual.nome,
            data,
            status: 'Presente',
          },
        ];
    setPresencas(atualizado);
    saveToStorage(presencasStorageKey, atualizado);
  };

  const totalPresencasMes = presencasAluno.filter((item) => item.status === 'Presente').length;
  const totalFaltasMes = presencasAluno.filter((item) => item.status === 'Falta').length;

  const handleOpenCreate = () => {
    setEditingId(null);
    setDraft({
      turma: '',
      disciplina: '',
      presencas: 0,
      ausencias: 0,
      ultimaAtualizacao: '',
      status: 'Atualizado',
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: RegistroFrequencia) => {
    setEditingId(item.id);
    setDraft({
      turma: item.turma,
      disciplina: item.disciplina,
      presencas: item.presencas,
      ausencias: item.ausencias,
      ultimaAtualizacao: item.ultimaAtualizacao,
      status: item.status,
    });
    setDialogOpen(true);
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    const presencas = Math.min(100, Math.max(0, draft.presencas));
    const ausencias = Math.min(100, Math.max(0, draft.ausencias));
    const normalized = {
      ...draft,
      presencas,
      ausencias,
      ultimaAtualizacao: draft.ultimaAtualizacao || 'Hoje',
    };

    if (editingId) {
      const updated = registros.map((item) =>
        item.id === editingId ? { ...item, ...normalized } : item,
      );
      setRegistros(updated);
      saveToStorage(storageKey, updated);
    } else {
      const newRegistros = [
        ...registros,
        { id: createId('freq'), ...normalized },
      ];
      setRegistros(newRegistros);
      saveToStorage(storageKey, newRegistros);
    }

    setDialogOpen(false);
  };

  const handleDelete = (item: RegistroFrequencia) => {
    const confirmed = window.confirm(
      `Deseja remover o registro de ${item.disciplina} (${item.turma})?`,
    );
    if (!confirmed) return;
    const updated = registros.filter((row) => row.id !== item.id);
    setRegistros(updated);
    saveToStorage(storageKey, updated);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Frequencia
            </h1>
            <p className="text-muted-foreground">
              Registre presencas e acompanhe indicadores por turma.
            </p>
          </div>
          <Button variant="gradient" onClick={handleOpenCreate}>
            <CalendarCheck className="w-4 h-4" />
            Registrar hoje
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Media geral
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">
                  {mediaPresenca}%
                </div>
              </div>
              <Users className="w-5 h-5 text-success" />
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Turmas monitoradas
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">
                  {registros.length}
                </div>
              </div>
              <CalendarCheck className="w-5 h-5 text-primary" />
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Registros recentes</CardTitle>
            <CardDescription>
              Atualize as turmas pendentes e revise o historico.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {registros.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nenhum registro encontrado. Clique em "Registrar hoje".
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Turma</TableHead>
                    <TableHead>Disciplina</TableHead>
                    <TableHead>Presencas</TableHead>
                    <TableHead>Ausencias</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Atualizado em</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registros.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.turma}</TableCell>
                      <TableCell>{item.disciplina}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">{item.presencas}%</span>
                          <div className="h-2 flex-1 rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-success"
                              style={{ width: `${item.presencas}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{item.ausencias}%</TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'Pendente' ? 'destructive' : 'secondary'}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.ultimaAtualizacao}</TableCell>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Calendario de presenca</CardTitle>
            <CardDescription>
              Selecione a turma e o aluno para registrar presencas e faltas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="turma-calendario">Turma</Label>
                <Select
                  value={turmaSelecionada}
                  onValueChange={(value) => {
                    setTurmaSelecionada(value);
                    const alunoDaTurma = defaultAlunos.find((item) => item.turma === value);
                    if (alunoDaTurma) {
                      setAlunoSelecionado(alunoDaTurma.id);
                    }
                  }}
                >
                  <SelectTrigger id="turma-calendario">
                    <SelectValue placeholder="Selecione a turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {turmasDisponiveis.map((turma) => (
                      <SelectItem key={turma} value={turma}>
                        {turma}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="aluno-calendario">Aluno</Label>
                <Select
                  value={alunoAtual?.id ?? ''}
                  onValueChange={(value) => setAlunoSelecionado(value)}
                >
                  <SelectTrigger id="aluno-calendario">
                    <SelectValue placeholder="Selecione o aluno" />
                  </SelectTrigger>
                  <SelectContent>
                    {alunosDaTurma.map((aluno) => (
                      <SelectItem key={aluno.id} value={aluno.id}>
                        {aluno.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mes-calendario">Mes</Label>
                <Input
                  id="mes-calendario"
                  type="month"
                  value={mesSelecionado}
                  onChange={(event) => setMesSelecionado(event.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Presencas: {totalPresencasMes}</span>
              <span>Faltas: {totalFaltasMes}</span>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {diasDoMes.map((dia) => {
                const registro = presencasAluno.find((item) => item.data === dia.data);
                const status = registro?.status;
                return (
                  <button
                    key={dia.data}
                    type="button"
                    onClick={() => handleTogglePresenca(dia.data)}
                    className={`rounded-md border px-2 py-2 text-sm transition-colors ${
                      status === 'Presente'
                        ? 'border-success/40 bg-success/10 text-success'
                        : status === 'Falta'
                        ? 'border-destructive/40 bg-destructive/10 text-destructive'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {dia.dia}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-success" />
                Presente
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-destructive" />
                Falta
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar registro' : 'Novo registro'}
            </DialogTitle>
            <DialogDescription>
              Informe os indicadores de presenca da turma.
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
                <Label htmlFor="presencas">Presencas (%)</Label>
                <Input
                  id="presencas"
                  type="number"
                  min={0}
                  max={100}
                  value={draft.presencas}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, presencas: Number(event.target.value) }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ausencias">Ausencias (%)</Label>
                <Input
                  id="ausencias"
                  type="number"
                  min={0}
                  max={100}
                  value={draft.ausencias}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, ausencias: Number(event.target.value) }))
                  }
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={draft.status}
                  onValueChange={(value) =>
                    setDraft((prev) => ({ ...prev, status: value as FrequenciaStatus }))
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Atualizado">Atualizado</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="atualizacao">Atualizado em</Label>
                <Input
                  id="atualizacao"
                  value={draft.ultimaAtualizacao}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, ultimaAtualizacao: event.target.value }))
                  }
                  placeholder="Ex: Hoje, 09:10"
                />
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

export default Frequencia;
