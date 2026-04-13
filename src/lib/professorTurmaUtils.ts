import type { Turma } from '@/lib/mockTurmas';
import type { StoredUser } from '@/lib/mockUsers';

/** Vínculo disciplina–turma (ou armazenamento equivalente) com professor opcional. */
export type VinculoProfessorTurma = {
  turmaId: string;
  professorId?: string;
  professorNome?: string;
};

export function normalizeText(value?: string): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function nomeDocenteNoVinculo(v: VinculoProfessorTurma, usuarios: StoredUser[]): string {
  const direto = v.professorNome?.trim();
  if (direto) return direto;
  const pid = v.professorId?.trim();
  if (!pid) return '';
  const u = usuarios.find((x) => String(x.id) === pid);
  return u?.nome?.trim() ?? '';
}

function nomeRegenteTurma(turma: Turma, usuarios: StoredUser[]): string {
  const raw = turma.professor?.trim() ?? '';
  if (!raw) return '';
  const porId = usuarios.find((u) => String(u.id) === raw);
  if (porId?.nome?.trim()) return porId.nome.trim();
  return raw;
}

/** Nomes únicos: professores das disciplinas na turma + professor responsável cadastrado na turma. */
export function rotuloProfessoresTurma(
  turma: Turma,
  vinculos: VinculoProfessorTurma[],
  usuarios: StoredUser[],
): string {
  const set = new Set<string>();
  vinculos
    .filter((v) => v.turmaId === turma.id)
    .forEach((v) => {
      const nome = nomeDocenteNoVinculo(v, usuarios);
      if (nome) set.add(nome);
    });
  const regente = nomeRegenteTurma(turma, usuarios);
  if (regente) set.add(regente);
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR')).join(', ');
}

/** Professor enxerga a turma se for o responsável na turma ou estiver em algum vínculo disciplina–turma. */
export function professorTemAcessoTurma(
  userId: string,
  userNome: string | undefined,
  turma: Turma,
  vinculos: VinculoProfessorTurma[],
): boolean {
  const idNorm = normalizeText(userId);
  const nomeNorm = normalizeText(userNome);
  if (idNorm && normalizeText(turma.professor) === idNorm) return true;
  return vinculos.some(
    (v) =>
      v.turmaId === turma.id &&
      ((idNorm && normalizeText(v.professorId) === idNorm) ||
        (Boolean(nomeNorm) && normalizeText(v.professorNome) === nomeNorm)),
  );
}

export function idsTurmasVisiveisParaProfessor(
  turmas: Turma[],
  vinculos: VinculoProfessorTurma[],
  userId: string,
  userNome: string | undefined,
): Set<string> {
  const ids = new Set<string>();
  turmas.forEach((t) => {
    if (professorTemAcessoTurma(userId, userNome, t, vinculos)) ids.add(t.id);
  });
  return ids;
}
