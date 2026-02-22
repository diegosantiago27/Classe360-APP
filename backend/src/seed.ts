import type { DbShape } from './db.js';
import { setKv } from './db.js';

// Seeds alinhados com os defaults do front (mockUsers/mockTurmas/mockAcademics etc.)
export function seedDbIfEmpty(db: DbShape): DbShape {
  let next = db;

  const ensure = (key: string, value: unknown) => {
    if (next.kv[key] === undefined) {
      next = setKv(next, key, value);
    }
  };

  ensure('school-compass:usuarios', [
    {
      id: '1',
      nome: 'Maria Silva',
      email: 'maria@escola.com',
      cpf: '111.111.111-11',
      perfil: 1,
      status: 'ativo',
    },
    {
      id: '2',
      nome: 'João Santos',
      email: 'joao@escola.com',
      cpf: '222.222.222-22',
      perfil: 2,
      status: 'ativo',
    },
    {
      id: '3',
      nome: 'Ana Costa',
      email: 'ana@escola.com',
      cpf: '333.333.333-33',
      perfil: 3,
      status: 'ativo',
      materias: ['Matemática', 'Física'],
      turmas: ['9º Ano A', '9º Ano B'],
    },
    {
      id: '4',
      nome: 'Pedro Oliveira',
      email: 'pedro@escola.com',
      cpf: '444.444.444-44',
      perfil: 4,
      status: 'ativo',
    },
    {
      id: '5',
      nome: 'Carlos Mendes',
      email: 'carlos@escola.com',
      cpf: '555.555.555-55',
      perfil: 3,
      status: 'inativo',
      turmas: ['8º Ano A'],
    },
    {
      id: '6',
      nome: 'Lucia Ferreira',
      email: 'lucia@escola.com',
      cpf: '666.666.666-66',
      perfil: 4,
      status: 'ativo',
    },
    {
      id: '7',
      nome: 'Roberto Lima',
      email: 'roberto@escola.com',
      cpf: '777.777.777-77',
      perfil: 4,
      status: 'ativo',
    },
    {
      id: '8',
      nome: 'Fernanda Souza',
      email: 'fernanda@escola.com',
      cpf: '888.888.888-88',
      perfil: 3,
      status: 'ativo',
      materias: ['História', 'Geografia'],
      turmas: ['7º Ano C'],
    },
  ]);

  ensure('school-compass:turmas', [
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
  ]);

  ensure('school-compass:disciplinas', [
    { id: 'mat', nome: 'Matematica' },
    { id: 'por', nome: 'Portugues' },
    { id: 'his', nome: 'Historia' },
    { id: 'geo', nome: 'Geografia' },
    { id: 'fis', nome: 'Fisica' },
    { id: 'qui', nome: 'Quimica' },
    { id: 'bio', nome: 'Biologia' },
    { id: 'ing', nome: 'Ingles' },
    { id: 'ed-fis', nome: 'Educacao Fisica' },
    { id: 'art', nome: 'Artes' },
  ]);

  ensure('school-compass:periodos', [
    { id: '1b', nome: '1º Bimestre' },
    { id: '2b', nome: '2º Bimestre' },
    { id: '3b', nome: '3º Bimestre' },
    { id: '4b', nome: '4º Bimestre' },
    { id: 'sim', nome: 'Simulado' },
  ]);

  ensure('school-compass:minhas-materias', [
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
  ]);

  ensure('school-compass:avisos', [
    {
      id: 'AV-001',
      titulo: 'Reuniao de pais',
      descricao: 'Reuniao geral na proxima segunda-feira, 19h.',
      data: '20/01/2026',
      nivel: 'Urgente',
    },
    {
      id: 'AV-002',
      titulo: 'Entrega de boletins',
      descricao: 'Boletins disponiveis na secretaria e portal.',
      data: '22/01/2026',
      nivel: 'Informativo',
    },
    {
      id: 'AV-003',
      titulo: 'Feriado municipal',
      descricao: 'Nao havera aula em 25/01.',
      data: '25/01/2026',
      nivel: 'Informativo',
    },
  ]);

  ensure('school-compass:materiais', [
    {
      id: 'MAT-001',
      titulo: 'Lista de exercicios - Funcoes',
      disciplina: 'Matematica',
      tipo: 'PDF',
      atualizado: '20/01/2026',
    },
    {
      id: 'MAT-002',
      titulo: 'Slides - Movimento Uniforme',
      disciplina: 'Fisica',
      tipo: 'PPT',
      atualizado: '18/01/2026',
    },
    {
      id: 'MAT-003',
      titulo: 'Resumo - Historia do Brasil',
      disciplina: 'Historia',
      tipo: 'DOC',
      atualizado: '15/01/2026',
    },
  ]);

  return next;
}

