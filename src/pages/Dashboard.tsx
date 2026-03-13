import React, { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile, getProfileLabel } from '@/types/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import QuickAccessCard from '@/components/common/QuickAccessCard';
import StatCard from '@/components/common/StatCard';
import { loadFromStorage } from '@/lib/mockStorage';
import { defaultUsers, usersStorageKey, StoredUser } from '@/lib/mockUsers';
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
  const users = useMemo(
    () => loadFromStorage<StoredUser[]>(usersStorageKey, defaultUsers),
    []
  );
  const turmas = useMemo(
    () => loadFromStorage<Turma[]>('school-compass:turmas', []),
    []
  );
  const notas = useMemo(
    () => loadFromStorage<NotaLancamento[]>('school-compass:notas', []),
    []
  );
  const frequencias = useMemo(
    () => loadFromStorage<FrequenciaRegistro[]>('school-compass:frequencia', []),
    []
  );
  const provas = useMemo(
    () => loadFromStorage<Prova[]>('school-compass:provas', []),
    []
  );
  const avisos = useMemo(
    () => loadFromStorage<Aviso[]>('school-compass:avisos', []),
    []
  );
  const minhasNotas = useMemo(
    () => loadFromStorage<NotaAluno[]>('school-compass:minhas-notas', []),
    []
  );
  const minhaFrequencia = useMemo(
    () => loadFromStorage<FrequenciaAluno[]>('school-compass:minha-frequencia', []),
    []
  );

  const totalAlunos = useMemo(
    () => users.filter((item) => item.perfil === UserProfile.ALUNO).length,
    [users]
  );
  const totalProfessores = useMemo(
    () => users.filter((item) => item.perfil === UserProfile.PROFESSOR).length,
    [users]
  );
  const frequenciaMedia = useMemo(() => {
    if (frequencias.length === 0) return 0;
    return (
      Math.round(
        frequencias.reduce((acc, item) => acc + item.presencas, 0) / frequencias.length
      ) || 0
    );
  }, [frequencias]);
  const notasPendentes = useMemo(
    () => notas.filter((item) => item.status === 'Pendente').length,
    [notas]
  );
  const mediaNotas = useMemo(() => {
    if (notas.length === 0) return 0;
    const base = notas.reduce(
      (acc, item) => acc + (item.status === 'Concluida' ? 8 : 6.5),
      0
    );
    return Math.round((base / notas.length) * 10) / 10;
  }, [notas]);
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
    () => provas.filter((item) => item.status === 'Agendada').length,
    [provas]
  );
  const materiasAluno = useMemo(() => minhasNotas.length, [minhasNotas]);

  const avisosRecentes = useMemo(() => {
    return avisos.slice(0, 3);
  }, [avisos]);

  const proximosEventos = useMemo(() => {
    const parsed = provas
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
  }, [provas]);

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
              value={turmas.length}
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
