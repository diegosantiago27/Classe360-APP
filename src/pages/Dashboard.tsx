import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile, getProfileLabel } from '@/types/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import QuickAccessCard from '@/components/common/QuickAccessCard';
import StatCard from '@/components/common/StatCard';
import { loadFromStorage, syncKeysFromBackend } from '@/lib/mockStorage';
import { defaultUsers, usersStorageKey, StoredUser } from '@/lib/mockUsers';
import {
  isApiEnabled,
  listAvisosApi,
  listFrequenciasApi,
  listNotasApi,
  listProvasApi,
  listTurmasApi,
  listUsuariosApi,
} from '@/lib/entityCrudApi';
import {
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  Calendar,
  FileText,
  Bell,
  TrendingUp,
  UserCheck,
  Award,
} from 'lucide-react';

interface Turma {
  alunos: number;
}

interface NotaLancamento {
  status: 'Pendente' | 'Concluida';
}

interface FrequenciaRegistro {
  presencas: number;
}

interface Prova {
  id?: string;
  data: string;
  horario: string;
  titulo: string;
  status: 'Agendada' | 'Rascunho' | 'Concluida';
}

interface Aviso {
  titulo: string;
  data: string;
  nivel: 'Informativo' | 'Urgente' | 'Lembrete';
}

interface NotaAluno {
  media: number;
}

interface FrequenciaAluno {
  presenca: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [storageTick, setStorageTick] = useState(0);
  const [apiSnapshot, setApiSnapshot] = useState<{
    users: StoredUser[];
    turmas: Turma[];
    notas: NotaLancamento[];
    frequencias: FrequenciaRegistro[];
    provas: Prova[];
    avisos: Aviso[];
  } | null>(null);

  useEffect(() => {
    if (!isApiEnabled()) return;
    void syncKeysFromBackend([
      usersStorageKey,
      'school-compass:turmas',
      'school-compass:frequencia',
      'school-compass:avisos',
      'school-compass:minhas-notas',
      'school-compass:minha-frequencia',
    ]).finally(() => setStorageTick((prev) => prev + 1));
  }, []);

  useEffect(() => {
    if (!isApiEnabled()) return;
    void Promise.all([
      listUsuariosApi(),
      listTurmasApi(),
      listNotasApi(),
      listFrequenciasApi(),
      listProvasApi(),
      listAvisosApi(),
    ])
      .then(([usuariosApi, turmasApi, notasApi, frequenciasApi, provasApi, avisosApi]) => {
        const usersMapped: StoredUser[] = usuariosApi.map((u) => {
          const role = String(u.role ?? '').toUpperCase();
          let perfil = UserProfile.ALUNO;
          if (role.includes('GESTOR')) perfil = UserProfile.GESTOR;
          else if (role.includes('ADMIN')) perfil = UserProfile.ADMINISTRADOR;
          else if (role.includes('SECRETARIA')) perfil = UserProfile.SECRETARIA;
          else if (role.includes('PROFESSOR')) perfil = UserProfile.PROFESSOR;
          return {
            id: String(u.id ?? ''),
            cpf: '',
            nome: '',
            email: '',
            perfil,
            status: 'ativo',
          };
        });

        const turmasMapped: Turma[] = turmasApi.map((t) => ({
          alunos: Array.isArray(t.alunosIds) ? t.alunosIds.length : 0,
        }));

        const notasMapped: NotaLancamento[] = notasApi.map((n) => ({
          status: n.valor == null ? 'Pendente' : 'Concluida',
        }));

        const frequenciasMapped: FrequenciaRegistro[] = frequenciasApi.map((f) => ({
          presencas: f.presente ? 100 : 0,
        }));

        const provasMapped: Prova[] = provasApi.map((p) => ({
          id: String(p.id ?? ''),
          data: p.data ?? '',
          horario: p.horario ?? '',
          titulo: p.titulo ?? '',
          status:
            p.status === 'Concluida' || p.status === 'Rascunho' || p.status === 'Agendada'
              ? p.status
              : 'Agendada',
        }));

        const avisosMapped: Aviso[] = avisosApi.map((a) => {
          const conteudo = a.conteudo ?? '';
          const nivel =
            conteudo.includes('[NIVEL:Urgente]')
              ? 'Urgente'
              : conteudo.includes('[NIVEL:Lembrete]')
                ? 'Lembrete'
                : 'Informativo';
          const data = a.dataCriacao
            ? new Date(a.dataCriacao).toLocaleDateString('pt-BR')
            : new Date().toLocaleDateString('pt-BR');
          return {
            titulo: a.titulo ?? '',
            data,
            nivel,
          };
        });

        setApiSnapshot({
          users: usersMapped,
          turmas: turmasMapped,
          notas: notasMapped,
          frequencias: frequenciasMapped,
          provas: provasMapped,
          avisos: avisosMapped,
        });
      })
      .catch(() => null);
  }, []);

  const users = useMemo(
    () => loadFromStorage<StoredUser[]>(usersStorageKey, isApiEnabled() ? [] : defaultUsers),
    [storageTick]
  );
  const turmas = useMemo(
    () => loadFromStorage<Turma[]>('school-compass:turmas', []),
    [storageTick]
  );
  const notas = useMemo(
    () => loadFromStorage<NotaLancamento[]>('school-compass:notas', []),
    [storageTick]
  );
  const frequencias = useMemo(
    () => loadFromStorage<FrequenciaRegistro[]>('school-compass:frequencia', []),
    [storageTick]
  );
  const provas = useMemo(
    () => loadFromStorage<Prova[]>('school-compass:provas', []),
    [storageTick]
  );
  const avisos = useMemo(
    () => loadFromStorage<Aviso[]>('school-compass:avisos', []),
    [storageTick]
  );
  const minhasNotas = useMemo(
    () => loadFromStorage<NotaAluno[]>('school-compass:minhas-notas', []),
    [storageTick]
  );
  const minhaFrequencia = useMemo(
    () => loadFromStorage<FrequenciaAluno[]>('school-compass:minha-frequencia', []),
    [storageTick]
  );
  const usersFonte = isApiEnabled() ? (apiSnapshot?.users ?? []) : users;
  const turmasFonte = isApiEnabled() ? (apiSnapshot?.turmas ?? []) : turmas;
  const notasFonte = isApiEnabled() ? (apiSnapshot?.notas ?? []) : notas;
  const frequenciasFonte = isApiEnabled() ? (apiSnapshot?.frequencias ?? []) : frequencias;
  const provasFonte = isApiEnabled() ? (apiSnapshot?.provas ?? []) : provas;
  const avisosFonte = isApiEnabled() ? (apiSnapshot?.avisos ?? []) : avisos;

  const totalAlunos = useMemo(
    () => usersFonte.filter((item) => item.perfil === UserProfile.ALUNO).length,
    [usersFonte]
  );
  const totalProfessores = useMemo(
    () => usersFonte.filter((item) => item.perfil === UserProfile.PROFESSOR).length,
    [usersFonte]
  );
  const frequenciaMedia = useMemo(() => {
    if (frequenciasFonte.length === 0) return 0;
    return (
      Math.round(
        frequenciasFonte.reduce((acc, item) => acc + item.presencas, 0) / frequenciasFonte.length
      ) || 0
    );
  }, [frequenciasFonte]);
  const notasPendentes = useMemo(
    () => notasFonte.filter((item) => item.status === 'Pendente').length,
    [notasFonte]
  );
  const mediaNotas = useMemo(() => {
    if (notasFonte.length === 0) return 0;
    const base = notasFonte.reduce(
      (acc, item) => acc + (item.status === 'Concluida' ? 8 : 6.5),
      0
    );
    return Math.round((base / notasFonte.length) * 10) / 10;
  }, [notasFonte]);
  const mediaAluno = useMemo(() => {
    if (minhasNotas.length === 0) return 0;
    return (
      Math.round(
        (minhasNotas.reduce((acc, item) => acc + item.media, 0) / minhasNotas.length) * 10
      ) / 10
    );
  }, [minhasNotas]);
  const frequenciaAluno = useMemo(() => {
    if (minhaFrequencia.length === 0) return 0;
    return (
      Math.round(
        minhaFrequencia.reduce((acc, item) => acc + item.presenca, 0) / minhaFrequencia.length
      ) || 0
    );
  }, [minhaFrequencia]);
  const provasAgendadas = useMemo(
    () => provasFonte.filter((item) => item.status === 'Agendada').length,
    [provasFonte]
  );
  const materiasAluno = useMemo(() => minhasNotas.length, [minhasNotas]);

  const avisosRecentes = useMemo(() => {
    return avisosFonte.slice(0, 3);
  }, [avisosFonte]);

  const proximosEventos = useMemo(() => {
    const parsed = provasFonte
      .filter((item) => item.status === 'Agendada')
      .map((item) => {
        const date = new Date(item.data);
        return {
          ...item,
          date,
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    return parsed.slice(0, 3);
  }, [provasFonte]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const getQuickAccessCards = () => {
    const cards = [];

    if (user?.perfil === UserProfile.GESTOR || user?.perfil === UserProfile.ADMINISTRADOR) {
      cards.push(
        {
          icon: Users,
          title: 'Usuários',
          description: 'Gerenciar alunos, professores e funcionários',
          to: '/usuario-listar',
          variant: 'admin' as const,
        },
        {
          icon: BookOpen,
          title: 'Turmas',
          description: 'Visualizar e gerenciar turmas',
          to: '/turmas',
          variant: 'professor' as const,
        },
        {
          icon: Calendar,
          title: 'Agenda Semanal',
          description: 'Visualizar aulas por disciplina e turma',
          to: '/agenda-semanal',
          variant: 'primary' as const,
        }
      );
    }

    if (user?.perfil === UserProfile.SECRETARIA) {
      cards.push(
        {
          icon: Users,
          title: 'Usuários',
          description: 'Consultar dados cadastrais de alunos e professores',
          to: '/usuario-listar',
          variant: 'admin' as const,
        },
        {
          icon: BookOpen,
          title: 'Turmas',
          description: 'Consultar turmas',
          to: '/turmas',
          variant: 'professor' as const,
        },
        {
          icon: Calendar,
          title: 'Períodos',
          description: 'Consultar períodos',
          to: '/periodos',
          variant: 'primary' as const,
        },
        {
          icon: Calendar,
          title: 'Agenda Semanal',
          description: 'Visualizar aulas por disciplina e turma',
          to: '/agenda-semanal',
          variant: 'primary' as const,
        },
        {
          icon: ClipboardList,
          title: 'Notas',
          description: 'Consultar notas dos alunos',
          to: '/notas',
          variant: 'primary' as const,
        },
        {
          icon: Calendar,
          title: 'Frequência',
          description: 'Consultar frequência dos alunos',
          to: '/frequencia',
          variant: 'primary' as const,
        }
      );
    }

    if (
      user?.perfil === UserProfile.GESTOR ||
      user?.perfil === UserProfile.ADMINISTRADOR ||
      user?.perfil === UserProfile.PROFESSOR
    ) {
      cards.push(
        {
          icon: GraduationCap,
          title: 'Painel do Professor',
          description: 'Acessar funções de docência',
          to: '/professor-dashboard',
          variant: 'professor' as const,
        },
        {
          icon: ClipboardList,
          title: 'Lançar Notas',
          description: 'Registrar notas dos alunos',
          to: '/notas',
          variant: 'primary' as const,
        },
        {
          icon: Calendar,
          title: 'Frequência',
          description: 'Registrar presença dos alunos',
          to: '/frequencia',
          variant: 'primary' as const,
        },
        {
          icon: FileText,
          title: 'Provas',
          description: 'Criar e gerenciar provas',
          to: '/provas',
          variant: 'aluno' as const,
        }
      );
    }

    if (
      user?.perfil === UserProfile.GESTOR ||
      user?.perfil === UserProfile.ADMINISTRADOR ||
      user?.perfil === UserProfile.ALUNO
    ) {
      cards.push({
        icon: GraduationCap,
        title: 'Painel do Aluno',
        description: 'Acessar informações acadêmicas',
        to: '/aluno-dashboard',
        variant: 'aluno' as const,
      });
    }

    cards.push({
      icon: Bell,
      title: 'Avisos',
      description: 'Ver avisos e comunicados',
      to: '/avisos',
      variant: 'primary' as const,
    });

    return cards;
  };

  const quickAccessCards = getQuickAccessCards();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="font-display font-bold text-3xl text-foreground mb-2">
            {getGreeting()}, {user?.nome.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground">
            Você está logado como{' '}
            <span className="font-medium text-foreground">
              {user && getProfileLabel(user.perfil)}
            </span>
            . Aqui está um resumo do seu painel.
          </p>
        </div>

        {/* Stats */}
        {(user?.perfil === UserProfile.GESTOR ||
          user?.perfil === UserProfile.ADMINISTRADOR) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              title="Total de Alunos"
              value={totalAlunos}
              variant="primary"
              delay={0}
            />
            <StatCard
              icon={GraduationCap}
              title="Professores"
              value={totalProfessores}
              variant="accent"
              delay={100}
            />
            <StatCard
              icon={UserCheck}
              title="Frequência Média"
              value={`${frequenciaMedia}%`}
              variant="success"
              delay={200}
            />
            <StatCard
              icon={Award}
              title="Média Geral"
              value={mediaNotas || 0}
              variant="warning"
              delay={300}
            />
          </div>
        )}

        {user?.perfil === UserProfile.PROFESSOR && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={BookOpen}
              title="Minhas Turmas"
              value={turmasFonte.length}
              variant="primary"
              delay={0}
            />
            <StatCard
              icon={Users}
              title="Total de Alunos"
              value={totalAlunos}
              variant="accent"
              delay={100}
            />
            <StatCard
              icon={ClipboardList}
              title="Notas Pendentes"
              value={notasPendentes}
              variant="warning"
              delay={200}
            />
            <StatCard
              icon={TrendingUp}
              title="Média das Turmas"
              value={mediaNotas || 0}
              variant="success"
              delay={300}
            />
          </div>
        )}

        {user?.perfil === UserProfile.ALUNO && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Award}
              title="Média Geral"
              value={mediaAluno || 0}
              variant="success"
              delay={0}
            />
            <StatCard
              icon={UserCheck}
              title="Frequência"
              value={`${frequenciaAluno}%`}
              variant="primary"
              delay={100}
            />
            <StatCard
              icon={BookOpen}
              title="Matérias"
              value={materiasAluno}
              variant="accent"
              delay={200}
            />
            <StatCard
              icon={FileText}
              title="Provas Próximas"
              value={provasAgendadas}
              variant="warning"
              delay={300}
            />
          </div>
        )}

        {/* Quick Access */}
        <div>
          <h2 className="font-display font-semibold text-xl text-foreground mb-4">
            Acesso Rápido
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {quickAccessCards.map((card, index) => (
              <QuickAccessCard
                key={card.to}
                icon={card.icon}
                title={card.title}
                description={card.description}
                to={card.to}
                variant={card.variant}
                delay={index * 100}
              />
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Notices */}
          <div className="bg-card rounded-xl p-6 border border-border/50 animate-slide-up">
            <h3 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Avisos Recentes
            </h3>
            <div className="space-y-3">
              {avisosRecentes.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Nenhum aviso cadastrado ainda.
                </div>
              ) : (
                avisosRecentes.map((notice, index) => (
                  <div
                    key={`${notice.titulo}-${index}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {notice.nivel === 'Urgente' && (
                        <span className="w-2 h-2 rounded-full bg-destructive" />
                      )}
                      <span className="text-sm font-medium">{notice.titulo}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {notice.data}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Calendar Preview */}
          <div className="bg-card rounded-xl p-6 border border-border/50 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <h3 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" />
              Próximos Eventos
            </h3>
            <div className="space-y-3">
              {proximosEventos.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Nenhum evento agendado.
                </div>
              ) : (
                proximosEventos.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="text-center min-w-[70px]">
                      <p className="text-xs text-muted-foreground">
                        {Number.isNaN(event.date.getTime())
                          ? event.data
                          : event.date.toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-sm font-semibold text-primary">
                        {event.horario}
                      </p>
                    </div>
                    <span className="text-sm font-medium">{event.titulo}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
