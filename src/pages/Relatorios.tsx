import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';
import { BarChart3, FileDown, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

interface TurmaApi {
  id: number;
  nome?: string;
}

interface PeriodoApi {
  id: number;
  nome?: string;
}

interface NotaApi {
  id: number;
  alunoId?: number | null;
  turmaId?: number | null;
  periodoId?: number | null;
  valor?: number | null;
}

interface FrequenciaApi {
  id: number;
  alunoId?: number | null;
  turmaId?: number | null;
  presente?: boolean | null;
}

interface PageResponse<T> {
  content?: T[];
  totalPages?: number;
  last?: boolean;
}

const getToken = () => (typeof window === 'undefined' ? null : window.localStorage.getItem('token'));

async function request<T>(path: string): Promise<T> {
  if (!API_URL) throw new Error('API_URL não configurada');
  const token = getToken();
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) {
    throw new Error(`Erro HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

async function fetchAllPages<T>(path: string): Promise<T[]> {
  const size = 500;
  let page = 0;
  const all: T[] = [];

  while (page < 200) {
    const separator = path.includes('?') ? '&' : '?';
    const data = await request<PageResponse<T> | T[]>(`${path}${separator}page=${page}&size=${size}`);
    if (Array.isArray(data)) return data;

    const content = Array.isArray(data.content) ? data.content : [];
    all.push(...content);

    const reachedEndByFlag = typeof data.last === 'boolean' ? data.last : false;
    const reachedEndByPages =
      typeof data.totalPages === 'number' ? page >= Math.max(0, data.totalPages - 1) : false;
    const reachedEndBySize = content.length < size;

    if (reachedEndByFlag || reachedEndByPages || reachedEndBySize) break;
    page += 1;
  }

  return all;
}

const toPercent = (value: number) => Math.round(value * 10) / 10;

const Relatorios: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [turmas, setTurmas] = useState<TurmaApi[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoApi[]>([]);
  const [notas, setNotas] = useState<NotaApi[]>([]);
  const [frequencias, setFrequencias] = useState<FrequenciaApi[]>([]);
  const [turma, setTurma] = useState<string>('todas');
  const [bimestre, setBimestre] = useState<string>('todos');

  const carregarDados = useCallback(async () => {
    if (!API_URL) {
      setErro('API não configurada. Defina VITE_API_URL para carregar dados do banco.');
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      const [turmasData, periodosData, notasData, frequenciasData] = await Promise.all([
        fetchAllPages<TurmaApi>('/api/turmas'),
        fetchAllPages<PeriodoApi>('/api/periodos'),
        fetchAllPages<NotaApi>('/api/notas'),
        fetchAllPages<FrequenciaApi>('/api/frequencias'),
      ]);
      setTurmas(turmasData);
      setPeriodos(periodosData);
      setNotas(notasData);
      setFrequencias(frequenciasData);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  const podeGerar = useMemo(() => Boolean(turma && bimestre) && !loading, [turma, bimestre, loading]);

  const cardsRelatorio = useMemo(
    () => [
      {
        key: 'por-aluno',
        title: 'Relatório de Desempenho por Aluno',
        description: 'Notas, frequência e evolução individual',
        icon: Users,
        tone: 'cyan',
      },
      {
        key: 'consolidado',
        title: 'Relatório Consolidado por Turma',
        description: 'Visão geral de todas as turmas',
        icon: BarChart3,
        tone: 'orange',
      },
      {
        key: 'comparativo',
        title: 'Comparativo Entre Turmas',
        description: 'Análise comparativa de desempenho',
        icon: TrendingUp,
        tone: 'green',
      },
    ],
    [],
  );

  const periodosMap = useMemo(() => {
    const map = new Map<number, string>();
    periodos.forEach((p) => {
      map.set(p.id, p.nome?.trim() || `Período ${p.id}`);
    });
    return map;
  }, [periodos]);

  const notasFiltradas = useMemo(() => {
    return notas.filter((n) => {
      if (turma !== 'todas' && String(n.turmaId ?? '') !== turma) return false;
      if (bimestre !== 'todos' && String(n.periodoId ?? '') !== bimestre) return false;
      return true;
    });
  }, [notas, turma, bimestre]);

  const frequenciasFiltradas = useMemo(() => {
    return frequencias.filter((f) => {
      if (turma !== 'todas' && String(f.turmaId ?? '') !== turma) return false;
      return true;
    });
  }, [frequencias, turma]);

  const distribuicaoNotas = useMemo(() => {
    const faixas = [
      { faixa: '0-4', min: 0, max: 4.99, color: '#ef4444', value: 0 },
      { faixa: '5-6', min: 5, max: 6.99, color: '#f59e0b', value: 0 },
      { faixa: '7-8', min: 7, max: 8.99, color: '#06b6d4', value: 0 },
      { faixa: '9-10', min: 9, max: 10, color: '#22c55e', value: 0 },
    ];

    notasFiltradas.forEach((n) => {
      const valor = Number(n.valor);
      if (!Number.isFinite(valor)) return;
      const idx = faixas.findIndex((f) => valor >= f.min && valor <= f.max);
      if (idx >= 0) faixas[idx].value += 1;
    });

    return faixas.map(({ faixa, value, color }) => ({ faixa, value, color }));
  }, [notasFiltradas]);

  const turmasNoComparativo = useMemo(() => {
    if (turma === 'todas') return turmas;
    return turmas.filter((t) => String(t.id) === turma);
  }, [turma, turmas]);

  const comparativoTurma = useMemo(() => {
    return turmasNoComparativo.map((t) => {
      const notasTurma = notasFiltradas.filter((n) => n.turmaId === t.id);
      const somaNotas = notasTurma.reduce((acc, item) => acc + (Number(item.valor) || 0), 0);
      const media = notasTurma.length > 0 ? toPercent(somaNotas / notasTurma.length) : 0;

      const freqTurma = frequenciasFiltradas.filter((f) => f.turmaId === t.id);
      const total = freqTurma.length;
      const presentes = freqTurma.filter((f) => f.presente === true).length;
      const frequenciaPct = total > 0 ? toPercent((presentes / total) * 100) : 0;

      return {
        turmaId: t.id,
        turma: t.nome?.trim() || `Turma ${t.id}`,
        media,
        frequencia: frequenciaPct,
      };
    });
  }, [turmasNoComparativo, notasFiltradas, frequenciasFiltradas]);

  const resumo = useMemo(() => {
    const melhorTurma =
      comparativoTurma.length > 0
        ? [...comparativoTurma].sort((a, b) => b.media - a.media)[0]
        : null;
    const turmaMaisFaltas =
      comparativoTurma.length > 0
        ? [...comparativoTurma].sort((a, b) => a.frequencia - b.frequencia)[0]
        : null;

    const alunosRecuperacaoIds = new Set(
      notasFiltradas.filter((n) => Number(n.valor) < 6 && n.alunoId != null).map((n) => n.alunoId as number),
    );
    const totalAlunosIds = new Set(
      notasFiltradas.filter((n) => n.alunoId != null).map((n) => n.alunoId as number),
    );
    const aprovadas = notasFiltradas.filter((n) => Number(n.valor) >= 6).length;
    const taxaAprovacao = notasFiltradas.length > 0 ? toPercent((aprovadas / notasFiltradas.length) * 100) : 0;
    const pctRecuperacao =
      totalAlunosIds.size > 0 ? toPercent((alunosRecuperacaoIds.size / totalAlunosIds.size) * 100) : 0;

    return {
      melhorTurma,
      turmaMaisFaltas,
      alunosRecuperacao: alunosRecuperacaoIds.size,
      pctRecuperacao,
      taxaAprovacao,
    };
  }, [comparativoTurma, notasFiltradas]);

  const handleExportar = (tipo: 'PDF' | 'Excel') => {
    if (tipo === 'Excel') {
      const linhas = [
        'Turma;Media;Frequencia',
        ...comparativoTurma.map((item) => `${item.turma};${item.media};${item.frequencia}`),
      ];
      const blob = new Blob([linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'relatorio-comparativo.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast({ title: 'Exportação concluída', description: 'Arquivo CSV gerado com dados do banco.' });
      return;
    }

    window.print();
    toast({
      title: 'Exportação PDF',
      description: 'Janela de impressão aberta para salvar em PDF.',
    });
  };

  const handleGerar = (origem?: string) => {
    void carregarDados().then(() =>
      toast({
        title: 'Relatório atualizado',
        description: origem
          ? `Dados recarregados do banco para: ${origem}.`
          : 'Dados recarregados do banco com sucesso.',
      }),
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Relatórios</h1>
            <p className="text-muted-foreground">Análises de desempenho e frequência</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="gap-2" onClick={() => handleExportar('Excel')}>
              <FileDown className="h-4 w-4" />
              Exportar Excel
            </Button>
            <Button variant="gradient" className="gap-2" onClick={() => handleExportar('PDF')}>
              <FileDown className="h-4 w-4" />
              Exportar PDF
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Select value={turma} onValueChange={setTurma}>
            <SelectTrigger className="w-full md:w-[220px]">
              <SelectValue placeholder="Todas as turmas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as turmas</SelectItem>
              {turmas.map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>
                  {item.nome?.trim() || `Turma ${item.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={bimestre} onValueChange={setBimestre}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Todos os períodos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os períodos</SelectItem>
              {periodos.map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>
                  {periodosMap.get(item.id) ?? `Período ${item.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1" />
          <Button variant="outline" disabled={!podeGerar} onClick={() => handleGerar('filtros')}>
            {loading ? 'Carregando...' : 'Gerar Relatório'}
          </Button>
        </div>

        {erro && (
          <Card>
            <CardContent className="pt-6 text-sm text-destructive">{erro}</CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {cardsRelatorio.map((item) => {
            const Icon = item.icon;
            const toneClasses =
              item.tone === 'cyan'
                ? 'bg-cyan-500/15 text-cyan-300'
                : item.tone === 'orange'
                  ? 'bg-orange-500/15 text-orange-300'
                  : 'bg-emerald-500/15 text-emerald-300';

            return (
              <Card key={item.key} className="overflow-hidden">
                <CardContent className="p-6 space-y-4">
                  <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center', toneClasses)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display font-semibold text-base">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleGerar(item.title)}
                  >
                    <FileDown className="h-4 w-4" />
                    Gerar Relatório
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <h2 className="font-display text-lg font-semibold">Distribuição de Notas</h2>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distribuicaoNotas}
                      dataKey="value"
                      nameKey="faixa"
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={2}
                      stroke="rgba(255,255,255,0.08)"
                      label={({ cx, cy, midAngle, outerRadius, index }) => {
                        const RADIAN = Math.PI / 180;
                        const safeIndex = typeof index === 'number' ? index : -1;
                        const item = distribuicaoNotas[safeIndex];
                        if (!item) return null;

                        const safeOuterRadius = typeof outerRadius === 'number' ? outerRadius : 110;
                        const radius = safeOuterRadius + 18;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                          <text
                            x={x}
                            y={y}
                            fill={item.color}
                            textAnchor={x > cx ? 'start' : 'end'}
                            dominantBaseline="central"
                            fontSize={12}
                          >
                            {item.faixa}: {item.value}
                          </text>
                        );
                      }}
                    >
                      {distribuicaoNotas.map((entry) => (
                        <Cell key={entry.faixa} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
                {distribuicaoNotas.map((item) => (
                  <div key={item.faixa} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: item.color }} />
                    <span>{item.faixa}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <h2 className="font-display text-lg font-semibold">Comparativo por Turma</h2>
            </CardHeader>
            <CardContent className="pt-0">
              <ChartContainer
                className="aspect-[2/1] w-full"
                config={{
                  media: { label: 'Média', color: '#06b6d4' },
                  frequencia: { label: 'Frequência %', color: '#22c55e' },
                }}
              >
                <BarChart data={comparativoTurma} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="turma" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="media" fill="var(--color-media)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="frequencia" fill="var(--color-frequencia)" radius={[6, 6, 0, 0]} />
                  <ChartLegend content={<ChartLegendContent />} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <h2 className="font-display text-lg font-semibold">Resumo Geral</h2>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Melhor Turma</p>
                  <p className="mt-1 text-lg font-semibold">{resumo.melhorTurma?.turma ?? '-'}</p>
                  <p className="text-xs text-emerald-400">Média: {resumo.melhorTurma?.media ?? 0}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Turma com Mais Faltas</p>
                  <p className="mt-1 text-lg font-semibold">{resumo.turmaMaisFaltas?.turma ?? '-'}</p>
                  <p className="text-xs text-red-400">Frequência: {resumo.turmaMaisFaltas?.frequencia ?? 0}%</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Alunos em Recuperação</p>
                  <p className="mt-1 text-lg font-semibold">{resumo.alunosRecuperacao}</p>
                  <p className="text-xs text-muted-foreground">{resumo.pctRecuperacao}% do total</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Taxa de Aprovação</p>
                  <p className="mt-1 text-lg font-semibold">{resumo.taxaAprovacao}%</p>
                  <p className="text-xs text-muted-foreground">Com base nas notas lançadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Relatorios;

