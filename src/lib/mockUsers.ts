import { UserProfile } from '@/types/auth';

export type UserStatus = 'ativo' | 'inativo';

export type UserTurno = 'Manha' | 'Tarde' | 'Noite';

export interface StoredUser {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  perfil: UserProfile;
  status: UserStatus;
  turno?: UserTurno;
  telefone?: string;
  dataNascimento?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  materias?: string[];
  turmas?: string[];
}

export const usersStorageKey = 'school-compass:usuarios';

export const defaultUsers: StoredUser[] = [
  { id: '1', nome: 'Maria Silva', email: 'maria@escola.com', cpf: '111.111.111-11', perfil: UserProfile.GESTOR, status: 'ativo' },
  { id: '2', nome: 'João Santos', email: 'joao@escola.com', cpf: '222.222.222-22', perfil: UserProfile.ADMINISTRADOR, status: 'ativo' },
  {
    id: '3',
    nome: 'Ana Costa',
    email: 'ana@escola.com',
    cpf: '333.333.333-33',
    perfil: UserProfile.PROFESSOR,
    status: 'ativo',
    materias: ['Matemática', 'Física'],
    turmas: ['9º Ano A', '9º Ano B'],
  },
  { id: '4', nome: 'Pedro Oliveira', email: 'pedro@escola.com', cpf: '444.444.444-44', perfil: UserProfile.ALUNO, status: 'ativo', turno: 'Manha' },
  {
    id: '5',
    nome: 'Carlos Mendes',
    email: 'carlos@escola.com',
    cpf: '555.555.555-55',
    perfil: UserProfile.PROFESSOR,
    status: 'inativo',
    turmas: ['8º Ano A'],
  },
  { id: '6', nome: 'Lucia Ferreira', email: 'lucia@escola.com', cpf: '666.666.666-66', perfil: UserProfile.ALUNO, status: 'ativo', turno: 'Manha' },
  { id: '7', nome: 'Roberto Lima', email: 'roberto@escola.com', cpf: '777.777.777-77', perfil: UserProfile.ALUNO, status: 'ativo' },
  {
    id: '8',
    nome: 'Fernanda Souza',
    email: 'fernanda@escola.com',
    cpf: '888.888.888-88',
    perfil: UserProfile.PROFESSOR,
    status: 'ativo',
    materias: ['História', 'Geografia'],
    turmas: ['7º Ano C'],
  },
];
