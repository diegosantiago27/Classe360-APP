import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState, LoginCredentials, RegisterData, UserProfile } from '@/types/auth';
import { syncKeysFromBackend } from '@/lib/mockStorage';
import { addSolicitacao, findApprovedUserByCpf } from '@/lib/mockSolicitacoes';

export type RegisterResult =
  | { success: true; type: 'solicitation' }
  | { success: true; type: 'logged_in' }
  | { success: false; message?: string };

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (data: RegisterData) => Promise<RegisterResult>;
  logout: () => void;
  hasPermission: (allowedProfiles: UserProfile[]) => boolean;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demonstration
const mockUsers: User[] = [
  {
    id: '1',
    cpf: '11111111111',
    nome: 'Administrador',
    email: 'admin@classe360.com',
    perfil: UserProfile.ADMINISTRADOR,
    primeiroAcesso: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    cpf: '22222222222',
    nome: 'Maria Silva',
    email: 'maria@escola.com',
    perfil: UserProfile.GESTOR,
    primeiroAcesso: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    cpf: '33333333333',
    nome: 'Ana Costa',
    email: 'ana@escola.com',
    perfil: UserProfile.PROFESSOR,
    primeiroAcesso: false,
    materias: ['Matemática', 'Física'],
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    cpf: '44444444444',
    nome: 'Pedro Oliveira',
    email: 'pedro@escola.com',
    perfil: UserProfile.ALUNO,
    primeiroAcesso: false,
    turmaId: '9A',
    createdAt: new Date().toISOString(),
  },
  {
    id: '5',
    cpf: '55555555555',
    nome: 'Carla Secretária',
    email: 'secretaria@escola.com',
    perfil: UserProfile.SECRETARIA,
    primeiroAcesso: false,
    createdAt: new Date().toISOString(),
  },
];

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

const baseSyncKeys = [
  'school-compass:usuarios',
  'school-compass:turmas',
  'school-compass:disciplinas',
  'school-compass:periodos',
  'school-compass:notas',
  'school-compass:notas-alunos',
  'school-compass:frequencia',
  'school-compass:frequencia-diaria',
  'school-compass:provas',
  'school-compass:provas-respostas',
  'school-compass:provas-sessoes',
  'school-compass:provas-respostas',
  'school-compass:atividades',
  'school-compass:atividades-entregas',
  'school-compass:materiais',
  'school-compass:avisos',
  'school-compass:avisos-lidos',
  'school-compass:minhas-materias',
  'school-compass:minhas-notas',
  'school-compass:minha-frequencia',
  'school-compass:configuracoes',
];

const buildSyncKeysForUser = (userId?: string | null) => {
  const keys = [...baseSyncKeys];
  if (userId) {
    keys.push(`school-compass:perfil:${userId}`);
  }
  return Array.from(new Set(keys));
};

async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  if (!API_URL) {
    throw new Error('API_URL not configured');
  }
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
  const data = await res.json().catch(() => ({})) as Record<string, unknown>;
  if (!res.ok) {
    const message =
      (typeof data?.detail === 'string' ? data.detail : null) ??
      (typeof data?.message === 'string' ? data.message : null) ??
      (typeof data?.error === 'string' ? data.error : null) ??
      `Erro HTTP ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        setAuthState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });

        // Se houver backend configurado, tenta sincronizar o usuário via /me
        if (API_URL) {
          apiRequest<{ user: User }>('/api/v1/auth/me', { method: 'GET', token })
            .then((resp) => {
              localStorage.setItem('user', JSON.stringify(resp.user));
              setAuthState((prev) => ({
                ...prev,
                user: resp.user,
                isAuthenticated: true,
                isLoading: false,
              }));
              void syncKeysFromBackend(buildSyncKeysForUser(resp.user?.id));
            })
            .catch(() => {
              // Token inválido/expirado ou backend indisponível → mantém sessão local
            });
        }
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    // Preferir backend quando configurado
    if (API_URL) {
      try {
        const resp = await apiRequest<{ token: string; user: User }>('/api/v1/auth/login', {
          method: 'POST',
          body: JSON.stringify(credentials),
        });

        localStorage.setItem('token', resp.token);
        localStorage.setItem('user', JSON.stringify(resp.user));
        void syncKeysFromBackend(buildSyncKeysForUser(resp.user?.id));

        setAuthState({
          user: resp.user,
          token: resp.token,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      } catch {
        // fallback pro mock
      }
    }

    // Mock (modo demo/offline)
    await new Promise(resolve => setTimeout(resolve, 600));
    const cpfNorm = credentials.cpf.replace(/\D/g, '');
    let user: User | null = mockUsers.find(u => u.cpf === cpfNorm) ?? null;
    if (!user) {
      const approved = findApprovedUserByCpf(cpfNorm);
      if (approved && approved.senha === credentials.senha) {
        user = approved.user;
      }
    }
    if (!user) return false;
    // Admin (111.111.111-11) exige senha admin@Classe360
    if (cpfNorm === '11111111111' && credentials.senha !== 'admin@Classe360') return false;

    const token = btoa(JSON.stringify({ id: user.id, exp: Date.now() + 86400000 }));
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setAuthState({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
    return true;
  };

  const register = async (data: RegisterData): Promise<RegisterResult> => {
    if (API_URL) {
      try {
        const resp = await apiRequest<{ token?: string; user?: User; id?: number; message?: string }>('/api/v1/auth/register', {
          method: 'POST',
          body: JSON.stringify(data),
        });

        // Se retornou token/user = fluxo antigo (login direto). Se retornou id/message = solicitação enviada.
        if (resp.token && resp.user) {
          localStorage.setItem('token', resp.token);
          localStorage.setItem('user', JSON.stringify(resp.user));
          void syncKeysFromBackend(buildSyncKeysForUser(resp.user?.id));
          setAuthState({
            user: resp.user,
            token: resp.token,
            isAuthenticated: true,
            isLoading: false,
          });
          return { success: true, type: 'logged_in' };
        }
        return { success: true, type: 'solicitation' };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao conectar com o servidor';
        return { success: false, message: msg };
      }
    }

    // Mock (modo demo/offline): cria solicitação pendente em vez de login direto
    try {
      addSolicitacao({
        cpf: data.cpf.replace(/\D/g, ''),
        nome: data.nome,
        email: data.email,
        senha: data.senha,
        dataNascimento: data.dataNascimento,
        telefone: data.telefone,
        rua: data.rua,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        cidade: data.cidade,
        cep: data.cep,
      });
      return { success: true, type: 'solicitation' };
    } catch {
      return { success: false };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const hasPermission = (allowedProfiles: UserProfile[]): boolean => {
    if (!authState.user) return false;
    return allowedProfiles.includes(authState.user.perfil);
  };

  const updateUser = (user: User) => {
    localStorage.setItem('user', JSON.stringify(user));
    setAuthState((prev) => ({ ...prev, user }));
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, register, logout, hasPermission, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
