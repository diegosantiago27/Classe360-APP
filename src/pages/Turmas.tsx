import React, { useMemo, useState } from 'react';
import { BookOpen, Calendar, GraduationCap, Pencil, Plus, Trash2, Users } from 'lucide-react';
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
import { loadFromStorage, saveToStorage, createId } from '@/lib/mockStorage';
import { Turma, turmasStorageKey, defaultTurmas } from '@/lib/mockTurmas';

const Turmas: React.FC = () => {
  const { user } = useAuth();
  const somenteConsulta = user?.perfil === UserProfile.SECRETARIA;
  const [turmas, setTurmas] = useState<Turma[]>(
    () => loadFromStorage<Turma[]>(turmasStorageKey, defaultTurmas),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<Turma, 'id'>>({
    nome: '',
    turno: 'Manha',
    alunos: 0,
    professor: '',
    status: 'Ativa',
    proximaAula: '',
  });

  const totalAlunos = useMemo(
    () => turmas.reduce((acc, turma) => acc + turma.alunos, 0),
    [turmas],
  );
  const turmasAtivas = useMemo(
    () => turmas.filter((turma) => turma.status === 'Ativa').length,
    [turmas],
  );

  const handleOpenCreate = () => {
    setEditingId(null);
    setDraft({
      nome: '',
      turno: 'Manha',
      alunos: 0,
      professor: '',
      status: 'Ativa',
      proximaAula: '',
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (turma: Turma) => {
    setEditingId(turma.id);
    setDraft({
      nome: turma.nome,
      turno: turma.turno,
      alunos: turma.alunos,
      professor: turma.professor,
      status: turma.status,
      proximaAula: turma.proximaAula,
    });
    setDialogOpen(true);
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();

    if (editingId) {
      const updated = turmas.map((turma) =>
        turma.id === editingId ? { ...turma, ...draft } : turma,
      );
      setTurmas(updated);
      saveToStorage(turmasStorageKey, updated);
    } else {
      const newTurmas = [
        ...turmas,
        {
          id: createId('turma'),
          ...draft,
        },
      ];
      setTurmas(newTurmas);
      saveToStorage(turmasStorageKey, newTurmas);
    }

    setDialogOpen(false);
  };

  const handleDelete = (turma: Turma) => {
    const confirmed = window.confirm(
      `Deseja remover a turma ${turma.nome}? Esta acao nao pode ser desfeita.`,
    );
    if (!confirmed) return;
    const updated = turmas.filter((item) => item.id !== turma.id);
    setTurmas(updated);
    saveToStorage(turmasStorageKey, updated);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Turmas
            </h1>
            <p className="text-muted-foreground">
              Acompanhe a distribuicao de turmas, professores e alunos.
            </p>
          </div>
          {!somenteConsulta && (
          <Button variant="gradient" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4" />
            Nova turma
          </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Turmas ativas
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">
                  {turmasAtivas}
                </div>
              </div>
              <GraduationCap className="w-5 h-5 text-primary" />
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de alunos
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">
                  {totalAlunos}
                </div>
              </div>
              <Users className="w-5 h-5 text-accent" />
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Proximas aulas
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">
                  {turmas.length}
                </div>
              </div>
              <Calendar className="w-5 h-5 text-warning" />
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="w-5 h-5 text-primary" />
              Visao geral das turmas
            </CardTitle>
            <CardDescription>
              Lista consolidada com informacoes principais de cada turma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {turmas.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nenhuma turma cadastrada. Clique em "Nova turma" para adicionar.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Turma</TableHead>
                    <TableHead>Turno</TableHead>
                    <TableHead>Professor</TableHead>
                    <TableHead>Alunos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Proxima aula</TableHead>
                    {!somenteConsulta && (
                    <TableHead className="text-right">Acoes</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {turmas.map((turma) => (
                    <TableRow key={turma.id}>
                      <TableCell className="font-medium">{turma.nome}</TableCell>
                      <TableCell>{turma.turno}</TableCell>
                      <TableCell>{turma.professor}</TableCell>
                      <TableCell>{turma.alunos}</TableCell>
                      <TableCell>
                        <Badge
                          variant={turma.status === 'Ativa' ? 'default' : turma.status === 'Inativa' ? 'outline' : 'secondary'}
                        >
                          {turma.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{turma.proximaAula}</TableCell>
                      {!somenteConsulta && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEdit(turma)}
                          >
                            <Pencil className="w-4 h-4" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(turma)}
                          >
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
              {editingId ? 'Editar turma' : 'Nova turma'}
            </DialogTitle>
            <DialogDescription>
              Preencha as informacoes principais da turma.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da turma</Label>
              <Input
                id="nome"
                value={draft.nome}
                onChange={(event) => setDraft((prev) => ({ ...prev, nome: event.target.value }))}
                placeholder="Ex: 9º Ano A"
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="turno">Turno</Label>
                <Select
                  value={draft.turno}
                  onValueChange={(value) =>
                    setDraft((prev) => ({ ...prev, turno: value as TurmaTurno }))
                  }
                >
                  <SelectTrigger id="turno">
                    <SelectValue placeholder="Selecione o turno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Manha">Manha</SelectItem>
                    <SelectItem value="Tarde">Tarde</SelectItem>
                    <SelectItem value="Noite">Noite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={draft.status}
                  onValueChange={(value) =>
                    setDraft((prev) => ({ ...prev, status: value as TurmaStatus }))
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativa">Ativa</SelectItem>
                    <SelectItem value="Planejada">Planejada</SelectItem>
                    <SelectItem value="Inativa">Inativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="professor">Professor responsavel</Label>
                <Input
                  id="professor"
                  value={draft.professor}
                  onChange={(event) => setDraft((prev) => ({ ...prev, professor: event.target.value }))}
                  placeholder="Nome do professor"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alunos">Total de alunos</Label>
                <Input
                  id="alunos"
                  type="number"
                  min={0}
                  value={draft.alunos}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      alunos: Number(event.target.value),
                    }))
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="proximaAula">Proxima aula</Label>
              <Input
                id="proximaAula"
                value={draft.proximaAula}
                onChange={(event) => setDraft((prev) => ({ ...prev, proximaAula: event.target.value }))}
                placeholder="Ex: 05/02, 13:40"
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

export default Turmas;
