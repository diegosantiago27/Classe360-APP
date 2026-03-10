export enum UserProfile {
  GESTOR = 1,
  ADMINISTRADOR = 2,
  PROFESSOR = 3,
  ALUNO = 4,
  SECRETARIA = 5,
}

export interface User {
  id: string;
  cpf: string;
  nome: string;
  email: string;
  perfil: UserProfile;
  primeiroAcesso: boolean;
  telefone?: string;
  dataNascimento?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  cep?: string;
  turmaId?: string;
  materias?: string[];
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  cpf: string;
  senha: string;
}

export interface RegisterData {
  cpf: string;
  nome: string;
  email: string;
  senha: string;
  dataNascimento?: string;
  telefone?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  cep?: string;
}

export const getProfileLabel = (perfil: UserProfile): string => {
  switch (perfil) {
    case UserProfile.GESTOR:
      return 'Gestor';
    case UserProfile.ADMINISTRADOR:
      return 'Administrador';
    case UserProfile.PROFESSOR:
      return 'Professor';
    case UserProfile.ALUNO:
      return 'Aluno';
    case UserProfile.SECRETARIA:
      return 'Secretaria';
    default:
      return 'Usuário';
  }
};

export const getProfileColor = (perfil: UserProfile): string => {
  switch (perfil) {
    case UserProfile.GESTOR:
      return 'gestor';
    case UserProfile.ADMINISTRADOR:
      return 'admin';
    case UserProfile.PROFESSOR:
      return 'professor';
    case UserProfile.ALUNO:
      return 'aluno';
    case UserProfile.SECRETARIA:
      return 'gestor';
    default:
      return 'primary';
  }
};
