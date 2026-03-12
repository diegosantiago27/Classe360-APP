import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Pencil, Plus, Trash2, Link2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/auth';
import { createId, loadFromStorage, saveToStorage } from '@/lib/mockStorage';
import { CatalogItem, defaultDisciplinas, disciplinasStorageKey } from '@/lib/mockAcademics';
import { StoredUser, defaultUsers, usersStorageKey } from '@/lib/mockUsers';
import { Turma, turmasStorageKey, defaultTurmas } from '@/lib/mockTurmas';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

function roleToPerfil(role: string): UserProfile {
  switch (role) {
    case 'ROLE_GESTOR':
      return UserProfile.GESTOR;
    case 'ROLE_ADMIN':
    case 'ADMIN':
      return UserProfile.ADMINISTRADOR;
    case 'ROLE_SECRETARIA':
      return UserProfile.SECRETARIA;
    case 'ROLE_PROFESSOR':
      return UserProfile.PROFESSOR;
    case 'ROLE_ALUNO':
    default:
      return UserProfile.ALUNO;
  }
}

interface UsuarioApi {
  id: number;
  cpf: string;
  nome: string;
  email: string;
  role: string;
  ativo: boolean;
}

type Turno = 'Manha' | 'Tarde' | 'Noite';

interface AlunoVinculado {
  alunoId: string;
  alunoNome: string;
  turno: Turno;
  ano: string;
  serie: string;
}

interface DisciplinaVinculo {
  disciplinaId: string;
  turmaId: string;
  turmaNome: string;
  professorId: string;
  professorNome: string;
  alunos: AlunoVinculado[];
}

const vinculosStorageKey = 'school-compass:disciplinas-vinculos';

const Disciplinas: React.FC = () => {
  const { user } = useAuth();
  const podeGerenciar = user?.perfil === UserProfile.GESTOR || user?.perfil === UserProfile.ADMINISTRADOR || user?.perfil === UserProfile.SECRETARIA;
  const podeRemoverDisciplina = user?.perfil === UserProfile.ADMINISTRADOR;
  const [disciplinas, setDisciplinas] = useState<CatalogItem[]>(
    () => loadFromStorage<CatalogItem[]>(disciplinasStorageKey, defaultDisciplinas),
  );
  const [vinculos, setVinculos] = useState<DisciplinaVinculo[]>(
    () => loadFromStorage<DisciplinaVinculo[]>(vinculosStorageKey, []),
  );
  const [usuarios, setUsuarios] = useState<StoredUser[]>(
    () => loadFromStorage<StoredUser[]>(usersStorageKey, defaultUsers),
  );

  useEffect(() => {
    if (!API_URL) return;
    let cancelled = false;
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/api/usuarios?size=500`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const content = (data.content ?? data) as UsuarioApi[];
        const mapped: StoredUser[] = content.map((u) => ({
          id: String(u.id),
          cpf: u.cpf ?? '',
          nome: u.nome ?? '',
          email: u.email ?? '',
          perfil: roleToPerfil(u.role ?? 'ROLE_ALUNO'),
          turno: (u as { turno?: string }).turno as StoredUser['turno'] | undefined,
          status: u.ativo ? 'ativo' : 'inativo',
        }));
        setUsuarios(mapped);
      })
      .catch(() => !cancelled && setUsuarios(loadFromStorage<StoredUser[]>(usersStorageKey, defaultUsers)));
    return () => {
      cancelled = true;
    };
  }, []);

  const professores = useMemo(
    () =>
      usuarios.filter(
        (u) => u.perfil === UserProfile.PROFESSOR && u.status === 'ativo',
      ),
    [usuarios],
  );
  const alunos = useMemo(
    () =>
      usuarios.filter((u) => u.perfil === UserProfile.ALUNO && u.status === 'ativo'),
    [usuarios],
  );
  const [turmas, setTurmas] = useState<Turma[]>(
    () => loadFromStorage<Turma[]>(turmasStorageKey, defaultTurmas),
  );
  const turmasOrdenadas = useMemo(() => {
    return [...turmas].sort((a, b) => {
      const numA = parseInt(a.nome.match(/(\d+)/)?.[1] ?? '0', 10);
      const numB = parseInt(b.nome.match(/(\d+)/)?.[1] ?? '0', 10);
      if (numA !== numB) return numA - numB;
      const letraA = a.nome.split(/\s+/).pop() ?? '';
      const letraB = b.nome.split(/\s+/).pop() ?? '';
      return letraA.localeCompare(letraB);
    });
  }, [turmas]);
  const [vinculoDialogOpen, setVinculoDialogOpen] = useState(false);

  useEffect(() => {
    if (vinculoDialogOpen) {
      setTurmas(loadFromStorage<Turma[]>(turmasStorageKey, defaultTurmas));
    }
  }, [vinculoDialogOpen]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [disciplinaVinculoId, setDisciplinaVinculoId] = useState<string | null>(null);
  const [turmaId, setTurmaId] = useState('');
  const [professorId, setProfessorId] = useState('');
  const [turno, setTurno] = useState<Turno>('Manha');
  const [alunosSelecionados, setAlunosSelecionados] = useState<string[]>([]);

  const total = useMemo(() => disciplinas.length, [disciplinas]);
  const totalComProfessor = useMemo(
    () => vinculos.filter((v) => Boolean(v.professorId)).length,
    [vinculos],
  );
  const totalAlunosVinculados = useMemo(
    () => vinculos.reduce((acc, item) => acc + item.alunos.length, 0),
    [vinculos],
  );
  const handleOpenEdit = (item: CatalogItem) => {
    setEditingId(item.id);
    setNome(item.nome);
    setDialogOpen(true);
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = nome.trim();
    if (!trimmed) return;

    if (editingId) {
      const updated = disciplinas.map((item) =>
        item.id === editingId ? { ...item, nome: trimmed } : item,
      );
      setDisciplinas(updated);
      saveToStorage(disciplinasStorageKey, updated);
    } else {
      const updated = [{ id: createId('disciplina'), nome: trimmed }, ...disciplinas];
      setDisciplinas(updated);
      saveToStorage(disciplinasStorageKey, updated);
    }

    setDialogOpen(false);
  };

  const handleDelete = (item: CatalogItem) => {
    const confirmed = window.confirm(`Deseja remover a disciplina "${item.nome}"?`);
    if (!confirmed) return;
    const updated = disciplinas.filter((row) => row.id !== item.id);
    setDisciplinas(updated);
    saveToStorage(disciplinasStorageKey, updated);
  };

  const getVinculos = (disciplinaId: string) =>
    vinculos.filter((v) => v.disciplinaId === disciplinaId);

  const handleOpenVinculo = (disciplinaId: string) => {
    setDisciplinaVinculoId(disciplinaId);
    setTurmaId('');
    setProfessorId('');
    setTurno('Manha');
    setAlunosSelecionados([]);
    setVinculoDialogOpen(true);
  };

  const handleTurmaChange = (id: string) => {
    setTurmaId(id);
    const turma = turmas.find((t) => t.id === id);
    if (turma) {
      setTurno(turma.turno);
    }
  };

  const toggleAluno = (alunoId: string) => {
    setAlunosSelecionados((prev) =>
      prev.includes(alunoId) ? prev.filter((id) => id !== alunoId) : [...prev, alunoId],
    );
  };

  const handleSaveVinculo = (event: React.FormEvent) => {
    event.preventDefault();
    if (!disciplinaVinculoId) return;
    if (!turmaId) return;
    if (!professorId) return;

    const turmaNome = turmas.find((t) => t.id === turmaId)?.nome ?? '';
    const professorNome = professores.find((p) => p.id === professorId)?.nome ?? '';
    const anoAtual = new Date().getFullYear().toString();
    const alunosVinculados: AlunoVinculado[] = alunosSelecionados.map((id) => ({
      alunoId: id,
      alunoNome: alunos.find((a) => a.id === id)?.nome ?? '',
      turno,
      ano: anoAtual,
      serie: turmaNome,
    }));

    const novo: DisciplinaVinculo = {
      disciplinaId: disciplinaVinculoId,
      turmaId,
      turmaNome,
      professorId,
      professorNome,
      alunos: alunosVinculados,
    };

    const existente = vinculos.find(
      (v) => v.disciplinaId === disciplinaVinculoId && v.turmaId === turmaId,
    );
    const updated = existente
      ? vinculos.map((v) =>
          v.disciplinaId === disciplinaVinculoId && v.turmaId === turmaId ? novo : v,
        )
      : [...vinculos, novo];

    setVinculos(updated);
    saveToStorage(vinculosStorageKey, updated);
    setVinculoDialogOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Disciplinas
            </h1>
            <p className="text-muted-foreground">
              Cadastre e mantenha a lista de disciplinas usadas no sistema.
            </p>
          </div>
          {podeGerenciar && (
            <Button variant="gradient" asChild>
              <Link to="/disciplinas/cadastro-horarios">
                <Plus className="w-4 h-4" />
                Nova disciplina
              </Link>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de disciplinas
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">
                  {total}
                </div>
              </div>
              <BookOpen className="w-5 h-5 text-primary" />
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Com professor atribuido
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">{totalComProfessor}</div>
              </div>
              <Link2 className="w-5 h-5 text-primary" />
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Alunos vinculados
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">{totalAlunosVinculados}</div>
              </div>
              <Link2 className="w-5 h-5 text-primary" />
            </CardHeader>
          </Card>
        </div>

        {disciplinas.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhuma disciplina cadastrada. Clique em "Nova disciplina".
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {disciplinas.map((item) => (
              <Card key={item.id} className="card-hover">
                <CardHeader>
                  <CardTitle className="text-lg">{item.nome}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground space-y-2">
                    {getVinculos(item.id).length === 0 ? (
                      <p>Nenhuma turma vinculada.</p>
                    ) : (
                      getVinculos(item.id).map((v) => (
                        <div key={v.turmaId} className="border rounded p-2 space-y-1">
                          <p className="font-medium text-foreground">{v.turmaNome}</p>
                          <p>
                            Professor:{' '}
                            <span className="text-foreground font-medium">{v.professorNome}</span>
                          </p>
                          <p>
                            Alunos vinculados:{' '}
                            <span className="text-foreground font-medium">{v.alunos.length}</span>
                          </p>
                          <p>
                            Turno/Ano/Serie:{' '}
                            <span className="text-foreground font-medium">
                              {v.alunos[0]
                                ? `${v.alunos[0].turno} - ${v.alunos[0].ano} - ${v.alunos[0].serie}`
                                : '-'}
                            </span>
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {podeGerenciar && (
                      <Button size="sm" variant="secondary" onClick={() => handleOpenVinculo(item.id)}>
                        <Link2 className="w-4 h-4" />
                        Atribuir
                      </Button>
                    )}
                    {podeGerenciar && (
                      <Button size="sm" variant="outline" onClick={() => handleOpenEdit(item)}>
                        <Pencil className="w-4 h-4" />
                        Editar
                      </Button>
                    )}
                    {podeRemoverDisciplina && (
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(item)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar disciplina</DialogTitle>
            <DialogDescription>
              Informe o nome da disciplina conforme cadastro institucional.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                placeholder="Ex: Matematica"
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

      <Dialog open={vinculoDialogOpen} onOpenChange={setVinculoDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vincular professor e alunos</DialogTitle>
            <DialogDescription>
              Defina professor da disciplina e vincule alunos ao turno.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveVinculo} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="turma">Turma *</Label>
                <Select value={turmaId} onValueChange={handleTurmaChange}>
                  <SelectTrigger id="turma">
                    <SelectValue placeholder="Selecione a turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {turmasOrdenadas.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome} ({t.turno})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="professor">Professor *</Label>
                <Select value={professorId} onValueChange={setProfessorId}>
                  <SelectTrigger id="professor">
                    <SelectValue placeholder="Selecione um professor" />
                  </SelectTrigger>
                  <SelectContent>
                    {professores.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setVinculoDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="gradient">
                Salvar atribuicoes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Disciplinas;
