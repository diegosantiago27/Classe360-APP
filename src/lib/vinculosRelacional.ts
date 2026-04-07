import { listDisciplinaTurmasApi, type DisciplinaTurmaApi } from '@/lib/entityCrudApi';

/** Formato comum usado nas telas que antes liam `school-compass:disciplinas-vinculos`. */
export type VinculoDisciplinaTurma = {
  disciplinaId: string;
  turmaId: string;
  turmaNome: string;
  professorId: string;
  professorNome: string;
  alunos: Array<{
    alunoId: string;
    alunoNome: string;
    turno?: 'Manha' | 'Tarde' | 'Noite';
    ano?: string;
    serie?: string;
  }>;
};

export function mapDisciplinaTurmaApiToVinculo(row: DisciplinaTurmaApi): VinculoDisciplinaTurma | null {
  if (row.disciplinaId == null || row.turmaId == null) return null;
  return {
    disciplinaId: String(row.disciplinaId),
    turmaId: String(row.turmaId),
    turmaNome: row.turmaNome ?? '',
    professorId: row.professorId != null ? String(row.professorId) : '',
    professorNome: row.professorNome ?? '',
    alunos: [],
  };
}

export async function loadVinculosDisciplinaTurma(): Promise<VinculoDisciplinaTurma[]> {
  const rows = await listDisciplinaTurmasApi();
  return rows.map(mapDisciplinaTurmaApiToVinculo).filter((v): v is VinculoDisciplinaTurma => v != null);
}
