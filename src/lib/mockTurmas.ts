export type TurmaStatus = 'Ativa' | 'Planejada' | 'Inativa';
export type TurmaTurno = 'Manha' | 'Tarde' | 'Noite';

export interface Turma {
  id: string;
  nome: string;
  turno: TurmaTurno;
  /** ID do registro em `turno` (API); no mock local usa 1/2/3 alinhados ao seed. */
  turnoId?: string;
  turnoNome?: string;
  alunos: number;
  professor: string;
  status: TurmaStatus;
  proximaAula: string;
}

export const turmasStorageKey = 'school-compass:turmas';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

export const defaultTurmas: Turma[] = API_URL ? [] : [
  {
    id: '9A',
    nome: '9º Ano A',
    turno: 'Manha',
    turnoId: '1',
    turnoNome: 'Manhã',
    alunos: 32,
    professor: 'Ana Costa',
    status: 'Ativa',
    proximaAula: 'Hoje, 07:30',
  },
  {
    id: '9B',
    nome: '9º Ano B',
    turno: 'Manha',
    turnoId: '1',
    turnoNome: 'Manhã',
    alunos: 30,
    professor: 'Carlos Mendes',
    status: 'Ativa',
    proximaAula: 'Hoje, 08:20',
  },
  {
    id: '8A',
    nome: '8º Ano A',
    turno: 'Manha',
    turnoId: '1',
    turnoNome: 'Manhã',
    alunos: 28,
    professor: 'Maria Santos',
    status: 'Ativa',
    proximaAula: 'Amanha, 09:30',
  },
  {
    id: '7C',
    nome: '7º Ano C',
    turno: 'Tarde',
    turnoId: '2',
    turnoNome: 'Tarde',
    alunos: 26,
    professor: 'Roberto Silva',
    status: 'Planejada',
    proximaAula: '05/02, 13:40',
  },
];
