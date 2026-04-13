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
import { getInstituicaoApi, type UsuarioApi, type DisciplinaTurmaApi } from '@/lib/entityCrudApi';
import { gerarRelatorioDesempenhoPdf } from '@/lib/relatorioDesempenhoPdf';
import {
  gerarRelatorioDesempenhoIndividualPdf,
  montarPayloadRelatorioIndividual,
} from '@/lib/relatorioDesempenhoIndividualPdf';
import {
  gerarRelatorioConsolidadoTurmaPdf,
  montarPayloadConsolidadoTurma,
} from '@/lib/relatorioConsolidadoTurmaPdf';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

interface TurmaApi {
  id: number;
  nome?: string;
}

interface PeriodoApi {
  id: number;
  nome?: string;
}

interface DisciplinaApi {
  id: number;
  nome?: string;
}

interface NotaApi {
  id: number;
  alunoId?: number | null;
  turmaId?: number | null;
  disciplinaId?: number | null;
  periodoId?: number | null;
  valor?: number | null;
}

interface FrequenciaApi {
  id: number;
  alunoId?: number | null;
  turmaId?: number | null;
  disciplinaId?: number | null;
  data?: string | null;
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
  const [disciplinas, setDisciplinas] = useState<DisciplinaApi[]>([]);
  const [notas, setNotas] = useState<NotaApi[]>([]);
  const [frequencias, setFrequencias] = useState<FrequenciaApi[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioApi[]>([]);
  const [vinculos, setVinculos] = useState<DisciplinaTurmaApi[]>([]);
  const [turma, setTurma] = useState<string>('todas');
  const [bimestre, setBimestre] = useState<string>('todos');
  const [alunoSelecionado, setAlunoSelecionado] = useState<string>('nenhum');

  const carregarDados = useCallback(async () => {
    if (!API_URL) {
      setErro('API não configurada. Defina VITE_API_URL para carregar dados do banco.');
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      const [
        turmasData,
        periodosData,
        disciplinasData,
        notasData,
        frequenciasData,
        usuariosData,
        vinculosData,
      ] = await Promise.all([
        fetchAllPages<TurmaApi>('/api/turmas'),
        fetchAllPages<PeriodoApi>('/api/periodos'),
        fetchAllPages<DisciplinaApi>('/api/disciplinas'),
        fetchAllPages<NotaApi>('/api/notas'),
        fetchAllPages<FrequenciaApi>('/api/frequencias'),
        fetchAllPages<UsuarioApi>('/api/usuarios'),
        fetchAllPages<DisciplinaTurmaApi>('/api/disciplina-turmas'),
      ]);
      setTurmas(turmasData);
      setPeriodos(periodosData);
      setDisciplinas(disciplinasData);
      setNotas(notasData);
      setFrequencias(frequenciasData);
      setUsuarios(usuariosData);
      setVinculos(vinculosData);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

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

  const disciplinasMap = useMemo(() => {
    const map = new Map<number, string>();
    disciplinas.forEach((d) => {
      map.set(d.id, d.nome?.trim() || `Disciplina ${d.id}`);
    });
    return map;
  }, [disciplinas]);

  const turmasMap = useMemo(() => {
    const map = new Map<number, string>();
    turmas.forEach((t) => {
      map.set(t.id, t.nome?.trim() || `Turma ${t.id}`);
    });
    return map;
  }, [turmas]);

  const alunosFiltrados = useMemo(() => {
    return usuarios
      .filter((u) => String(u.role ?? '').toUpperCase().includes('ALUNO'))
      .filter((u) => u.ativo !== false)
      .sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR'));
  }, [usuarios]);

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

  const dadosPdfDesempenho = useMemo(() => {
    const turmasAlvo = turma === 'todas' ? turmas : turmas.filter((t) => String(t.id) === turma);
    const nomeDisc = (id: number) => disciplinasMap.get(id) ?? `Disciplina ${id}`;

    const resumoTurmas = turmasAlvo.map((t) => {
      const notasT = notasFiltradas.filter((n) => n.turmaId === t.id);
      const alunosIds = new Set(notasT.map((n) => n.alunoId).filter((x): x is number => x != null));
      const media =
        notasT.length > 0
          ? toPercent(notasT.reduce((s, n) => s + (Number(n.valor) || 0), 0) / notasT.length)
          : 0;
      const freqTurma = frequenciasFiltradas.filter((f) => f.turmaId === t.id);
      const frequenciaPct =
        freqTurma.length > 0
          ? toPercent((freqTurma.filter((f) => f.presente === true).length / freqTurma.length) * 100)
          : 0;

      const mediasPorAluno = new Map<number, number[]>();
      notasT.forEach((n) => {
        if (n.alunoId == null) return;
        if (!mediasPorAluno.has(n.alunoId)) mediasPorAluno.set(n.alunoId, []);
        mediasPorAluno.get(n.alunoId)!.push(Number(n.valor) || 0);
      });
      let aprov = 0;
      let rec = 0;
      let rep = 0;
      mediasPorAluno.forEach((vals) => {
        const m = vals.reduce((a, b) => a + b, 0) / vals.length;
        if (m >= 7) aprov++;
        else if (m >= 5) rec++;
        else rep++;
      });

      return {
        turma: t.nome?.trim() || `Turma ${t.id}`,
        alunos: alunosIds.size,
        media,
        freqPct: frequenciaPct,
        aprovados: aprov,
        recuperacao: rec,
        reprovados: rep,
      };
    });

    const comparativo = comparativoTurma.map((c) => ({
      turma: c.turma,
      media: c.media,
      frequencia: c.frequencia,
    }));

    const discIds = [
      ...new Set(
        notasFiltradas
          .map((n) => n.disciplinaId)
          .filter((x): x is number => x != null && Number.isFinite(Number(x))),
      ),
    ];

    const rankingDisciplinas: Array<{
      disciplina: string;
      primeiroLugar: string;
      media1: number;
      segundoLugar: string;
      media2: number;
    }> = [];
    const comparativoDisciplinas: Array<{
      disciplina: string;
      col1Turma: string;
      col1Media: number;
      col2Turma: string;
      col2Media: number;
    }> = [];

    for (const dId of discIds) {
      const notasD = notasFiltradas.filter((n) => n.disciplinaId === dId);
      const turmaIds = [
        ...new Set(
          notasD.map((n) => n.turmaId).filter((x): x is number => x != null && Number.isFinite(Number(x))),
        ),
      ];
      const avgs: Array<{ media: number; nome: string }> = [];
      turmaIds.forEach((tid) => {
        const nx = notasD.filter((n) => n.turmaId === tid);
        const media =
          nx.length > 0
            ? toPercent(nx.reduce((s, n) => s + (Number(n.valor) || 0), 0) / nx.length)
            : 0;
        const nome = turmas.find((tt) => tt.id === tid)?.nome?.trim() ?? `Turma ${tid}`;
        avgs.push({ media, nome });
      });
      avgs.sort((a, b) => b.media - a.media);
      const first = avgs[0];
      const second = avgs[1];
      rankingDisciplinas.push({
        disciplina: nomeDisc(dId),
        primeiroLugar: first?.nome ?? '—',
        media1: first?.media ?? 0,
        segundoLugar: second?.nome ?? '—',
        media2: second?.media ?? 0,
      });
      comparativoDisciplinas.push({
        disciplina: nomeDisc(dId),
        col1Turma: first?.nome ?? '—',
        col1Media: first?.media ?? 0,
        col2Turma: second?.nome ?? '—',
        col2Media: second?.media ?? 0,
      });
    }

    return { resumoTurmas, comparativo, rankingDisciplinas, comparativoDisciplinas };
  }, [turma, turmas, notasFiltradas, frequenciasFiltradas, comparativoTurma, disciplinasMap]);

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

  const handleGerarPdfComparativoTurmas = async () => {
    if (!API_URL) {
      toast({
        title: 'API não configurada',
        description: 'Defina VITE_API_URL para gerar o PDF.',
        variant: 'destructive',
      });
      return;
    }
    try {
      let escola = 'Escola';
      try {
        const inst = await getInstituicaoApi();
        escola = inst?.nome?.trim() || escola;
      } catch {
        /* mantém padrão */
      }
      const periodoLabel =
        bimestre === 'todos'
          ? 'Todos os períodos'
          : periodosMap.get(Number(bimestre)) ?? `Período ${bimestre}`;
      gerarRelatorioDesempenhoPdf({
        escolaNome: escola,
        periodoLabel,
        comparativo: dadosPdfDesempenho.comparativo,
        resumoTurmas: dadosPdfDesempenho.resumoTurmas,
        rankingDisciplinas: dadosPdfDesempenho.rankingDisciplinas,
        comparativoDisciplinas: dadosPdfDesempenho.comparativoDisciplinas,
      });
      toast({
        title: 'PDF gerado',
        description: 'Relatório comparativo entre turmas — download iniciado.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao gerar PDF',
        description: error instanceof Error ? error.message : 'Falha desconhecida',
        variant: 'destructive',
      });
    }
  };

  const handleGerarPdfDesempenhoIndividual = async () => {
    if (!API_URL) {
      toast({
        title: 'API não configurada',
        description: 'Defina VITE_API_URL para gerar o PDF.',
        variant: 'destructive',
      });
      return;
    }
    if (alunoSelecionado === 'nenhum') {
      toast({
        title: 'Selecione um aluno',
        description: 'Escolha o aluno no campo acima para gerar o relatório individual.',
        variant: 'destructive',
      });
      return;
    }
    const aid = Number(alunoSelecionado);
    if (!Number.isFinite(aid)) {
      toast({ title: 'Aluno inválido', variant: 'destructive' });
      return;
    }
    try {
      let escola = 'Escola';
      try {
        const inst = await getInstituicaoApi();
        escola = inst?.nome?.trim() || escola;
      } catch {
        /* mantém padrão */
      }
      const usuarioAluno = usuarios.find((u) => Number(u.id) === aid);
      const nome = usuarioAluno?.nome?.trim() ?? `Aluno ${aid}`;
      const payload = montarPayloadRelatorioIndividual({
        alunoId: aid,
        alunoNome: nome,
        alunoCpf: usuarioAluno?.cpf,
        notas,
        frequencias,
        periodos,
        disciplinasMap,
        turmasMap,
        vinculos,
        turmaFiltro: turma,
        bimestreFiltro: bimestre,
        periodosMap,
        escolaNome: escola,
      });
      if (!payload) {
        toast({
          title: 'Sem dados para o PDF',
          description:
            'Não há notas deste aluno com os filtros de turma/período atuais. Ajuste os filtros ou o aluno.',
          variant: 'destructive',
        });
        return;
      }
      gerarRelatorioDesempenhoIndividualPdf(payload);
      toast({
        title: 'PDF gerado',
        description: 'Relatório de desempenho individual — download iniciado.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao gerar PDF',
        description: error instanceof Error ? error.message : 'Falha desconhecida',
        variant: 'destructive',
      });
    }
  };

  const handleGerarPdfConsolidadoTurma = async () => {
    if (!API_URL) {
      toast({
        title: 'API não configurada',
        description: 'Defina VITE_API_URL para gerar o PDF.',
        variant: 'destructive',
      });
      return;
    }
    if (turma === 'todas') {
      toast({
        title: 'Selecione uma turma',
        description: 'Escolha uma turma no filtro para gerar o consolidado.',
        variant: 'destructive',
      });
      return;
    }
    const tid = Number(turma);
    if (!Number.isFinite(tid)) {
      toast({ title: 'Turma inválida', variant: 'destructive' });
      return;
    }
    try {
      let escola = 'Escola';
      try {
        const inst = await getInstituicaoApi();
        escola = inst?.nome?.trim() || escola;
      } catch {
        /* mantém padrão */
      }
      const turmaNome = turmasMap.get(tid) ?? `Turma ${tid}`;
      const payload = montarPayloadConsolidadoTurma({
        turmaId: tid,
        turmaNome,
        notas,
        frequencias,
        usuarios,
        disciplinasMap,
        vinculos,
        bimestreFiltro: bimestre,
        periodosMap,
        escolaNome: escola,
      });
      if (!payload) {
        toast({
          title: 'Sem dados para o PDF',
          description: 'Não há notas para esta turma com o período selecionado.',
          variant: 'destructive',
        });
        return;
      }
      gerarRelatorioConsolidadoTurmaPdf(payload);
      toast({
        title: 'PDF gerado',
        description: 'Relatório consolidado por turma — download iniciado.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao gerar PDF',
        description: error instanceof Error ? error.message : 'Falha desconhecida',
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">Análises de desempenho e frequência</p>
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

          <Select value={alunoSelecionado} onValueChange={setAlunoSelecionado}>
            <SelectTrigger className="w-full md:w-[260px]">
              <SelectValue placeholder="Aluno (relatório individual)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nenhum">Nenhum (só para PDF por aluno)</SelectItem>
              {alunosFiltrados.map((u) => (
                <SelectItem key={String(u.id)} value={String(u.id ?? '')}>
                  {u.nome?.trim() ?? `Aluno ${u.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                    onClick={() => {
                      if (item.key === 'comparativo') {
                        void handleGerarPdfComparativoTurmas();
                      } else if (item.key === 'consolidado') {
                        void handleGerarPdfConsolidadoTurma();
                      } else if (item.key === 'por-aluno') {
                        void handleGerarPdfDesempenhoIndividual();
                      }
                    }}
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

