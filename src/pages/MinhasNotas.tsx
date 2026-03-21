import React, { useEffect, useMemo, useState } from 'react';
import { Award, TrendingUp } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { loadFromStorage, syncKeysFromBackend } from '@/lib/mockStorage';
import { useAuth } from '@/contexts/AuthContext';

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

const MinhasNotas: React.FC = () => {
  const { user } = useAuth();
  const [notasAlunos, setNotasAlunos] = useState<NotaAluno[]>(() =>
    loadFromStorage<NotaAluno[]>(notasAlunosStorageKey, []),
  );
  const [legado, setLegado] = useState<NotaLegado[]>(() =>
    loadFromStorage<NotaLegado[]>(minhasNotasLegadoKey, []),
  );

  useEffect(() => {
    void syncKeysFromBackend([notasAlunosStorageKey, minhasNotasLegadoKey]).finally(() => {
      setNotasAlunos(loadFromStorage<NotaAluno[]>(notasAlunosStorageKey, []));
      setLegado(loadFromStorage<NotaLegado[]>(minhasNotasLegadoKey, []));
    });
  }, []);

  const uid = user?.id;

  const notasDoLancamento = useMemo(() => {
    if (!uid) return [];
    const idNorm = normalizeText(uid);
    return notasAlunos.filter((n) => normalizeText(n.alunoId) === idNorm);
  }, [notasAlunos, uid]);

  const notasLegadoFiltradas = useMemo(() => {
    if (!uid) return [];
    const idNorm = normalizeText(uid);
    return legado.filter((item) => !item.alunoId || normalizeText(item.alunoId) === idNorm);
  }, [legado, uid]);

  const itensExibicao = useMemo(() => {
    const doLancamento = notasDoLancamento.map((n) => {
      const media =
        typeof n.nota === 'number'
          ? n.nota
          : (() => {
              const t = n.trabalhosNota;
              const p = n.provasNota;
              if (typeof t === 'number' && typeof p === 'number') return Math.round(((t + p) / 2) * 10) / 10;
              if (typeof t === 'number') return t;
              if (typeof p === 'number') return p;
              return null;
            })();

      const partes: string[] = [];
      if (typeof n.trabalhosNota === 'number') partes.push(`Trabalhos: ${n.trabalhosNota.toFixed(1)}`);
      if (typeof n.provasNota === 'number') partes.push(`Provas: ${n.provasNota.toFixed(1)}`);
      const detalhe = partes.length ? partes.join(' • ') : 'Nota do lançamento';

      return {
        id: `lanc-${n.id}`,
        disciplina: n.disciplina,
        turma: n.turma,
        bimestre: n.bimestre,
        media,
        situacao: situacaoFromMedia(media),
        ultimaNota: detalhe,
        origem: 'lancamento' as const,
      };
    });

    const doLegado = notasLegadoFiltradas.map((n) => ({
      id: `leg-${n.id}`,
      disciplina: n.disciplina,
      turma: undefined as string | undefined,
      bimestre: undefined as string | undefined,
      media: n.media,
      situacao: n.situacao === 'Pendente' ? situacaoFromMedia(n.media) : n.situacao,
      ultimaNota: n.ultimaNota,
      origem: 'legado' as const,
    }));

    return [...doLancamento, ...doLegado];
  }, [notasDoLancamento, notasLegadoFiltradas]);

  const mediaGeral = useMemo(() => {
    const comValor = itensExibicao.filter((i) => typeof i.media === 'number') as Array<
      (typeof itensExibicao)[0] & { media: number }
    >;
    if (comValor.length === 0) return 0;
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
                <div className="text-2xl font-semibold text-foreground">{mediaGeral}</div>
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
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {itensExibicao.map((item) => (
              <Card key={item.id} className="card-hover">
                <CardHeader>
                  <CardTitle className="text-lg">{item.disciplina}</CardTitle>
                  <CardDescription>
                    {[item.turma, item.bimestre].filter(Boolean).join(' • ') || item.ultimaNota}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {item.turma || item.bimestre ? (
                    <div className="text-sm text-muted-foreground">{item.ultimaNota}</div>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Média</span>
                    <span className="text-lg font-semibold text-foreground">
                      {typeof item.media === 'number' ? item.media.toFixed(1) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={
                        item.situacao === 'Aprovado'
                          ? 'secondary'
                          : item.situacao === 'Pendente'
                            ? 'outline'
                            : 'destructive'
                      }
                    >
                      {item.situacao === 'Pendente' ? 'Aguardando nota' : item.situacao}
                    </Badge>
                    <div className="flex-1 pl-4">
                      <div className="h-2 rounded-full bg-muted">
                        {typeof item.media === 'number' ? (
                          <div
                            className="h-full rounded-full bg-success"
                            style={{ width: `${Math.min(100, item.media * 10)}%` }}
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MinhasNotas;
