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
import {
  getTurmaApi,
  isApiEnabled,
  listTurmasApi,
  listUsuariosApi,
  saveTurmaApi,
} from '@/lib/entityCrudApi';
import { mergeAlunosTurmasFromApi } from '@/lib/turmasUsuariosMerge';
import {
  rotuloTurnoParaExibicao,
  turnoNomeParaTipo,
  turnoTipoParaIdPadrao,
} from '@/lib/turnosCatalog';
import { professorTemAcessoTurma, rotuloProfessoresTurma } from '@/lib/professorTurmaUtils';
import { loadVinculosDisciplinaTurma, type VinculoDisciplinaTurma } from '@/lib/vinculosRelacional';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;
const vinculosStorageKey = 'school-compass:disciplinas-vinculos';
const getSerieNumero = (nomeTurma: string) => nomeTurma.match(/(\d+)/)?.[1] ?? '';

const apenasDigitos = (value: string) => value.replace(/\D/g, '');
const cpfOculto = '***.***.***-**';

/** Busca por nome (parcial) ou CPF (com ou sem pontuação). */
function alunoCombinaComBusca(nome: string, cpf: string | undefined, termoBruto: string): boolean {
  const termo = termoBruto.trim().toLowerCase();
  if (!termo) return true;
  if (nome.toLowerCase().includes(termo)) return true;
  const cpfLower = (cpf ?? '').toLowerCase();
  if (cpfLower.includes(termo)) return true;
  const digitosCpf = apenasDigitos(cpf ?? '');
  const digitosTermo = apenasDigitos(termoBruto);
  if (digitosTermo.length > 0 && digitosCpf.includes(digitosTermo)) return true;
  return false;
}

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

const TurmaDetalhe: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const turmaIdParam = id ? decodeURIComponent(id) : '';
  const [buscaAluno, setBuscaAluno] = useState('');
  const [turmaDestinoPorAluno, setTurmaDestinoPorAluno] = useState<Record<string, string>>({});
  const [turmas, setTurmas] = useState<Turma[]>(() =>
    loadFromStorage<Turma[]>(turmasStorageKey, isApiEnabled() ? [] : defaultTurmas),
  );
  const [usuarios, setUsuarios] = useState<StoredUser[]>(
    () => loadFromStorage<StoredUser[]>(usersStorageKey, isApiEnabled() ? [] : defaultUsers),
  );
  const [vinculos, setVinculos] = useState<VinculoDisciplinaTurma[]>(
    () => loadFromStorage<VinculoDisciplinaTurma[]>(vinculosStorageKey, []),
  );

  useEffect(() => {
    if (!isApiEnabled()) return;
    void Promise.all([listTurmasApi(), listUsuariosApi(), loadVinculosDisciplinaTurma()])
      .then(([turmasApi, usuariosApi, vincRows]) => {
        const turmasMapped: Turma[] = turmasApi.map((t) => {
          const nomeTurno = t.turnoNome?.trim() ?? '';
          const tid =
            t.turnoId != null && Number.isFinite(Number(t.turnoId))
              ? String(t.turnoId)
              : turnoTipoParaIdPadrao(turnoNomeParaTipo(nomeTurno));
          return {
            id: String(t.id ?? ''),
            nome: t.nome ?? `Turma ${t.id ?? ''}`,
            turnoId: tid,
            turnoNome: nomeTurno || undefined,
            turno: turnoNomeParaTipo(nomeTurno),
            alunos: Array.isArray(t.alunosIds) ? t.alunosIds.length : 0,
            professor: t.professorId ? String(t.professorId) : '',
            status: (t.status as Turma['status']) ?? 'Ativa',
            proximaAula: '',
          };
        });
        const usuariosMapped: StoredUser[] = usuariosApi.map((u) => ({
          id: String(u.id ?? ''),
          cpf: u.cpf ?? '',
          nome: u.nome ?? '',
          email: u.email ?? '',
          perfil: roleToPerfil(u.role ?? 'ROLE_ALUNO'),
          turno: undefined,
          status: u.ativo ? 'ativo' : 'inativo',
          turmas: [],
        }));
        const merged = mergeAlunosTurmasFromApi(usuariosMapped, turmasApi);
        setTurmas(turmasMapped);
        setUsuarios(merged);
        setVinculos(vincRows);
        saveToStorage(turmasStorageKey, turmasMapped);
        saveToStorage(usersStorageKey, merged);
        saveToStorage(vinculosStorageKey, vincRows);
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!API_URL || isApiEnabled()) return;
    let cancelled = false;
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/api/usuarios?size=500`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const content = (data.content ?? data) as UsuarioApi[];
        const storedUsers = loadFromStorage<StoredUser[]>(usersStorageKey, defaultUsers);
        const turmasPorUsuario = new Map(storedUsers.map((u) => [u.id, u.turmas ?? []]));
        const mapped: StoredUser[] = content.map((u) => ({
          id: String(u.id),
          cpf: u.cpf ?? '',
          nome: u.nome ?? '',
          email: u.email ?? '',
          perfil: roleToPerfil(u.role ?? 'ROLE_ALUNO'),
          turno: (u as { turno?: string }).turno as StoredUser['turno'] | undefined,
          status: u.ativo ? 'ativo' : 'inativo',
          turmas:
            (u as { turmas?: string[] }).turmas ??
            turmasPorUsuario.get(String(u.id)) ??
            [],
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
      return professorTemAcessoTurma(String(user.id ?? ''), user.nome, turma, vinculos);
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
  const professoresDaTurmaRotulo = useMemo(() => {
    if (!turma) return '—';
    if (user?.perfil === UserProfile.PROFESSOR) {
      return user.nome?.trim() || '—';
    }
    const rotulo = rotuloProfessoresTurma(turma, vinculos, usuarios);
    return rotulo || '—';
  }, [turma, vinculos, usuarios, user]);

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
  const ehAlunoLogado = user?.perfil === UserProfile.ALUNO;
  const podeVerCpfCompleto = (alunoId: string) => !ehAlunoLogado || String(user?.id ?? '') === String(alunoId);
  const alunosFiltrados = useMemo(() => {
    const termo = buscaAluno.trim();
    if (!termo) return alunosDaTurma;
    if (ehAlunoLogado) {
      return alunosDaTurma.filter((aluno) => aluno.nome.toLowerCase().includes(termo.toLowerCase()));
    }
    return alunosDaTurma.filter((aluno) => alunoCombinaComBusca(aluno.nome, aluno.cpf, termo));
  }, [alunosDaTurma, buscaAluno, ehAlunoLogado]);
  const podeGerenciarAlunos =
    user?.perfil === UserProfile.ADMINISTRADOR ||
    user?.perfil === UserProfile.GESTOR ||
    user?.perfil === UserProfile.SECRETARIA;
  const turmasDestino = useMemo(
    () => turmas.filter((t) => t.id !== turma?.id),
    [turma?.id, turmas],
  );
  const resultadosBuscaVinculacao = useMemo(() => {
    const termo = buscaAluno.trim();
    if (!termo) return [];
    const alunosAtivos = usuarios.filter(
      (u) => u.perfil === UserProfile.ALUNO && u.status === 'ativo',
    );
    return alunosAtivos.filter((aluno) => alunoCombinaComBusca(aluno.nome, aluno.cpf, termo));
  }, [buscaAluno, usuarios]);
  const idsAlunosDaTurma = useMemo(
    () => new Set(alunosDaTurma.map((a) => a.id)),
    [alunosDaTurma],
  );
  const turmasPorAlunoId = useMemo(() => {
    const map = new Map<string, Set<string>>();
    usuarios.forEach((u) => {
      if (u.perfil !== UserProfile.ALUNO) return;
      const set = map.get(u.id) ?? new Set<string>();
      (u.turmas ?? []).forEach((nome) => {
        if (nome?.trim()) set.add(nome.trim());
      });
      map.set(u.id, set);
    });

    vinculos.forEach((v) => {
      const turmaNome = turmas.find((t) => t.id === v.turmaId)?.nome;
      if (!turmaNome) return;
      v.alunos.forEach((a) => {
        const set = map.get(a.alunoId) ?? new Set<string>();
        set.add(turmaNome);
        map.set(a.alunoId, set);
      });
    });

    return map;
  }, [usuarios, vinculos, turmas]);

  const handleVincularAluno = (aluno: StoredUser) => {
    if (!turma || !podeGerenciarAlunos) return;
    if (idsAlunosDaTurma.has(aluno.id)) return;
    const turmaConflitante = Array.from(turmasPorAlunoId.get(aluno.id) ?? []).find(
      (nomeTurma) => nomeTurma !== turma.nome,
    );
    if (turmaConflitante) {
      window.alert(
        `${aluno.nome} ja esta vinculado na turma ${turmaConflitante}. Use a opcao Migrar.`,
      );
      return;
    }

    const updatedUsuarios = usuarios.map((u) => {
      if (u.id !== aluno.id) return u;
      const turmasAluno = u.turmas ?? [];
      if (turmasAluno.includes(turma.nome)) return u;
      return { ...u, turmas: [...turmasAluno, turma.nome] };
    });
    setUsuarios(updatedUsuarios);
    if (!isApiEnabled()) {
      saveToStorage(usersStorageKey, updatedUsuarios);
    }

    const updatedTurmas = turmas.map((t) =>
      t.id === turma.id ? { ...t, alunos: t.alunos + 1 } : t,
    );
    setTurmas(updatedTurmas);
    if (!isApiEnabled()) {
      saveToStorage(turmasStorageKey, updatedTurmas);
    }

    if (isApiEnabled()) {
      const tid = Number(turma.id);
      if (Number.isFinite(tid)) {
        void getTurmaApi(tid)
          .then((current) => {
            const set = new Set((current.alunosIds ?? []).map((x) => Number(x)));
            set.add(Number(aluno.id));
            const profNum = Number(current.professorId ?? turma.professor);
            const turnoNum = Number(
              current.turnoId ?? turma.turnoId ?? turnoTipoParaIdPadrao(turma.turno),
            );
            return saveTurmaApi({
              id: tid,
              nome: current.nome ?? turma.nome,
              turnoId: Number.isFinite(turnoNum) ? turnoNum : undefined,
              status: current.status ?? turma.status,
              professorId: Number.isFinite(profNum) ? profNum : current.professorId ?? null,
              alunosIds: Array.from(set),
            });
          })
          .catch(() => null);
      }
    }

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
        if (!isApiEnabled()) {
          saveToStorage(vinculosStorageKey, updatedVinculos);
        }
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
    if (!isApiEnabled()) {
      saveToStorage(usersStorageKey, updatedUsuarios);
    }

    const updatedTurmas = turmas.map((t) =>
      t.id === turma.id ? { ...t, alunos: Math.max(0, t.alunos - 1) } : t,
    );
    setTurmas(updatedTurmas);
    if (!isApiEnabled()) {
      saveToStorage(turmasStorageKey, updatedTurmas);
    }

    if (isApiEnabled()) {
      const tid = Number(turma.id);
      if (Number.isFinite(tid)) {
        void getTurmaApi(tid)
          .then((current) => {
            const set = new Set((current.alunosIds ?? []).map((x) => Number(x)));
            set.delete(Number(alunoId));
            const profNum = Number(current.professorId ?? turma.professor);
            const turnoNum = Number(
              current.turnoId ?? turma.turnoId ?? turnoTipoParaIdPadrao(turma.turno),
            );
            return saveTurmaApi({
              id: tid,
              nome: current.nome ?? turma.nome,
              turnoId: Number.isFinite(turnoNum) ? turnoNum : undefined,
              status: current.status ?? turma.status,
              professorId: Number.isFinite(profNum) ? profNum : current.professorId ?? null,
              alunosIds: Array.from(set),
            });
          })
          .catch(() => null);
      }
    }

    const updatedVinculos = vinculos.map((v) =>
      v.turmaId === turma.id
        ? { ...v, alunos: v.alunos.filter((a) => a.alunoId !== alunoId) }
        : v,
    );
    setVinculos(updatedVinculos);
    if (!isApiEnabled()) {
      saveToStorage(vinculosStorageKey, updatedVinculos);
    }
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
    if (!isApiEnabled()) {
      saveToStorage(usersStorageKey, updatedUsuarios);
    }

    const updatedTurmas = turmas.map((t) => {
      if (t.id === turma.id) return { ...t, alunos: Math.max(0, t.alunos - 1) };
      if (t.id === destino.id) return { ...t, alunos: t.alunos + 1 };
      return t;
    });
    setTurmas(updatedTurmas);
    if (!isApiEnabled()) {
      saveToStorage(turmasStorageKey, updatedTurmas);
    }

    if (isApiEnabled()) {
      const tidOrig = Number(turma.id);
      const tidDest = Number(destino.id);
      if (Number.isFinite(tidOrig) && Number.isFinite(tidDest)) {
        void Promise.all([getTurmaApi(tidOrig), getTurmaApi(tidDest)])
          .then(([orig, dst]) => {
            const setOrig = new Set((orig.alunosIds ?? []).map((x) => Number(x)));
            setOrig.delete(Number(alunoId));
            const setDst = new Set((dst.alunosIds ?? []).map((x) => Number(x)));
            setDst.add(Number(alunoId));
            const profO = Number(orig.professorId ?? turma.professor);
            const profD = Number(dst.professorId ?? destino.professor);
            const turnoO = Number(orig.turnoId ?? turma.turnoId ?? turnoTipoParaIdPadrao(turma.turno));
            const turnoD = Number(dst.turnoId ?? destino.turnoId ?? turnoTipoParaIdPadrao(destino.turno));
            return Promise.all([
              saveTurmaApi({
                id: tidOrig,
                nome: orig.nome ?? turma.nome,
                turnoId: Number.isFinite(turnoO) ? turnoO : undefined,
                status: orig.status ?? turma.status,
                professorId: Number.isFinite(profO) ? profO : orig.professorId ?? null,
                alunosIds: Array.from(setOrig),
              }),
              saveTurmaApi({
                id: tidDest,
                nome: dst.nome ?? destino.nome,
                turnoId: Number.isFinite(turnoD) ? turnoD : undefined,
                status: dst.status ?? destino.status,
                professorId: Number.isFinite(profD) ? profD : dst.professorId ?? null,
                alunosIds: Array.from(setDst),
              }),
            ]);
          })
          .catch(() => null);
      }
    }

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
    if (!isApiEnabled()) {
      saveToStorage(vinculosStorageKey, updatedVinculos);
    }

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
            <CardContent className="text-xl font-semibold">{rotuloTurnoParaExibicao(turma)}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {user?.perfil === UserProfile.PROFESSOR ? 'Professor' : 'Professores'}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-base font-semibold leading-snug">{professoresDaTurmaRotulo}</CardContent>
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
                placeholder={ehAlunoLogado ? 'Buscar por nome' : 'Buscar por nome ou CPF'}
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
                      <TableCell>{podeVerCpfCompleto(aluno.id) ? aluno.cpf : cpfOculto}</TableCell>
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
                                    {destino.nome} ({rotuloTurnoParaExibicao(destino)})
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
            {podeGerenciarAlunos && resultadosBuscaVinculacao.length > 0 && (
              <div className="mt-4 border rounded-md p-3 space-y-2">
                <p className="text-sm font-medium">Resultados para vincular</p>
                {resultadosBuscaVinculacao.map((aluno) => {
                  const vinculado = idsAlunosDaTurma.has(aluno.id);
                  const turmaAtualAluno = Array.from(turmasPorAlunoId.get(aluno.id) ?? []).find(
                    (nomeTurma) => nomeTurma !== turma.nome,
                  );
                  const bloqueadoPorOutraTurma = Boolean(turmaAtualAluno);
                  return (
                    <div key={aluno.id} className="flex items-center justify-between gap-2 text-sm">
                      <div>
                        <p className="font-medium">{aluno.nome}</p>
                        <p className="text-muted-foreground">{aluno.cpf}</p>
                        {turmaAtualAluno && (
                          <p className="text-amber-600">
                            Ja vinculado a outra turma: {turmaAtualAluno}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={vinculado || bloqueadoPorOutraTurma ? 'secondary' : 'outline'}
                        disabled={vinculado || bloqueadoPorOutraTurma}
                        onClick={() => handleVincularAluno(aluno)}
                      >
                        {vinculado ? 'Ja vinculado' : bloqueadoPorOutraTurma ? 'Indisponivel' : 'Vincular'}
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
