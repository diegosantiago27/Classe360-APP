export interface MateriaAluno {
  id: string;
  alunoId?: string;
  disciplina: string;
  professor: string;
  turma: string;
  turno: string;
  serie: string;
  frequencia: number;
  atividadesPendentes: number;
  atividadesTotais: number;
  ultimaAtividade: string;
}

export const materiasAlunoStorageKey = 'school-compass:minhas-materias';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

export const defaultMateriasAluno: MateriaAluno[] = API_URL ? [] : [
  {
    id: 'MAT-9A',
    disciplina: 'Matematica',
    professor: 'Prof. Ana Costa',
    turma: '9º Ano A',
    turno: 'Manha',
    serie: '9º Ano',
    frequencia: 95,
    atividadesPendentes: 1,
    atividadesTotais: 6,
    ultimaAtividade: 'Lista 03 - Funcoes',
  },
  {
    id: 'POR-9A',
    disciplina: 'Portugues',
    professor: 'Prof. Carlos Mendes',
    turma: '9º Ano A',
    turno: 'Manha',
    serie: '9º Ano',
    frequencia: 92,
    atividadesPendentes: 0,
    atividadesTotais: 5,
    ultimaAtividade: 'Interpretacao de Texto',
  },
  {
    id: 'HIS-9A',
    disciplina: 'Historia',
    professor: 'Prof. Maria Santos',
    turma: '9º Ano A',
    turno: 'Manha',
    serie: '9º Ano',
    frequencia: 98,
    atividadesPendentes: 2,
    atividadesTotais: 7,
    ultimaAtividade: 'Resumo Brasil Colonia',
  },
];
