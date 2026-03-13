import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Plus, Trash2, Link2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/auth';
import { loadFromStorage, saveToStorage } from '@/lib/mockStorage';
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

interface AlunoVinculado {
  alunoId: string;
  alunoNome: string;
  turno?: 'Manha' | 'Tarde' | 'Noite';
  ano?: string;
  serie?: string;
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
        const storedUsers = loadFromStorage<StoredUser[]>(usersStorageKey, defaultUsers);
        const turmasPorUsuario = new Map(
          storedUsers.map((u) => [u.id, u.turmas ?? []]),
        );
        const mapped: StoredUser[] = content.map((u) => ({
          id: String(u.id),
          cpf: u.cpf ?? '',
          nome: u.nome ?? '',
          email: u.email ?? '',
          perfil: roleToPerfil(u.role ?? 'ROLE_ALUNO'),
          turno: (u as { turno?: string }).turno as StoredUser['turno'] | undefined,
          status: u.ativo ? 'ativo' : 'inativo',
          // API pode não retornar turmas; mantém vínculo local para não perder contagem
          turmas:
            (u as { turmas?: string[] }).turmas ??
            turmasPorUsuario.get(String(u.id)) ??
            [],
        }));
        setUsuarios(mapped);
      })
      .catch(() => !cancelled && setUsuarios(loadFromStorage<StoredUser[]>(usersStorageKey, defaultUsers)));
    return () => {
      cancelled = true;
    };
  }, []);

  const [turmas] = useState<Turma[]>(
    () => loadFromStorage<Turma[]>(turmasStorageKey, defaultTurmas),
  );

  const total = useMemo(() => disciplinas.length, [disciplinas]);
  const totalComProfessor = useMemo(
    () => vinculos.filter((v) => Boolean(v.professorId)).length,
    [vinculos],
  );
  const getAlunosVinculadosCount = (v: DisciplinaVinculo) => {
    const ids = new Set<string>();
    (v.alunos ?? []).forEach((a) => ids.add(a.alunoId));
    usuarios.forEach((u) => {
      if (u.perfil !== UserProfile.ALUNO || u.status !== 'ativo') return;
      if ((u.turmas ?? []).includes(v.turmaNome)) {
        ids.add(u.id);
      }
    });
    return ids.size;
  };

  const totalAlunosVinculados = useMemo(
    () => vinculos.reduce((acc, item) => acc + getAlunosVinculadosCount(item), 0),
    [vinculos, usuarios],
  );
  const handleDelete = (item: CatalogItem) => {
    const confirmed = window.confirm(`Deseja remover a disciplina "${item.nome}"?`);
    if (!confirmed) return;
    const updated = disciplinas.filter((row) => row.id !== item.id);
    setDisciplinas(updated);
    saveToStorage(disciplinasStorageKey, updated);
  };

  const getVinculos = (disciplinaId: string) =>
    vinculos.filter((v) => v.disciplinaId === disciplinaId);

  const getTurnoAnoSerie = (v: DisciplinaVinculo) => {
    const turma = turmas.find((t) => t.id === v.turmaId);
    const anoMatch = turma?.nome.match(/(\d+)/);
    const ano = anoMatch ? anoMatch[1] : '';
    const letraSerie = turma?.nome.split(/\s+/).pop() ?? '';
    const turno = turma?.turno ?? '';
    const a = v.alunos[0];
    const temDadosAluno = a && a.turno != null && a.ano != null && a.serie != null;
    if (temDadosAluno) {
      return `${a.turno} - ${a.ano} - ${a.serie}`;
    }
    if (!turma) return '-';
    return `${turno} - ${ano} - ${letraSerie}`;
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
                            <span className="text-foreground font-medium">{getAlunosVinculadosCount(v)}</span>
                          </p>
                          <p>
                            Turno/Ano/Serie:{' '}
                            <span className="text-foreground font-medium">
                              {getTurnoAnoSerie(v)}
                            </span>
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
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
    </DashboardLayout>
  );
};

export default Disciplinas;
