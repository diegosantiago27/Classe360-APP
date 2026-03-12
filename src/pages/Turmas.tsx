import React, { useEffect, useMemo, useState } from 'react';
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
import { loadFromStorage, saveToStorage, createId, syncKeysFromBackend } from '@/lib/mockStorage';
import { Turma, TurmaStatus, TurmaTurno, turmasStorageKey, defaultTurmas } from '@/lib/mockTurmas';
import { Link } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { StoredUser, defaultUsers, usersStorageKey } from '@/lib/mockUsers';

interface DisciplinaVinculoStorage {
  turmaId: string;
  professorId?: string;
  professorNome: string;
  alunos?: Array<{
    alunoId: string;
    alunoNome: string;
  }>;
}

const vinculosStorageKey = 'school-compass:disciplinas-vinculos';
const API_URL = import.meta.env.VITE_API_URL as string | undefined;
const onlyDigits = (value: string) => value.replace(/\D/g, '');

interface UsuarioApi {
  id: number;
  cpf: string;
  nome: string;
  email: string;
  role: string;
  ativo: boolean;
}

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

const Turmas: React.FC = () => {
  const { user } = useAuth();
  const podeCriarTurma =
    user?.perfil === UserProfile.GESTOR ||
    user?.perfil === UserProfile.ADMINISTRADOR ||
    user?.perfil === UserProfile.SECRETARIA;
  const podeVincularAlunosNaTurma =
    user?.perfil === UserProfile.GESTOR || user?.perfil === UserProfile.ADMINISTRADOR;
  const podeEditarTurma =
    user?.perfil === UserProfile.GESTOR || user?.perfil === UserProfile.ADMINISTRADOR;
  const podeRemoverTurmaAdmin = user?.perfil === UserProfile.ADMINISTRADOR;
  const podeRemoverTurmaVazia = user?.perfil === UserProfile.SECRETARIA;
  const podeRemoverTurma = podeRemoverTurmaAdmin || podeRemoverTurmaVazia;
  const [turmas, setTurmas] = useState<Turma[]>(
    () => loadFromStorage<Turma[]>(turmasStorageKey, defaultTurmas),
  );
  const [vinculos, setVinculos] = useState<DisciplinaVinculoStorage[]>(
    () => loadFromStorage<DisciplinaVinculoStorage[]>(vinculosStorageKey, []),
  );
  const [usuarios, setUsuarios] = useState<StoredUser[]>(
    () => loadFromStorage<StoredUser[]>(usersStorageKey, defaultUsers),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [alunosSelecionados, setAlunosSelecionados] = useState<string[]>([]);
  const [alunoCpfBusca, setAlunoCpfBusca] = useState('');
  const [draft, setDraft] = useState<Omit<Turma, 'id'>>({
    nome: '',
    turno: 'Manha',
    alunos: 0,
    professor: '',
    status: 'Ativa',
    proximaAula: '',
  });

  useEffect(() => {
    const keys = [usersStorageKey, turmasStorageKey, vinculosStorageKey];
    void syncKeysFromBackend(keys).finally(() => {
      setUsuarios(loadFromStorage<StoredUser[]>(usersStorageKey, defaultUsers));
      setTurmas(loadFromStorage<Turma[]>(turmasStorageKey, defaultTurmas));
      setVinculos(loadFromStorage<DisciplinaVinculoStorage[]>(vinculosStorageKey, []));
    });
  }, []);

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
          turmas: (u as { turmas?: string[] }).turmas ?? [],
        }));
        setUsuarios(mapped);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, []);

  const alunosDisponiveis = useMemo(
    () => usuarios.filter((u) => u.perfil === UserProfile.ALUNO && u.status === 'ativo'),
    [usuarios],
  );
  const alunosFiltradosPorCpf = useMemo(() => {
    const cpfBusca = onlyDigits(alunoCpfBusca);
    if (!cpfBusca) return alunosDisponiveis;
    return alunosDisponiveis.filter((aluno) => onlyDigits(aluno.cpf).includes(cpfBusca));
  }, [alunosDisponiveis, alunoCpfBusca]);
  const turmasVisiveis = useMemo(() => {
    if (!user) return [];
    if (
      user.perfil === UserProfile.GESTOR ||
      user.perfil === UserProfile.ADMINISTRADOR ||
      user.perfil === UserProfile.SECRETARIA
    ) {
      return turmas;
    }

    if (user.perfil === UserProfile.PROFESSOR) {
      const turmaIdsProfessor = new Set(
        vinculos
          .filter((v) => v.professorId === user.id || v.professorNome === user.nome)
          .map((v) => v.turmaId),
      );
      return turmas.filter((turma) => turmaIdsProfessor.has(turma.id));
    }

    if (user.perfil === UserProfile.ALUNO) {
      const turmaIdsAluno = new Set(
        vinculos
          .filter((v) => (v.alunos ?? []).some((a) => a.alunoId === user.id))
          .map((v) => v.turmaId),
      );
      const turmaNomesAluno = new Set(
        usuarios
          .find((u) => u.id === user.id)
          ?.turmas?.map((nome) => nome.trim()) ?? [],
      );
      return turmas.filter((turma) => turmaIdsAluno.has(turma.id) || turmaNomesAluno.has(turma.nome));
    }

    return [];
  }, [turmas, usuarios, user, vinculos]);
  const alunosQuantidadeRealPorTurmaId = useMemo(() => {
    const map = new Map<string, number>();

    turmas.forEach((turma) => {
      const ids = new Set<string>();

      usuarios.forEach((u) => {
        if (u.perfil !== UserProfile.ALUNO || u.status !== 'ativo') return;
        if ((u.turmas ?? []).includes(turma.nome)) {
          ids.add(u.id);
        }
      });

      vinculos
        .filter((v) => v.turmaId === turma.id)
        .forEach((v) => {
          (v.alunos ?? []).forEach((a) => ids.add(a.alunoId));
        });

      map.set(turma.id, ids.size);
    });

    return map;
  }, [turmas, usuarios, vinculos]);

  const totalAlunos = useMemo(
    () =>
      turmasVisiveis.reduce(
        (acc, turma) => acc + (alunosQuantidadeRealPorTurmaId.get(turma.id) ?? 0),
        0,
      ),
    [alunosQuantidadeRealPorTurmaId, turmasVisiveis],
  );
  const nomesTurmasSugeridas = useMemo(
    () =>
      Array.from(
        new Set(
          turmas
            .map((turma) => turma.nome.trim())
            .filter((nome) => Boolean(nome)),
        ),
      ).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })),
    [turmas],
  );
  const turmasAtivas = useMemo(
    () => turmasVisiveis.filter((turma) => turma.status === 'Ativa').length,
    [turmasVisiveis],
  );
  const professorPorTurmaId = useMemo(() => {
    const map = new Map<string, string>();
    vinculos.forEach((v) => {
      if (v.professorNome?.trim()) map.set(v.turmaId, v.professorNome.trim());
    });
    return map;
  }, [vinculos]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setAlunosSelecionados([]);
    setAlunoCpfBusca('');
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
    setAlunoCpfBusca('');
    setAlunosSelecionados(
      usuarios
        .filter((u) => u.perfil === UserProfile.ALUNO && (u.turmas ?? []).includes(turma.nome))
        .map((u) => u.id),
    );
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
    const turmaNome = draft.nome.trim();
    if (!turmaNome) return;
    const nomeNormalizado = turmaNome.toLocaleLowerCase('pt-BR');
    const turmaDuplicada = turmas.some((turma) => {
      if (editingId && turma.id === editingId) return false;
      return (
        turma.nome.trim().toLocaleLowerCase('pt-BR') === nomeNormalizado &&
        turma.turno === draft.turno
      );
    });
    if (turmaDuplicada) {
      window.alert(`Ja existe uma turma "${turmaNome}" no turno ${draft.turno}.`);
      return;
    }

    const oldTurmaNome = editingId
      ? turmas.find((turma) => turma.id === editingId)?.nome ?? null
      : null;

    const updatedUsers = usuarios.map((usuario) => {
      if (usuario.perfil !== UserProfile.ALUNO) return usuario;
      const hadOldTurma = oldTurmaNome ? (usuario.turmas ?? []).includes(oldTurmaNome) : false;
      const shouldHaveNewTurma = alunosSelecionados.includes(usuario.id);

      let turmasUsuario = (usuario.turmas ?? []).filter((t) => t !== (oldTurmaNome ?? ''));
      if (shouldHaveNewTurma && !turmasUsuario.includes(turmaNome)) {
        turmasUsuario = [...turmasUsuario, turmaNome];
      } else if (!shouldHaveNewTurma && hadOldTurma) {
        turmasUsuario = turmasUsuario.filter((t) => t !== turmaNome);
      }
      return { ...usuario, turmas: turmasUsuario };
    });
    setUsuarios(updatedUsers);
    saveToStorage(usersStorageKey, updatedUsers);

    if (editingId) {
      const updated = turmas.map((turma) =>
        turma.id === editingId ? { ...turma, ...draft, nome: turmaNome, alunos: alunosSelecionados.length } : turma,
      );
      setTurmas(updated);
      saveToStorage(turmasStorageKey, updated);
    } else {
      const newTurmas = [
        ...turmas,
        {
          id: createId('turma'),
          ...draft,
          nome: turmaNome,
          alunos: alunosSelecionados.length,
        },
      ];
      setTurmas(newTurmas);
      saveToStorage(turmasStorageKey, newTurmas);
    }

    setDialogOpen(false);
  };

  const podeRemoverEstaTurma = (turma: Turma) => {
    if (podeRemoverTurmaAdmin) return true;
    if (podeRemoverTurmaVazia) {
      const qtd = alunosQuantidadeRealPorTurmaId.get(turma.id) ?? 0;
      return qtd === 0;
    }
    return false;
  };

  const handleDelete = (turma: Turma) => {
    if (!podeRemoverEstaTurma(turma)) return;
    const confirmed = window.confirm(
      `Deseja remover a turma ${turma.nome}? Esta acao nao pode ser desfeita.`,
    );
    if (!confirmed) return;
    const updated = turmas.filter((item) => item.id !== turma.id);
    setTurmas(updated);
    saveToStorage(turmasStorageKey, updated);
  };

  const toggleAluno = (alunoId: string) => {
    setAlunosSelecionados((prev) =>
      prev.includes(alunoId) ? prev.filter((id) => id !== alunoId) : [...prev, alunoId],
    );
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
          {podeCriarTurma && (
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
                  {turmasVisiveis.length}
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
            {turmasVisiveis.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {user?.perfil === UserProfile.GESTOR ||
                user?.perfil === UserProfile.ADMINISTRADOR ||
                user?.perfil === UserProfile.SECRETARIA
                  ? 'Nenhuma turma cadastrada. Clique em "Nova turma" para adicionar.'
                  : 'Nenhuma turma atribuida para seu perfil.'}
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
                    {(podeEditarTurma || podeRemoverTurma) && (
                    <TableHead className="text-right">Acoes</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {turmasVisiveis.map((turma) => (
                    <TableRow key={turma.id}>
                      <TableCell className="font-medium">
                        <Link
                          to={`/turmas/${encodeURIComponent(turma.id)}`}
                          className="text-primary hover:underline"
                        >
                          {turma.nome}
                        </Link>
                      </TableCell>
                      <TableCell>{turma.turno}</TableCell>
                      <TableCell>{professorPorTurmaId.get(turma.id) ?? turma.professor ?? '-'}</TableCell>
                      <TableCell>{alunosQuantidadeRealPorTurmaId.get(turma.id) ?? 0}</TableCell>
                      <TableCell>
                        <Badge
                          variant={turma.status === 'Ativa' ? 'default' : turma.status === 'Inativa' ? 'outline' : 'secondary'}
                        >
                          {turma.status}
                        </Badge>
                      </TableCell>
                      {(podeEditarTurma || podeRemoverTurma) && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {podeEditarTurma && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEdit(turma)}
                            >
                              <Pencil className="w-4 h-4" />
                              Editar
                            </Button>
                          )}
                          {podeRemoverEstaTurma(turma) && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(turma)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
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
                list="turmas-sugeridas"
                required
              />
              <datalist id="turmas-sugeridas">
                {nomesTurmasSugeridas.map((nomeTurma) => (
                  <option key={nomeTurma} value={nomeTurma} />
                ))}
              </datalist>
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
            {podeVincularAlunosNaTurma && (
              <div className="space-y-2">
                <Label>Alunos da turma</Label>
                <Input
                  value={alunoCpfBusca}
                  onChange={(event) => setAlunoCpfBusca(event.target.value)}
                  placeholder="Buscar aluno por CPF"
                />
                <div className="max-h-48 overflow-auto rounded-md border border-border p-3 space-y-2">
                  {alunosDisponiveis.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum aluno ativo encontrado.</p>
                  ) : alunosFiltradosPorCpf.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum aluno encontrado para este CPF.</p>
                  ) : (
                    alunosFiltradosPorCpf.map((aluno) => (
                      <div key={aluno.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`turma-aluno-${aluno.id}`}
                          checked={alunosSelecionados.includes(aluno.id)}
                          onCheckedChange={() => toggleAluno(aluno.id)}
                        />
                        <label htmlFor={`turma-aluno-${aluno.id}`} className="text-sm cursor-pointer">
                          {aluno.nome}
                        </label>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Total selecionado: {alunosSelecionados.length}
                </p>
              </div>
            )}
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
