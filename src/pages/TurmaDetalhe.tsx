import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { loadFromStorage, saveToStorage } from '@/lib/mockStorage';
import { Turma, defaultTurmas, turmasStorageKey } from '@/lib/mockTurmas';
import { StoredUser, defaultUsers, usersStorageKey } from '@/lib/mockUsers';
import { UserProfile } from '@/types/auth';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;
const vinculosStorageKey = 'school-compass:disciplinas-vinculos';

interface UsuarioApi {
  id: number;
  cpf: string;
  nome: string;
  email: string;
  role: string;
  ativo: boolean;
}

interface DisciplinaVinculoStorage {
  turmaId: string;
  professorId?: string;
  professorNome: string;
  alunos: Array<{
    alunoId: string;
    alunoNome: string;
  }>;
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

const TurmaDetalhe: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const turmaIdParam = id ? decodeURIComponent(id) : '';
  const [buscaAluno, setBuscaAluno] = useState('');
  const [turmaDestinoPorAluno, setTurmaDestinoPorAluno] = useState<Record<string, string>>({});
  const [turmas, setTurmas] = useState<Turma[]>(() => loadFromStorage<Turma[]>(turmasStorageKey, defaultTurmas));
  const [usuarios, setUsuarios] = useState<StoredUser[]>(
    () => loadFromStorage<StoredUser[]>(usersStorageKey, defaultUsers),
  );
  const [vinculos, setVinculos] = useState<DisciplinaVinculoStorage[]>(
    () => loadFromStorage<DisciplinaVinculoStorage[]>(vinculosStorageKey, []),
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
          turmas: (u as { turmas?: string[] }).turmas ?? [],
        }));
        setUsuarios(mapped);
      })
      .catch(() => null);

    return () => {
      cancelled = true;
    };
  }, []);

  const turma = useMemo(() => turmas.find((item) => item.id === turmaIdParam), [turmaIdParam, turmas]);
  const podeAcessarTurma = useMemo(() => {
    if (!user || !turma) return false;
    if (
      user.perfil === UserProfile.GESTOR ||
      user.perfil === UserProfile.ADMINISTRADOR ||
      user.perfil === UserProfile.SECRETARIA
    ) {
      return true;
    }
    if (user.perfil === UserProfile.PROFESSOR) {
      return vinculos.some(
        (v) => v.turmaId === turma.id && (v.professorId === user.id || v.professorNome === user.nome),
      );
    }
    if (user.perfil === UserProfile.ALUNO) {
      const atribuidoNosVinculos = vinculos.some(
        (v) => v.turmaId === turma.id && v.alunos.some((a) => a.alunoId === user.id),
      );
      const alunoAtual = usuarios.find((u) => u.id === user.id);
      const atribuidoNoCadastro = (alunoAtual?.turmas ?? []).includes(turma.nome);
      return atribuidoNosVinculos || atribuidoNoCadastro;
    }
    return false;
  }, [turma, user, usuarios, vinculos]);
  const professorDaTurma = useMemo(() => {
    if (!turma) return '-';
    const professorVinculado = vinculos.find(
      (v) => v.turmaId === turma.id && v.professorNome?.trim(),
    )?.professorNome;
    return professorVinculado || turma.professor || '-';
  }, [turma, vinculos]);

  const alunosDaTurma = useMemo(() => {
    if (!turma) return [];

    const alunosPorCadastro = usuarios.filter(
      (u) =>
        u.perfil === UserProfile.ALUNO &&
        u.status === 'ativo' &&
        (u.turmas ?? []).includes(turma.nome),
    );

    const idsVinculados = new Set(
      vinculos
        .filter((v) => v.turmaId === turma.id)
        .flatMap((v) => v.alunos.map((a) => a.alunoId)),
    );
    const nomesVinculadosSemUsuario = vinculos
      .filter((v) => v.turmaId === turma.id)
      .flatMap((v) => v.alunos)
      .filter((a) => !usuarios.some((u) => u.id === a.alunoId))
      .map((a) => ({ id: a.alunoId, nome: a.alunoNome, cpf: '-' }));

    const alunosPorVinculo = usuarios.filter(
      (u) => u.perfil === UserProfile.ALUNO && u.status === 'ativo' && idsVinculados.has(u.id),
    );

    const unicos = new Map<string, { id: string; nome: string; cpf: string }>();
    [...alunosPorCadastro, ...alunosPorVinculo].forEach((aluno) => {
      unicos.set(aluno.id, { id: aluno.id, nome: aluno.nome, cpf: aluno.cpf || '-' });
    });
    nomesVinculadosSemUsuario.forEach((aluno) => {
      if (!unicos.has(aluno.id)) {
        unicos.set(aluno.id, aluno);
      }
    });

    return Array.from(unicos.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [turma, usuarios, vinculos]);
  const alunosFiltrados = useMemo(() => {
    const termo = buscaAluno.trim().toLowerCase();
    if (!termo) return alunosDaTurma;
    return alunosDaTurma.filter((aluno) => {
      const nome = aluno.nome.toLowerCase();
      const cpf = (aluno.cpf ?? '').toLowerCase();
      return nome.includes(termo) || cpf.includes(termo);
    });
  }, [alunosDaTurma, buscaAluno]);
  const podeGerenciarAlunos = user?.perfil === UserProfile.ADMINISTRADOR;
  const turmasDestino = useMemo(
    () => turmas.filter((t) => t.id !== turma?.id),
    [turma?.id, turmas],
  );
  const resultadosBuscaVinculacao = useMemo(() => {
    const termo = buscaAluno.trim().toLowerCase();
    if (!termo) return [];
    const alunosAtivos = usuarios.filter(
      (u) => u.perfil === UserProfile.ALUNO && u.status === 'ativo',
    );
    return alunosAtivos.filter((aluno) => {
      const nome = aluno.nome.toLowerCase();
      const cpf = (aluno.cpf ?? '').toLowerCase();
      return nome.includes(termo) || cpf.includes(termo);
    });
  }, [buscaAluno, usuarios]);
  const idsAlunosDaTurma = useMemo(
    () => new Set(alunosDaTurma.map((a) => a.id)),
    [alunosDaTurma],
  );

  const handleVincularAluno = (aluno: StoredUser) => {
    if (!turma) return;
    if (idsAlunosDaTurma.has(aluno.id)) return;

    const updatedUsuarios = usuarios.map((u) => {
      if (u.id !== aluno.id) return u;
      const turmasAluno = u.turmas ?? [];
      if (turmasAluno.includes(turma.nome)) return u;
      return { ...u, turmas: [...turmasAluno, turma.nome] };
    });
    setUsuarios(updatedUsuarios);
    saveToStorage(usersStorageKey, updatedUsuarios);

    const updatedTurmas = turmas.map((t) =>
      t.id === turma.id ? { ...t, alunos: t.alunos + 1 } : t,
    );
    setTurmas(updatedTurmas);
    saveToStorage(turmasStorageKey, updatedTurmas);

    const vinculoTurma = vinculos.find((v) => v.turmaId === turma.id);
    if (vinculoTurma) {
      const jaExiste = vinculoTurma.alunos.some((a) => a.alunoId === aluno.id);
      if (!jaExiste) {
        const updatedVinculos = vinculos.map((v) =>
          v.turmaId === turma.id
            ? {
                ...v,
                alunos: [...v.alunos, { alunoId: aluno.id, alunoNome: aluno.nome }],
              }
            : v,
        );
        setVinculos(updatedVinculos);
        saveToStorage(vinculosStorageKey, updatedVinculos);
      }
    }
  };

  const handleRemoverAluno = (alunoId: string) => {
    if (!turma || !podeGerenciarAlunos) return;
    const aluno = usuarios.find((u) => u.id === alunoId);
    const nomeAluno = aluno?.nome ?? 'aluno';
    const confirmed = window.confirm(`Deseja remover ${nomeAluno} da turma ${turma.nome}?`);
    if (!confirmed) return;

    const updatedUsuarios = usuarios.map((u) => {
      if (u.id !== alunoId) return u;
      return { ...u, turmas: (u.turmas ?? []).filter((t) => t !== turma.nome) };
    });
    setUsuarios(updatedUsuarios);
    saveToStorage(usersStorageKey, updatedUsuarios);

    const updatedTurmas = turmas.map((t) =>
      t.id === turma.id ? { ...t, alunos: Math.max(0, t.alunos - 1) } : t,
    );
    setTurmas(updatedTurmas);
    saveToStorage(turmasStorageKey, updatedTurmas);

    const updatedVinculos = vinculos.map((v) =>
      v.turmaId === turma.id
        ? { ...v, alunos: v.alunos.filter((a) => a.alunoId !== alunoId) }
        : v,
    );
    setVinculos(updatedVinculos);
    saveToStorage(vinculosStorageKey, updatedVinculos);
  };

  const handleMigrarAluno = (alunoId: string) => {
    if (!turma || !podeGerenciarAlunos) return;
    const turmaDestinoId = turmaDestinoPorAluno[alunoId];
    if (!turmaDestinoId) return;
    const destino = turmas.find((t) => t.id === turmaDestinoId);
    if (!destino) return;

    const aluno = usuarios.find((u) => u.id === alunoId);
    const nomeAluno = aluno?.nome ?? 'aluno';
    const confirmed = window.confirm(
      `Deseja migrar ${nomeAluno} de ${turma.nome} para ${destino.nome}?`,
    );
    if (!confirmed) return;

    const updatedUsuarios = usuarios.map((u) => {
      if (u.id !== alunoId) return u;
      const semOrigem = (u.turmas ?? []).filter((t) => t !== turma.nome);
      return semOrigem.includes(destino.nome) ? { ...u, turmas: semOrigem } : { ...u, turmas: [...semOrigem, destino.nome] };
    });
    setUsuarios(updatedUsuarios);
    saveToStorage(usersStorageKey, updatedUsuarios);

    const updatedTurmas = turmas.map((t) => {
      if (t.id === turma.id) return { ...t, alunos: Math.max(0, t.alunos - 1) };
      if (t.id === destino.id) return { ...t, alunos: t.alunos + 1 };
      return t;
    });
    setTurmas(updatedTurmas);
    saveToStorage(turmasStorageKey, updatedTurmas);

    const updatedVinculos = vinculos.map((v) => {
      if (v.turmaId === turma.id) {
        return { ...v, alunos: v.alunos.filter((a) => a.alunoId !== alunoId) };
      }
      if (v.turmaId === destino.id) {
        const jaExiste = v.alunos.some((a) => a.alunoId === alunoId);
        if (jaExiste) return v;
        return { ...v, alunos: [...v.alunos, { alunoId, alunoNome: nomeAluno }] };
      }
      return v;
    });
    setVinculos(updatedVinculos);
    saveToStorage(vinculosStorageKey, updatedVinculos);

    setTurmaDestinoPorAluno((prev) => ({ ...prev, [alunoId]: '' }));
  };

  if (!turma) {
    return <Navigate to="/turmas" replace />;
  }
  if (!podeAcessarTurma) {
    return <Navigate to="/turmas" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">{turma.nome}</h1>
            <p className="text-muted-foreground">Detalhes da turma e alunos vinculados.</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/turmas">
              <ArrowLeft className="w-4 h-4" />
              Voltar para turmas
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Turno</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{turma.turno}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Professor</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{professorDaTurma}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge
                variant={turma.status === 'Ativa' ? 'default' : turma.status === 'Inativa' ? 'outline' : 'secondary'}
              >
                {turma.status}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Alunos</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="text-xl font-semibold">{alunosDaTurma.length}</CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Alunos da turma</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input
                value={buscaAluno}
                onChange={(event) => setBuscaAluno(event.target.value)}
                placeholder="Buscar por nome ou CPF"
              />
            </div>
            {alunosDaTurma.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum aluno vinculado nesta turma.</p>
            ) : alunosFiltrados.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum aluno encontrado para a busca informada.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    {podeGerenciarAlunos && <TableHead className="text-right">Acoes</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alunosFiltrados.map((aluno) => (
                    <TableRow key={aluno.id}>
                      <TableCell className="font-medium">{aluno.nome}</TableCell>
                      <TableCell>{aluno.cpf}</TableCell>
                      {podeGerenciarAlunos && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Select
                              value={turmaDestinoPorAluno[aluno.id] ?? ''}
                              onValueChange={(value) =>
                                setTurmaDestinoPorAluno((prev) => ({ ...prev, [aluno.id]: value }))
                              }
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Migrar para..." />
                              </SelectTrigger>
                              <SelectContent>
                                {turmasDestino.map((destino) => (
                                  <SelectItem key={destino.id} value={destino.id}>
                                    {destino.nome} ({destino.turno})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!turmaDestinoPorAluno[aluno.id]}
                              onClick={() => handleMigrarAluno(aluno.id)}
                            >
                              Migrar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoverAluno(aluno.id)}
                            >
                              Remover
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {resultadosBuscaVinculacao.length > 0 && (
              <div className="mt-4 border rounded-md p-3 space-y-2">
                <p className="text-sm font-medium">Resultados para vincular</p>
                {resultadosBuscaVinculacao.map((aluno) => {
                  const vinculado = idsAlunosDaTurma.has(aluno.id);
                  return (
                    <div key={aluno.id} className="flex items-center justify-between gap-2 text-sm">
                      <div>
                        <p className="font-medium">{aluno.nome}</p>
                        <p className="text-muted-foreground">{aluno.cpf}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={vinculado ? 'secondary' : 'outline'}
                        disabled={vinculado}
                        onClick={() => handleVincularAluno(aluno)}
                      >
                        {vinculado ? 'Ja vinculado' : 'Vincular'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TurmaDetalhe;
