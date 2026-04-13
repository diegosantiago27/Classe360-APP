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
import {
  deleteTurmaApi,
  isApiEnabled,
  listTurmasApi,
  listTurnosApi,
  listUsuariosApi,
  saveTurmaApi,
} from '@/lib/entityCrudApi';
import {
  TURNOS_PADRAO,
  idTurnoEfetivo,
  rotuloTurnoParaExibicao,
  turnoNomeParaTipo,
  turnoTipoParaIdPadrao,
  type TurnoOption,
} from '@/lib/turnosCatalog';
import { mergeAlunosTurmasFromApi } from '@/lib/turmasUsuariosMerge';
import { idsTurmasVisiveisParaProfessor, rotuloProfessoresTurma } from '@/lib/professorTurmaUtils';
import { loadVinculosDisciplinaTurma } from '@/lib/vinculosRelacional';

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
const parseNomeTurma = (nome: string) => {
  const anoNumero = nome.match(/(\d+)/)?.[1] ?? '';
  const letraTurma = nome.split(/\s+/).pop()?.replace(/[^a-zA-Z]/g, '').toUpperCase() ?? '';
  return { anoNumero, letraTurma };
};
const getSerieNumero = (nomeTurma: string) => nomeTurma.match(/(\d+)/)?.[1] ?? '';

function normalizeText(value?: string): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function isProfessorPerfil(perfil: unknown): boolean {
  if (perfil === UserProfile.PROFESSOR) return true;
  const normalized = String(perfil ?? '').trim().toUpperCase();
  return normalized === '3' || normalized === 'PROFESSOR' || normalized === 'ROLE_PROFESSOR';
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

const SELECT_SEM_PROFESSOR = '__none__';

/** Com a API, turma.professor vem como id; no mock costuma ser o nome. */
function normalizarCampoProfessorNoSelect(raw: string, usuarios: StoredUser[]): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const profs = usuarios.filter((u) => u.perfil === UserProfile.PROFESSOR);
  if (profs.some((p) => String(p.id) === trimmed)) return trimmed;
  const porNome = profs.find((p) => p.nome === trimmed);
  return porNome ? String(porNome.id) : trimmed;
}

function resolverProfessorIdParaApi(professorField: string, usuarios: StoredUser[]): number | null {
  const trimmed = professorField.trim();
  if (!trimmed) return null;
  const profs = usuarios.filter((u) => u.perfil === UserProfile.PROFESSOR);
  const porId = profs.find((p) => String(p.id) === trimmed);
  if (porId && Number.isFinite(Number(porId.id))) return Number(porId.id);
  const porNome = profs.find((p) => p.nome === trimmed);
  if (porNome && Number.isFinite(Number(porNome.id))) return Number(porNome.id);
  return null;
}

const Turmas: React.FC = () => {
  const { user } = useAuth();
  const podeCriarTurma =
    user?.perfil === UserProfile.GESTOR ||
    user?.perfil === UserProfile.ADMINISTRADOR ||
    user?.perfil === UserProfile.SECRETARIA;
  const podeVincularAlunosNaTurma =
    user?.perfil === UserProfile.GESTOR ||
    user?.perfil === UserProfile.ADMINISTRADOR ||
    user?.perfil === UserProfile.SECRETARIA;
  const podeEditarTurma =
    user?.perfil === UserProfile.GESTOR || user?.perfil === UserProfile.ADMINISTRADOR;
  const podeRemoverTurmaAdmin = user?.perfil === UserProfile.ADMINISTRADOR;
  const podeRemoverTurmaVazia = user?.perfil === UserProfile.SECRETARIA;
  const podeRemoverTurma = podeRemoverTurmaAdmin || podeRemoverTurmaVazia;
  const exibirColunaProfessores = user?.perfil !== UserProfile.ALUNO;
  const [turmas, setTurmas] = useState<Turma[]>(
    () => loadFromStorage<Turma[]>(turmasStorageKey, isApiEnabled() ? [] : defaultTurmas),
  );
  const [vinculos, setVinculos] = useState<DisciplinaVinculoStorage[]>(
    () => loadFromStorage<DisciplinaVinculoStorage[]>(vinculosStorageKey, []),
  );
  const [usuarios, setUsuarios] = useState<StoredUser[]>(
    () => loadFromStorage<StoredUser[]>(usersStorageKey, isApiEnabled() ? [] : defaultUsers),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nomeTurma, setNomeTurma] = useState('');
  const [anoSerie, setAnoSerie] = useState('');
  const [alunosSelecionados, setAlunosSelecionados] = useState<string[]>([]);
  const [alunoCpfBusca, setAlunoCpfBusca] = useState('');
  const [opcoesTurno, setOpcoesTurno] = useState<TurnoOption[]>(TURNOS_PADRAO);
  const [draft, setDraft] = useState<Omit<Turma, 'id'>>({
    nome: '',
    turno: 'Manha',
    turnoId: '1',
    turnoNome: 'Manhã',
    alunos: 0,
    professor: '',
    status: 'Ativa',
    proximaAula: '',
  });

  const refreshFromApi = () => {
    if (!isApiEnabled()) return Promise.resolve();
    return Promise.all([
      listTurmasApi(),
      listUsuariosApi(),
      listTurnosApi().catch(() => []),
    ])
      .then(([turmasApi, usuariosApi, turnosApi]) => {
        if (Array.isArray(turnosApi) && turnosApi.length > 0) {
          setOpcoesTurno(
            turnosApi.map((r) => ({
              id: r.id,
              codigo: r.codigo,
              nome: r.nome?.trim() ? r.nome : String(r.id),
            })),
          );
        }
        const usuariosMapped: StoredUser[] = usuariosApi.map((u) => ({
          id: String(u.id ?? ''),
          cpf: u.cpf ?? '',
          nome: u.nome ?? '',
          email: u.email ?? '',
          perfil: roleToPerfil(u.role ?? 'ROLE_ALUNO'),
          turno: undefined,
          status: u.ativo === false ? 'inativo' : 'ativo',
          turmas: [],
        }));
        const turmasMapped: Turma[] = turmasApi.map((t) => {
          const nomeTurno = t.turnoNome?.trim() ?? '';
          const tid =
            t.turnoId != null && Number.isFinite(Number(t.turnoId))
              ? String(t.turnoId)
              : turnoTipoParaIdPadrao(turnoNomeParaTipo(nomeTurno));
          return {
            id: String(t.id ?? createId('turma')),
            nome: t.nome ?? `Turma ${t.id ?? ''}`,
            turnoId: tid,
            turnoNome: nomeTurno || undefined,
            turno: turnoNomeParaTipo(nomeTurno),
            alunos: Array.isArray(t.alunosIds) ? t.alunosIds.length : 0,
            professor: t.professorId ? String(t.professorId) : '',
            status: (t.status as TurmaStatus) ?? 'Ativa',
            proximaAula: '',
          };
        });
        const usuariosComTurmas = mergeAlunosTurmasFromApi(usuariosMapped, turmasApi);
        setUsuarios(usuariosComTurmas);
        setTurmas(turmasMapped);
        saveToStorage(usersStorageKey, usuariosComTurmas);
        saveToStorage(turmasStorageKey, turmasMapped);
      })
      .catch(() => null);
  };

  useEffect(() => {
    if (isApiEnabled()) {
      void refreshFromApi().finally(() => {
        void loadVinculosDisciplinaTurma()
          .then((rows) => setVinculos(rows as DisciplinaVinculoStorage[]))
          .catch(() => setVinculos([]));
      });
      return;
    }
    const keys = [usersStorageKey, turmasStorageKey, vinculosStorageKey];
    void syncKeysFromBackend(keys).finally(() => {
      setUsuarios(loadFromStorage<StoredUser[]>(usersStorageKey, isApiEnabled() ? [] : defaultUsers));
      setTurmas(loadFromStorage<Turma[]>(turmasStorageKey, isApiEnabled() ? [] : defaultTurmas));
      setVinculos(loadFromStorage<DisciplinaVinculoStorage[]>(vinculosStorageKey, []));
    });
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
  const professoresDisponiveis = useMemo(
    () => usuarios.filter((u) => u.perfil === UserProfile.PROFESSOR && u.status === 'ativo'),
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

    if (isProfessorPerfil(user.perfil ?? (user as { role?: unknown }).role)) {
      const idAtual = String(user.id ?? '').trim();
      if (!idAtual) return [];
      const turmaIdsProfessor = idsTurmasVisiveisParaProfessor(turmas, vinculos, idAtual, user.nome);
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
    const usuarioPorId = new Map(usuarios.map((u) => [u.id, u]));

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
          (v.alunos ?? []).forEach((a) => {
            const usuario = usuarioPorId.get(a.alunoId);
            if (!usuario) {
              ids.add(a.alunoId);
              return;
            }
            if (usuario.perfil === UserProfile.ALUNO && usuario.status === 'ativo') {
              ids.add(a.alunoId);
            }
          });
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
  const turmasAtivas = useMemo(
    () => turmasVisiveis.filter((turma) => turma.status === 'Ativa').length,
    [turmasVisiveis],
  );
  const rotuloProfessoresPorTurmaId = useMemo(() => {
    const map = new Map<string, string>();
    turmas.forEach((t) => {
      const rotulo = rotuloProfessoresTurma(t, vinculos, usuarios);
      if (rotulo) map.set(t.id, rotulo);
    });
    return map;
  }, [turmas, vinculos, usuarios]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setNomeTurma('');
    setAnoSerie('');
    setAlunosSelecionados([]);
    setAlunoCpfBusca('');
    setDraft({
      nome: '',
      turno: 'Manha',
      turnoId: '1',
      turnoNome: 'Manhã',
      alunos: 0,
      professor: '',
      status: 'Ativa',
      proximaAula: '',
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (turma: Turma) => {
    setEditingId(turma.id);
    const parsed = parseNomeTurma(turma.nome);
    setNomeTurma(parsed.letraTurma);
    setAnoSerie(parsed.anoNumero);
    setAlunoCpfBusca('');
    setAlunosSelecionados(
      usuarios
        .filter((u) => u.perfil === UserProfile.ALUNO && (u.turmas ?? []).includes(turma.nome))
        .map((u) => u.id),
    );
    setDraft({
      nome: turma.nome,
      turno: turma.turno,
      turnoId: turma.turnoId ?? turnoTipoParaIdPadrao(turma.turno),
      turnoNome: turma.turnoNome ?? '',
      alunos: turma.alunos,
      professor: normalizarCampoProfessorNoSelect(turma.professor, usuarios),
      status: turma.status,
      proximaAula: turma.proximaAula,
    });
    setDialogOpen(true);
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    const letraTurma = nomeTurma.trim().replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 1);
    const anoNumero = anoSerie.trim().replace(/\D/g, '').slice(0, 2);
    if (!letraTurma || !anoNumero) return;
    const turmaNome = `${anoNumero}º Ano ${letraTurma}`;
    const nomeNormalizado = turmaNome.toLocaleLowerCase('pt-BR');
    const turmaDuplicada = turmas.some((turma) => {
      if (editingId && turma.id === editingId) return false;
      return (
        turma.nome.trim().toLocaleLowerCase('pt-BR') === nomeNormalizado &&
        idTurnoEfetivo(turma) === idTurnoEfetivo(draft as Pick<Turma, 'turnoId' | 'turno'>)
      );
    });
    if (turmaDuplicada) {
      const rotuloTurno =
        opcoesTurno.find((o) => String(o.id) === idTurnoEfetivo(draft as Pick<Turma, 'turnoId' | 'turno'>))?.nome ??
        draft.turnoNome ??
        draft.turno;
      window.alert(`Ja existe uma turma "${turmaNome}" no turno ${rotuloTurno}.`);
      return;
    }

    const oldTurmaNome = editingId
      ? turmas.find((turma) => turma.id === editingId)?.nome ?? null
      : null;

    const alunosEmSerieDiferente = alunosSelecionados
      .map((alunoId) => usuarios.find((u) => u.id === alunoId))
      .filter((u): u is StoredUser => Boolean(u))
      .filter((aluno) => {
        const turmasAtuais = (aluno.turmas ?? []).filter((t) => t !== (oldTurmaNome ?? ''));
        return turmasAtuais.some((turmaAtualNome) => {
          const serieAtual = getSerieNumero(turmaAtualNome);
          if (!serieAtual || !anoNumero) return false;
          return serieAtual !== anoNumero;
        });
      });
    if (alunosEmSerieDiferente.length > 0) {
      const nomes = alunosEmSerieDiferente.map((a) => a.nome).join(', ');
      window.alert(
        `Nao e permitido vincular aluno em duas series diferentes ao mesmo tempo. Ajuste os alunos: ${nomes}.`,
      );
      return;
    }

    const professorIdNum = resolverProfessorIdParaApi(draft.professor, usuarios);
    if (isApiEnabled() && professorIdNum == null) {
      window.alert('Selecione o professor responsavel pela turma.');
      return;
    }

    const turnoIdNum = Number(draft.turnoId);
    if (isApiEnabled() && !Number.isFinite(turnoIdNum)) {
      window.alert('Selecione o turno da turma.');
      return;
    }

    const opcaoTurnoSelecionada = opcoesTurno.find((o) => String(o.id) === String(draft.turnoId));
    const turnoNomePersist = opcaoTurnoSelecionada?.nome ?? draft.turnoNome ?? '';
    const turnoTipoPersist = opcaoTurnoSelecionada
      ? turnoNomeParaTipo(opcaoTurnoSelecionada.nome)
      : draft.turno;

    const professorRotuloArmazenamento =
      professoresDisponiveis.find((p) => String(p.id) === draft.professor.trim())?.nome ??
      draft.professor.trim();

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
    if (!isApiEnabled()) {
      setUsuarios(updatedUsers);
      saveToStorage(usersStorageKey, updatedUsers);
    }

    if (editingId) {
      const updated = turmas.map((turma) =>
        turma.id === editingId
          ? {
              ...turma,
              ...draft,
              nome: turmaNome,
              alunos: alunosSelecionados.length,
              professor: professorRotuloArmazenamento,
              turnoId: String(draft.turnoId),
              turnoNome: turnoNomePersist,
              turno: turnoTipoPersist,
            }
          : turma,
      );
      if (isApiEnabled()) {
        const alunosIdsNum = alunosSelecionados
          .map((id) => Number(id))
          .filter((n) => Number.isFinite(n));
        const turmaIdNum = Number(editingId);
        void saveTurmaApi({
          id: Number.isFinite(turmaIdNum) ? turmaIdNum : undefined,
          nome: turmaNome,
          turnoId: turnoIdNum,
          status: draft.status,
          professorId: professorIdNum,
          alunosIds: alunosIdsNum,
        })
          .then(() => refreshFromApi())
          .catch((err) =>
            window.alert(
              `Não foi possível salvar a turma. ${err instanceof Error ? err.message : 'Verifique a API e tente novamente.'}`,
            ),
          );
      } else {
        setTurmas(updated);
        saveToStorage(turmasStorageKey, updated);
      }
    } else {
      const newTurmas = [
        ...turmas,
        {
          id: createId('turma'),
          ...draft,
          nome: turmaNome,
          alunos: alunosSelecionados.length,
          professor: professorRotuloArmazenamento,
          turnoId: String(draft.turnoId),
          turnoNome: turnoNomePersist,
          turno: turnoTipoPersist,
        },
      ];
      if (isApiEnabled()) {
        const alunosIdsNum = alunosSelecionados
          .map((id) => Number(id))
          .filter((n) => Number.isFinite(n));
        void saveTurmaApi({
          nome: turmaNome,
          turnoId: turnoIdNum,
          status: draft.status,
          professorId: professorIdNum,
          alunosIds: alunosIdsNum,
        })
          .then(() => refreshFromApi())
          .catch((err) =>
            window.alert(
              `Não foi possível salvar a turma. ${err instanceof Error ? err.message : 'Verifique a API e tente novamente.'}`,
            ),
          );
      } else {
        setTurmas(newTurmas);
        saveToStorage(turmasStorageKey, newTurmas);
      }
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
    if (isApiEnabled()) {
      const turmaIdNum = Number(turma.id);
      if (Number.isFinite(turmaIdNum)) {
        void deleteTurmaApi(turmaIdNum)
          .then(() => refreshFromApi())
          .catch(() => window.alert('Não foi possível remover a turma. Verifique a API e tente novamente.'));
      }
      return;
    }
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
              {exibirColunaProfessores ? (
                <>
                  Lista consolidada por turma. A coluna Professores reúne o responsável pela turma e os docentes
                  vinculados por disciplina (cadastro em Disciplinas).
                </>
              ) : (
                <>Suas turmas vinculadas, turno, quantidade de alunos e status.</>
              )}
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
                    {exibirColunaProfessores && (
                      <TableHead>
                        {isProfessorPerfil(user?.perfil ?? (user as { role?: unknown }).role)
                          ? 'Professor'
                          : 'Professores'}
                      </TableHead>
                    )}
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
                      <TableCell>{rotuloTurnoParaExibicao(turma)}</TableCell>
                      {exibirColunaProfessores && (
                        <TableCell className="max-w-[280px] whitespace-normal text-sm">
                          {isProfessorPerfil(user?.perfil ?? (user as { role?: unknown }).role)
                            ? user?.nome?.trim() || '—'
                            : rotuloProfessoresPorTurmaId.get(turma.id) ?? '—'}
                        </TableCell>
                      )}
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="nome-turma">Nome da Turma</Label>
                <Input
                  id="nome-turma"
                  value={nomeTurma}
                  onChange={(event) =>
                    setNomeTurma(
                      event.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 1),
                    )
                  }
                  placeholder="Ex: A"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ano-serie">Ano/Serie</Label>
                <Input
                  id="ano-serie"
                  value={anoSerie}
                  onChange={(event) => setAnoSerie(event.target.value.replace(/\D/g, '').slice(0, 2))}
                  placeholder="Ex: 6"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="turno">Turno</Label>
                <Select
                  value={draft.turnoId ?? turnoTipoParaIdPadrao(draft.turno)}
                  onValueChange={(value) => {
                    const row = opcoesTurno.find((o) => String(o.id) === value);
                    setDraft((prev) => ({
                      ...prev,
                      turnoId: value,
                      turno: row ? turnoNomeParaTipo(row.nome) : prev.turno,
                      turnoNome: row?.nome ?? prev.turnoNome,
                    }));
                  }}
                >
                  <SelectTrigger id="turno">
                    <SelectValue placeholder="Selecione o turno" />
                  </SelectTrigger>
                  <SelectContent>
                    {opcoesTurno.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(podeCriarTurma || podeEditarTurma) && (
              <div className="space-y-2">
                <Label htmlFor="professor-turma">Professor responsavel</Label>
                <Select
                  value={draft.professor ? draft.professor : SELECT_SEM_PROFESSOR}
                  onValueChange={(value) =>
                    setDraft((prev) => ({
                      ...prev,
                      professor: value === SELECT_SEM_PROFESSOR ? '' : value,
                    }))
                  }
                >
                  <SelectTrigger id="professor-turma">
                    <SelectValue placeholder="Selecione o professor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_SEM_PROFESSOR}>
                      {isApiEnabled() ? 'Selecione...' : 'Nenhum'}
                    </SelectItem>
                    {professoresDisponiveis.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {professoresDisponiveis.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Cadastre um usuario com perfil Professor para vincular aqui.
                  </p>
                )}
              </div>
            )}
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
