export type TurmaStatus = 'Ativa' | 'Planejada' | 'Inativa';
export type TurmaTurno = 'Manha' | 'Tarde' | 'Noite';

export interface Turma {
  id: string;
  nome: string;
  turno: TurmaTurno;
  alunos: number;
  professor: string;
  status: TurmaStatus;
  proximaAula: string;
}

export const turmasStorageKey = 'school-compass:turmas';

export const defaultTurmas: Turma[] = [
  {
    id: '9A',
    nome: '9º Ano A',
    turno: 'Manha',
    alunos: 32,
    professor: 'Ana Costa',
    status: 'Ativa',
    proximaAula: 'Hoje, 07:30',
  },
  {
    id: '9B',
    nome: '9º Ano B',
    turno: 'Manha',
    alunos: 30,
    professor: 'Carlos Mendes',
    status: 'Ativa',
    proximaAula: 'Hoje, 08:20',
  },
  {
    id: '8A',
    nome: '8º Ano A',
    turno: 'Manha',
    alunos: 28,
    professor: 'Maria Santos',
    status: 'Ativa',
    proximaAula: 'Amanha, 09:30',
  },
  {
    id: '7C',
    nome: '7º Ano C',
    turno: 'Tarde',
    alunos: 26,
    professor: 'Roberto Silva',
    status: 'Planejada',
    proximaAula: '05/02, 13:40',
  },
];
