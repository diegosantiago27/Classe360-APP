import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile, getProfileLabel } from '@/types/auth';
import {
  Home,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  ClipboardList,
  Bell,
  UserCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  profiles: UserProfile[];
}

const navItems: NavItem[] = [
  {
    icon: Home,
    label: 'Início',
    path: '/index',
    profiles: [UserProfile.GESTOR, UserProfile.ADMINISTRADOR, UserProfile.PROFESSOR, UserProfile.ALUNO],
  },
  {
    icon: LayoutDashboard,
    label: 'Painel do Professor',
    path: '/professor-dashboard',
    profiles: [UserProfile.GESTOR, UserProfile.ADMINISTRADOR, UserProfile.PROFESSOR],
  },
  {
    icon: GraduationCap,
    label: 'Painel do Aluno',
    path: '/aluno-dashboard',
    profiles: [UserProfile.GESTOR, UserProfile.ADMINISTRADOR, UserProfile.ALUNO],
  },
  {
    icon: Users,
    label: 'Usuários',
    path: '/usuario-listar',
    profiles: [UserProfile.GESTOR, UserProfile.ADMINISTRADOR],
  },
  {
    icon: BookOpen,
    label: 'Turmas',
    path: '/turmas',
    profiles: [UserProfile.GESTOR, UserProfile.ADMINISTRADOR, UserProfile.PROFESSOR],
  },
  {
    icon: BookOpen,
    label: 'Minhas Matérias',
    path: '/minhas-materias',
    profiles: [UserProfile.ALUNO],
  },
  {
    icon: BookOpen,
    label: 'Disciplinas',
    path: '/disciplinas',
    profiles: [UserProfile.GESTOR, UserProfile.ADMINISTRADOR],
  },
  {
    icon: Calendar,
    label: 'Períodos',
    path: '/periodos',
    profiles: [UserProfile.GESTOR, UserProfile.ADMINISTRADOR],
  },
  {
    icon: ClipboardList,
    label: 'Notas',
    path: '/notas',
    profiles: [UserProfile.GESTOR, UserProfile.ADMINISTRADOR, UserProfile.PROFESSOR],
  },
  {
    icon: Calendar,
    label: 'Frequência',
    path: '/frequencia',
    profiles: [UserProfile.GESTOR, UserProfile.ADMINISTRADOR, UserProfile.PROFESSOR],
  },
  {
    icon: ClipboardList,
    label: 'Atividades',
    path: '/atividades',
    profiles: [UserProfile.GESTOR, UserProfile.ADMINISTRADOR, UserProfile.PROFESSOR],
  },
  {
    icon: FileText,
    label: 'Provas',
    path: '/provas',
    profiles: [UserProfile.GESTOR, UserProfile.ADMINISTRADOR, UserProfile.PROFESSOR],
  },
  {
    icon: Bell,
    label: 'Avisos',
    path: '/avisos',
    profiles: [UserProfile.GESTOR, UserProfile.ADMINISTRADOR, UserProfile.PROFESSOR, UserProfile.ALUNO],
  },
];

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const filteredNavItems = navItems.filter(
    item => user && item.profiles.includes(user.perfil)
  );

  const getProfileColorClass = (perfil: UserProfile) => {
    switch (perfil) {
      case UserProfile.GESTOR:
        return 'bg-gestor';
      case UserProfile.ADMINISTRADOR:
        return 'bg-admin';
      case UserProfile.PROFESSOR:
        return 'bg-professor';
      case UserProfile.ALUNO:
        return 'bg-aluno';
      default:
        return 'bg-primary';
    }
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen gradient-sidebar transition-all duration-300 flex flex-col',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-sidebar-foreground">
              EduGestão
            </span>
          </div>
        )}
        {collapsed && (
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center mx-auto">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
        )}
      </div>

      {/* User Info */}
      {user && (
        <div className={cn(
          'p-4 border-b border-sidebar-border',
          collapsed ? 'flex justify-center' : ''
        )}>
          {collapsed ? (
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold',
              getProfileColorClass(user.perfil)
            )}>
              {user.nome.charAt(0)}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold',
                getProfileColorClass(user.perfil)
              )}>
                {user.nome.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user.nome}
                </p>
                <p className="text-xs text-sidebar-foreground/60">
                  {getProfileLabel(user.perfil)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <Link
          to="/perfil"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
            'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
          )}
        >
          <UserCircle className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Meu Perfil</span>}
        </Link>
        <Link
          to="/configuracoes"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
            'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
          )}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Configurações</span>}
        </Link>
        <button
          onClick={logout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
            'text-destructive/80 hover:bg-destructive/10 hover:text-destructive'
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Sair</span>}
        </button>
      </div>

      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border shadow-md hover:bg-accent"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </Button>
    </aside>
  );
};

export default Sidebar;
