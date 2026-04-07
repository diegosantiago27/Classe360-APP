import type { TurmaApi } from '@/lib/entityCrudApi';
import type { StoredUser } from '@/lib/mockUsers';
import { UserProfile } from '@/types/auth';

/** Preenche `turmas` (nomes) dos alunos a partir de `turma.alunosIds` no backend. */
export function mergeAlunosTurmasFromApi(usuarios: StoredUser[], turmas: TurmaApi[]): StoredUser[] {
  const nomesPorAluno = new Map<string, string[]>();
  turmas.forEach((t) => {
    const nome = (t.nome ?? '').trim();
    if (!nome) return;
    (t.alunosIds ?? []).forEach((aid) => {
      const k = String(aid);
      const arr = nomesPorAluno.get(k) ?? [];
      if (!arr.includes(nome)) arr.push(nome);
      nomesPorAluno.set(k, arr);
    });
  });
  return usuarios.map((u) => {
    if (u.perfil !== UserProfile.ALUNO) return u;
    const fromApi = nomesPorAluno.get(u.id);
    if (fromApi && fromApi.length > 0) return { ...u, turmas: fromApi };
    return u;
  });
}
