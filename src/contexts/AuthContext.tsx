import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState, LoginCredentials, RegisterData, UserProfile } from '@/types/auth';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
  hasPermission: (allowedProfiles: UserProfile[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demonstration
const mockUsers: User[] = [
  {
    id: '1',
    cpf: '11111111111',
    nome: 'Maria Silva',
    email: 'maria@escola.com',
    perfil: UserProfile.GESTOR,
    primeiroAcesso: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    cpf: '22222222222',
    nome: 'João Santos',
    email: 'joao@escola.com',
    perfil: UserProfile.ADMINISTRADOR,
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
];

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
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const user = mockUsers.find(u => u.cpf === credentials.cpf.replace(/\D/g, ''));
    
    if (user) {
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
    }
    
    return false;
  };

  const register = async (data: RegisterData): Promise<boolean> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newUser: User = {
      id: String(mockUsers.length + 1),
      cpf: data.cpf.replace(/\D/g, ''),
      nome: data.nome,
      email: data.email,
      perfil: UserProfile.ALUNO, // Default to student
      primeiroAcesso: true,
      createdAt: new Date().toISOString(),
    };
    
    mockUsers.push(newUser);
    
    const token = btoa(JSON.stringify({ id: newUser.id, exp: Date.now() + 86400000 }));
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(newUser));
    
    setAuthState({
      user: newUser,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
    
    return true;
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

  return (
    <AuthContext.Provider value={{ ...authState, login, register, logout, hasPermission }}>
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
