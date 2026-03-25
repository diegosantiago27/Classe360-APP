import { UserProfile } from '@/types/auth';
import type { StoredUser } from '@/lib/mockUsers';

export const normalizeTextPendencias = (value?: string) =>
  (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const getTurmaKey = (value?: string) => {
  const normalized = normalizeTextPendencias(value)
    .replace(/º/g, 'o')
    .replace(/\s+/g, ' ');
  const match = normalized.match(/(\d+)\s*(?:o|ano)?\s*([a-z])/i);
  if (match) return `${match[1]}${match[2]}`.toLowerCase();
  return normalized.replace(/[^a-z0-9]/g, '');
};

const bimestreCompativel = (periodoProva: string | undefined, bimestreLancamento: string) => {
  const p = normalizeTextPendencias(periodoProva ?? '')
    .replace(/º/g, 'o')
    .replace(/[^a-z0-9]/g, '');
  const b = normalizeTextPendencias(bimestreLancamento)
    .replace(/º/g, 'o')
    .replace(/[^a-z0-9]/g, '');
  if (!p) return true;
  return p === b;
};

export interface LancamentoPendencia {
  id: string;
  turma: string;
  disciplina: string;
  bimestre: string;
  pendentes: number;
  status: 'Pendente' | 'Concluida';
}

interface NotaAlunoLite {
  alunoId: string;
  turma: string;
  disciplina: string;
  bimestre: string;
  trabalhosNota?: number | null;
  provasNota?: number | null;
  nota: number | null;
}

interface ProvaRespostaLite {
  provaId: string;
  alunoId: string;
  turma: string;
  disciplina: string;
  status: string;
  notaFinal?: number | null;
  periodo?: string;
  corrigidoEm?: string;
}

interface AtividadeEntregaLite {
  alunoId: string;
  disciplina: string;
  nota?: number | null;
}

interface VinculoLite {
  turmaId: string;
  turmaNome: string;
  disciplinaId: string;
  alunos?: Array<{ alunoId: string; alunoNome?: string }>;
}

const respostaCorrigida = (r: ProvaRespostaLite) =>
  r.status === 'Corrigido' || Boolean(r.corrigidoEm);

const notaExibicaoParaAluno = (
  alunoId: string,
  turma: string,
  disciplina: string,
  bimestre: string,
  notasAlunos: NotaAlunoLite[],
  respostasProvas: ProvaRespostaLite[],
  entregasAtividades: AtividadeEntregaLite[],
  periodoPorProvaId: Map<string, string>,
): number | null => {
  const notaAtualBimestre =
    notasAlunos.find(
      (nota) =>
        String(nota.alunoId) === String(alunoId) &&
        normalizeTextPendencias(nota.turma) === normalizeTextPendencias(turma) &&
        normalizeTextPendencias(nota.disciplina) === normalizeTextPendencias(disciplina) &&
        normalizeTextPendencias(nota.bimestre) === normalizeTextPendencias(bimestre),
    ) ?? null;

  const provasAluno = respostasProvas.filter(
    (resposta) =>
      String(resposta.alunoId) === String(alunoId) &&
      normalizeTextPendencias(resposta.turma) === normalizeTextPendencias(turma) &&
      normalizeTextPendencias(resposta.disciplina) === normalizeTextPendencias(disciplina) &&
      respostaCorrigida(resposta) &&
      typeof resposta.notaFinal === 'number' &&
      bimestreCompativel(resposta.periodo ?? periodoPorProvaId.get(resposta.provaId), bimestre),
  );

  const trabalhosAluno = entregasAtividades.filter(
    (entrega) =>
      String(entrega.alunoId) === String(alunoId) &&
      normalizeTextPendencias(entrega.disciplina) === normalizeTextPendencias(disciplina) &&
      typeof entrega.nota === 'number',
  );

  const mediaProvas =
    provasAluno.length > 0
      ? Math.round(
          (provasAluno.reduce((acc, item) => acc + (item.notaFinal ?? 0), 0) / provasAluno.length) * 10,
        ) / 10
      : null;

  const mediaTrabalhos =
    trabalhosAluno.length > 0
      ? Math.round(
          (trabalhosAluno.reduce((acc, item) => acc + (item.nota ?? 0), 0) / trabalhosAluno.length) * 10,
        ) / 10
      : null;

  const componentes = [mediaProvas, mediaTrabalhos].filter(
    (valor): valor is number => typeof valor === 'number',
  );
  const mediaFinal =
    componentes.length > 0
      ? Math.round((componentes.reduce((acc, item) => acc + item, 0) / componentes.length) * 10) / 10
      : null;

  return typeof notaAtualBimestre?.nota === 'number'
    ? notaAtualBimestre.nota
    : mediaFinal;
};

const alunosIdsParaLancamento = (
  turma: string,
  disciplina: string,
  vinculos: VinculoLite[],
  usuarios: StoredUser[],
  resolveTurmaNome: (turmaId: string, turmaNome?: string) => string,
  resolveDisciplinaNome: (disciplinaId: string) => string,
): string[] => {
  const turmaN = normalizeTextPendencias(turma);
  const discN = normalizeTextPendencias(disciplina);
  const porVinculo = vinculos
    .filter((v) => {
      const tNome = normalizeTextPendencias(resolveTurmaNome(v.turmaId, v.turmaNome));
      const dNome = normalizeTextPendencias(resolveDisciplinaNome(v.disciplinaId));
      return tNome === turmaN && dNome === discN;
    })
    .flatMap((v) => v.alunos?.map((a) => String(a.alunoId)) ?? []);

  if (porVinculo.length > 0) {
    return [...new Set(porVinculo)];
  }

  const turmaKey = getTurmaKey(turma);
  const porCadastro = usuarios
    .filter(
      (u) =>
        u.perfil === UserProfile.ALUNO &&
        u.status === 'ativo' &&
        (u.turmas ?? []).some((tn) => getTurmaKey(tn) === turmaKey),
    )
    .map((u) => String(u.id));

  return [...new Set(porCadastro)];
};

/**
 * Recalcula `pendentes` e `status` com base em notas lançadas, provas corrigidas e trabalhos —
 * alinhado à lógica da página NotaTurma.
 */
export const recalcularPendenciasLancamentos = (
  lancamentos: LancamentoPendencia[],
  ctx: {
    vinculos: VinculoLite[];
    usuarios: StoredUser[];
    notasAlunos: NotaAlunoLite[];
    respostasProvas: ProvaRespostaLite[];
    entregasAtividades: AtividadeEntregaLite[];
    provasCatalogo: Array<{ id: string; turma?: string; disciplina?: string; periodo?: string }>;
    resolveTurmaNome: (turmaId: string, turmaNome?: string) => string;
    resolveDisciplinaNome: (disciplinaId: string) => string;
  },
): LancamentoPendencia[] => {
  const provaPorId = new Map(ctx.provasCatalogo.map((p) => [String(p.id), p]));
  const respostasEnriquecidas = ctx.respostasProvas.map((r) => {
    const p = provaPorId.get(String(r.provaId));
    return {
      ...r,
      turma: r.turma || p?.turma || '',
      disciplina: r.disciplina || p?.disciplina || '',
      periodo: r.periodo ?? p?.periodo,
    };
  });
  const periodoPorProvaId = new Map(ctx.provasCatalogo.map((p) => [String(p.id), p.periodo ?? '']));

  return lancamentos.map((row) => {
    const alunoIds = alunosIdsParaLancamento(
      row.turma,
      row.disciplina,
      ctx.vinculos,
      ctx.usuarios,
      ctx.resolveTurmaNome,
      ctx.resolveDisciplinaNome,
    );
    if (alunoIds.length === 0) {
      return row;
    }

    let pendentes = 0;
    for (const alunoId of alunoIds) {
      const exib = notaExibicaoParaAluno(
        alunoId,
        row.turma,
        row.disciplina,
        row.bimestre,
        ctx.notasAlunos,
        respostasEnriquecidas,
        ctx.entregasAtividades,
        periodoPorProvaId,
      );
      if (typeof exib !== 'number' || Number.isNaN(exib)) {
        pendentes += 1;
      }
    }

    return {
      ...row,
      pendentes,
      status: pendentes > 0 ? 'Pendente' : 'Concluida',
    };
  });
};
