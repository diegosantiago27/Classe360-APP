import React, { useEffect, useMemo, useState } from 'react';
import { Award, TrendingUp } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { loadFromStorage, syncKeysFromBackend } from '@/lib/mockStorage';
import { useAuth } from '@/contexts/AuthContext';
import {
  isProvasRelacionalEnabled,
  listMinhasRespostasComContexto,
  type MinhaRespostaComProva,
} from '@/lib/provasRelApi';
import {
  isNotasRelacionalEnabled,
  listNotasRelacionalPorAluno,
  type NotaLancamentoRelApi,
} from '@/lib/notasRelApi';

type SituacaoNota = 'Aprovado' | 'Recuperacao' | 'Reprovado' | 'Pendente';

interface NotaAluno {
  id: string;
  alunoId: string;
  alunoNome: string;
  turma: string;
  disciplina: string;
  bimestre: string;
  trabalhosNota?: number | null;
  provasNota?: number | null;
  nota: number | null;
}

/** Boletim legado (tela antiga) — ainda exibido se existir para o aluno. */
interface NotaLegado {
  id: string;
  alunoId?: string;
  disciplina: string;
  media: number;
  situacao: SituacaoNota;
  ultimaNota: string;
}

const notasAlunosStorageKey = 'school-compass:notas-alunos';
const minhasNotasLegadoKey = 'school-compass:minhas-notas';
const provasRespostasStorageKey = 'school-compass:provas-respostas';
const provasStorageKey = 'school-compass:provas';

interface ProvaRespostaLocal {
  provaId: string;
  alunoId: string;
  alunoNome?: string;
  turma: string;
  disciplina: string;
  periodo?: string;
  status: string;
  notaFinal?: number | null;
  corrigidoEm?: string;
}

const normalizeText = (value?: string) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const situacaoFromMedia = (n: number | null | undefined): SituacaoNota => {
  if (n === null || n === undefined || Number.isNaN(n)) return 'Pendente';
  if (n >= 7) return 'Aprovado';
  if (n >= 5) return 'Recuperacao';
  return 'Reprovado';
};

const situacaoBadgeProps = (situacao: SituacaoNota) => {
  if (situacao === 'Aprovado') {
    return {
      variant: 'outline' as const,
      className: 'border-success/50 bg-success/15 text-success hover:bg-success/25',
    };
  }
  if (situacao === 'Pendente' || situacao === 'Recuperacao') {
    return { variant: 'outline' as const };
  }
  return { variant: 'destructive' as const };
};

/** Extrai o número do bimestre para cruzar "2", "2º Bimestre", etc. */
const bimestreNumCanon = (bimestreOuPeriodo: string) => {
  const t = normalizeText(bimestreOuPeriodo).replace(/º/g, 'o');
  const m = t.match(/(\d)/);
  return m ? m[1] : t.replace(/[^0-9]/g, '') || '0';
};

const chaveGrupoProva = (disciplina: string, turma: string, bimestreOuPeriodo: string) =>
  `${normalizeText(disciplina)}::${normalizeText(turma)}::${bimestreNumCanon(bimestreOuPeriodo)}`;

const chaveDisciplinaTurma = (disciplina: string, turma: string) =>
  `${normalizeText(disciplina)}::${normalizeText(turma)}`;

/** Situação final: "Aprovado" só vale após notas nos 4 bimestres (1–4) na mesma disciplina/turma. */
const situacaoComRegraAnual = (
  media: number | null | undefined,
  origem: 'lancamento' | 'legado',
  disciplina: string,
  turma: string | undefined,
  bimestre: string | undefined,
  bimestresComNotaPorPar: Map<string, Set<string>>,
): SituacaoNota => {
  const base = situacaoFromMedia(media);
  if (base !== 'Aprovado' || origem !== 'lancamento') return base;
  if (!turma?.trim() || !bimestre?.trim()) return base;
  const key = chaveDisciplinaTurma(disciplina, turma);
  const set = bimestresComNotaPorPar.get(key) ?? new Set();
  const quatroOk = ['1', '2', '3', '4'].every((b) => set.has(b));
  return quatroOk ? 'Aprovado' : 'Pendente';
};

const MinhasNotas: React.FC = () => {
  const { user } = useAuth();
  const [notasAlunos, setNotasAlunos] = useState<NotaAluno[]>(() =>
    loadFromStorage<NotaAluno[]>(notasAlunosStorageKey, []),
  );
  const [legado, setLegado] = useState<NotaLegado[]>(() =>
    loadFromStorage<NotaLegado[]>(minhasNotasLegadoKey, []),
  );
  const [storageTick, setStorageTick] = useState(0);
  const [respostasProvasApi, setRespostasProvasApi] = useState<MinhaRespostaComProva[]>([]);
  const [notasRelAluno, setNotasRelAluno] = useState<NotaLancamentoRelApi[]>([]);
  const [falhaProvasRel, setFalhaProvasRel] = useState(false);
  const [falhaNotasRel, setFalhaNotasRel] = useState(false);

  useEffect(() => {
    if (isNotasRelacionalEnabled() || isProvasRelacionalEnabled()) return;
    void syncKeysFromBackend([
      notasAlunosStorageKey,
      minhasNotasLegadoKey,
      provasRespostasStorageKey,
      provasStorageKey,
    ]).finally(() => {
      setNotasAlunos(loadFromStorage<NotaAluno[]>(notasAlunosStorageKey, []));
      setLegado(loadFromStorage<NotaLegado[]>(minhasNotasLegadoKey, []));
      setStorageTick((t) => t + 1);
    });
  }, []);

  const uid = user?.id;

  useEffect(() => {
    if (!isProvasRelacionalEnabled() || !uid) {
      setRespostasProvasApi([]);
      setFalhaProvasRel(false);
      return;
    }
    setFalhaProvasRel(false);
    void listMinhasRespostasComContexto(uid)
      .then(setRespostasProvasApi)
      .catch(() => {
        setFalhaProvasRel(true);
        setRespostasProvasApi([]);
      });
  }, [uid]);

  useEffect(() => {
    if (!isNotasRelacionalEnabled() || !uid) {
      setNotasRelAluno([]);
      setFalhaNotasRel(false);
      return;
    }
    setFalhaNotasRel(false);
    void listNotasRelacionalPorAluno(uid)
      .then(setNotasRelAluno)
      .catch(() => {
        setFalhaNotasRel(true);
        setNotasRelAluno([]);
      });
  }, [uid]);

  const periodoPorProvaId = useMemo(() => {
    if (isProvasRelacionalEnabled() && !falhaProvasRel) {
      return new Map<string, string>();
    }
    const provas = loadFromStorage<Array<{ id: string; periodo?: string }>>(provasStorageKey, []);
    return new Map(provas.map((p) => [String(p.id), (p.periodo ?? '').trim()]));
  }, [storageTick, falhaProvasRel]);

  const respostasProvasLocais = useMemo(() => {
    if (isProvasRelacionalEnabled() && !falhaProvasRel) {
      return [] as MinhaRespostaComProva[];
    }
    if (!user) return [] as MinhaRespostaComProva[];
    const idNorm = uid ? normalizeText(uid) : '';
    const nomeNorm = user.nome ? normalizeText(user.nome) : '';
    const respostas = loadFromStorage<ProvaRespostaLocal[]>(provasRespostasStorageKey, []);
    return respostas
      .filter((r) => {
        const idOk = idNorm && normalizeText(r.alunoId) === idNorm;
        const nomeOk =
          nomeNorm && r.alunoNome && normalizeText(r.alunoNome) === nomeNorm;
        return Boolean(idOk || nomeOk);
      })
      .map((r) => {
        const corrigido =
          r.status === 'Corrigido' ||
          (typeof r.corrigidoEm === 'string' && r.corrigidoEm.length > 0);
        const periodo = (r.periodo?.trim() || periodoPorProvaId.get(String(r.provaId)) || '').trim();
        return {
          provaId: r.provaId,
          turma: r.turma,
          disciplina: r.disciplina,
          periodo,
          notaFinal: r.notaFinal ?? null,
          corrigido,
        };
      });
  }, [user, uid, storageTick, periodoPorProvaId, falhaProvasRel]);

  const todasRespostasProvaAluno = useMemo(() => {
    if (isProvasRelacionalEnabled() && !falhaProvasRel) {
      return respostasProvasApi.map((r) => ({
        ...r,
        periodo: (r.periodo?.trim() || periodoPorProvaId.get(String(r.provaId)) || '').trim(),
      }));
    }
    const map = new Map<string, MinhaRespostaComProva>();
    const enriquecer = (r: MinhaRespostaComProva): MinhaRespostaComProva => ({
      ...r,
      periodo: (r.periodo?.trim() || periodoPorProvaId.get(String(r.provaId)) || '').trim(),
    });
    respostasProvasLocais.forEach((r) => map.set(r.provaId, enriquecer(r)));
    respostasProvasApi.forEach((r) => map.set(r.provaId, enriquecer(r)));
    return Array.from(map.values());
  }, [respostasProvasLocais, respostasProvasApi, periodoPorProvaId, falhaProvasRel]);

  const gruposNotaProva = useMemo(() => {
    const acc = new Map<
      string,
      { disciplina: string; turma: string; bimestre: string; soma: number; n: number }
    >();
    todasRespostasProvaAluno.forEach((r) => {
      if (!r.corrigido || typeof r.notaFinal !== 'number') return;
      const bi = r.periodo?.trim();
      if (!bi) return;
      const key = chaveGrupoProva(r.disciplina, r.turma, bi);
      const cur = acc.get(key) ?? {
        disciplina: r.disciplina,
        turma: r.turma,
        bimestre: bi,
        soma: 0,
        n: 0,
      };
      cur.soma += r.notaFinal;
      cur.n += 1;
      acc.set(key, cur);
    });
    const medias = new Map<string, { disciplina: string; turma: string; bimestre: string; mediaProvas: number }>();
    acc.forEach((v, k) => {
      medias.set(k, {
        disciplina: v.disciplina,
        turma: v.turma,
        bimestre: v.bimestre,
        mediaProvas: Math.round((v.soma / v.n) * 10) / 10,
      });
    });
    return medias;
  }, [todasRespostasProvaAluno]);

  const notasDoLancamento = useMemo(() => {
    if (!user) return [];
    const idNorm = uid ? normalizeText(uid) : '';
    const nomeNorm = user.nome ? normalizeText(user.nome) : '';
    const local = notasAlunos.filter((n) => {
      const mesmoId = idNorm && normalizeText(n.alunoId) === idNorm;
      const mesmoNome = nomeNorm && normalizeText(n.alunoNome) === nomeNorm;
      return Boolean(mesmoId || mesmoNome);
    });
    const rel = notasRelAluno.map((n, idx) => ({
      id: `rel-${n.id ?? idx}`,
      alunoId: String(n.alunoId ?? uid ?? ''),
      alunoNome: n.alunoNome ?? user.nome,
      turma: n.turmaNome ?? '',
      disciplina: n.disciplinaNome ?? '',
      bimestre: n.bimestre ?? '',
      trabalhosNota: n.trabalhosNota ?? null,
      provasNota: n.provasNota ?? null,
      nota: n.nota ?? null,
    }));
    if (isNotasRelacionalEnabled() && !falhaNotasRel) {
      return rel;
    }
    const byKey = new Map<string, NotaAluno>();
    const keyOf = (n: NotaAluno) => chaveGrupoProva(n.disciplina, n.turma, n.bimestre);
    local.forEach((n) => byKey.set(keyOf(n), n));
    rel.forEach((n) => byKey.set(keyOf(n), n));
    return Array.from(byKey.values());
  }, [notasAlunos, notasRelAluno, uid, user]);

  const notasLegadoFiltradas = useMemo(() => {
    if (!uid) return [];
    const idNorm = normalizeText(uid);
    return legado.filter((item) => !item.alunoId || normalizeText(item.alunoId) === idNorm);
  }, [legado, uid]);

  const itensExibicao = useMemo(() => {
    const chavesComLancamento = new Set(
      notasDoLancamento.map((n) => chaveGrupoProva(n.disciplina, n.turma, n.bimestre)),
    );

    const doLancamento = notasDoLancamento.map((n) => {
      const g = gruposNotaProva.get(chaveGrupoProva(n.disciplina, n.turma, n.bimestre));
      let provasNota =
        typeof n.provasNota === 'number' ? n.provasNota : g?.mediaProvas ?? null;
      const trabalhosNota = typeof n.trabalhosNota === 'number' ? n.trabalhosNota : null;
      if (provasNota == null && typeof n.nota === 'number' && typeof trabalhosNota === 'number') {
        const infer = Math.round((2 * n.nota - trabalhosNota) * 10) / 10;
        if (infer >= 0 && infer <= 10 && !Number.isNaN(infer)) provasNota = infer;
      }

      const media =
        typeof n.nota === 'number'
          ? n.nota
          : (() => {
              const t = trabalhosNota;
              const p = provasNota;
              if (typeof t === 'number' && typeof p === 'number') return Math.round(((t + p) / 2) * 10) / 10;
              if (typeof t === 'number') return t;
              if (typeof p === 'number') return p;
              return null;
            })();

      const partes: string[] = [];
      if (typeof trabalhosNota === 'number') partes.push(`Trabalhos: ${trabalhosNota.toFixed(1)}`);
      if (typeof provasNota === 'number') partes.push(`Provas: ${provasNota.toFixed(1)}`);
      const detalhe = partes.length ? partes.join(' • ') : 'Nota do lançamento';

      return {
        id: `lanc-${n.id}`,
        disciplina: n.disciplina,
        turma: n.turma,
        bimestre: n.bimestre,
        media,
        trabalhosNota,
        provasNota,
        ultimaNota: detalhe,
        origem: 'lancamento' as const,
      };
    });

    const extrasProvas: typeof doLancamento = [];
    gruposNotaProva.forEach((g, key) => {
      if (chavesComLancamento.has(key)) return;
      extrasProvas.push({
        id: `prova-${key.replace(/[^a-z0-9]+/gi, '-')}`,
        disciplina: g.disciplina,
        turma: g.turma,
        bimestre: g.bimestre,
        trabalhosNota: null,
        provasNota: g.mediaProvas,
        media: g.mediaProvas,
        ultimaNota: 'Média das provas corrigidas',
        origem: 'lancamento' as const,
      });
    });

    const doLegado = notasLegadoFiltradas.map((n) => ({
      id: `leg-${n.id}`,
      disciplina: n.disciplina,
      turma: undefined as string | undefined,
      bimestre: undefined as string | undefined,
      media: n.media,
      trabalhosNota: null as number | null,
      provasNota: null as number | null,
      situacao: n.situacao === 'Pendente' ? situacaoFromMedia(n.media) : n.situacao,
      ultimaNota: n.ultimaNota,
      origem: 'legado' as const,
    }));

    const lancamentoEExtras = [...doLancamento, ...extrasProvas];
    const bimestresComNotaPorPar = new Map<string, Set<string>>();
    lancamentoEExtras.forEach((row) => {
      if (typeof row.media !== 'number' || !row.bimestre?.trim() || !row.turma?.trim()) return;
      const key = chaveDisciplinaTurma(row.disciplina, row.turma);
      const bi = bimestreNumCanon(row.bimestre);
      if (!bimestresComNotaPorPar.has(key)) bimestresComNotaPorPar.set(key, new Set());
      bimestresComNotaPorPar.get(key)!.add(bi);
    });

    const comSituacaoLancamento = lancamentoEExtras.map((row) => ({
      ...row,
      situacao: situacaoComRegraAnual(
        row.media,
        'lancamento',
        row.disciplina,
        row.turma,
        row.bimestre,
        bimestresComNotaPorPar,
      ),
    }));

    return [...comSituacaoLancamento, ...doLegado];
  }, [notasDoLancamento, notasLegadoFiltradas, gruposNotaProva]);

  const mediaGeral = useMemo(() => {
    const comValor = itensExibicao.filter((i) => typeof i.media === 'number') as Array<
      (typeof itensExibicao)[0] & { media: number }
    >;
    if (comValor.length === 0) return null;
    const soma = comValor.reduce((acc, item) => acc + item.media, 0);
    return Math.round((soma / comValor.length) * 10) / 10;
  }, [itensExibicao]);

  const evolucaoRecente = useMemo(() => {
    const sorted = [...itensExibicao]
      .filter((i): i is typeof i & { media: number } => typeof i.media === 'number')
      .sort((a, b) =>
        `${a.disciplina}-${a.bimestre ?? ''}`.localeCompare(
          `${b.disciplina}-${b.bimestre ?? ''}`,
          'pt-BR',
        ),
      );
    if (sorted.length < 2) return null;
    const prev = sorted[sorted.length - 2].media;
    const last = sorted[sorted.length - 1].media;
    const diff = Math.round((last - prev) * 10) / 10;
    if (diff === 0) return '0';
    return diff > 0 ? `+${diff}` : `${diff}`;
  }, [itensExibicao]);

  const fmtCelula = (v: number | null | undefined) =>
    typeof v === 'number' && !Number.isNaN(v) ? v.toFixed(1) : '—';

  const itensOrdenados = useMemo(
    () =>
      [...itensExibicao].sort((a, b) => {
        const d = a.disciplina.localeCompare(b.disciplina, 'pt-BR', { sensitivity: 'base' });
        if (d !== 0) return d;
        return (a.bimestre ?? '').localeCompare(b.bimestre ?? '', 'pt-BR', { sensitivity: 'base' });
      }),
    [itensExibicao],
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Minhas notas</h1>
            <p className="text-muted-foreground">
              Veja o desempenho por disciplina e acompanhe sua evolução (notas lançadas pelo professor).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">Média geral</CardTitle>
                <div className="text-2xl font-semibold text-foreground">
                  {mediaGeral === null ? '—' : mediaGeral}
                </div>
              </div>
              <Award className="w-5 h-5 text-success" />
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">Evolução recente</CardTitle>
                <div className="text-2xl font-semibold text-foreground">
                  {evolucaoRecente ?? '—'}
                </div>
              </div>
              <TrendingUp className="w-5 h-5 text-primary" />
            </CardHeader>
          </Card>
        </div>

        {itensExibicao.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhuma nota lançada ainda. Quando o professor registrar suas notas em <strong>Notas</strong>, elas
            aparecerão aqui.
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Quadro de notas</CardTitle>
              <CardDescription>
                Uma linha por disciplina e bimestre. Inclui lançamentos em <strong>Notas</strong> e média das{' '}
                <strong>provas corrigidas</strong> (com período/bimestre cadastrado na prova).
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Disciplina</TableHead>
                    <TableHead className="hidden sm:table-cell">Turma</TableHead>
                    <TableHead className="hidden md:table-cell">Bimestre</TableHead>
                    <TableHead className="text-right">Trabalhos</TableHead>
                    <TableHead className="text-right">Provas</TableHead>
                    <TableHead className="text-right">Média</TableHead>
                    <TableHead className="hidden lg:table-cell">Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensOrdenados.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div>{item.disciplina}</div>
                        <div className="text-xs text-muted-foreground sm:hidden">
                          {[item.turma, item.bimestre].filter(Boolean).join(' • ') || '—'}
                        </div>
                        <div className="mt-2 lg:hidden">
                          <Badge {...situacaoBadgeProps(item.situacao)}>
                            {item.situacao === 'Pendente' ? 'Aguardando' : item.situacao}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {item.turma ?? '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {item.bimestre ?? '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtCelula(item.trabalhosNota)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtCelula(item.provasNota)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {typeof item.media === 'number' ? item.media.toFixed(1) : '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge {...situacaoBadgeProps(item.situacao)}>
                          {item.situacao === 'Pendente' ? 'Aguardando' : item.situacao}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MinhasNotas;
