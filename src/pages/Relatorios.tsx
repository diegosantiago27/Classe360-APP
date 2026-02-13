import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';
import { BarChart3, FileDown, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const Relatorios: React.FC = () => {
  const { toast } = useToast();
  const [turma, setTurma] = useState<string>('todas');
  const [bimestre, setBimestre] = useState<string>('1');

  const podeGerar = useMemo(() => Boolean(turma && bimestre), [turma, bimestre]);

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

  const distribuicaoNotas = useMemo(
    () => [
      { faixa: '0-4', value: 5, color: '#ef4444' },
      { faixa: '5-6', value: 18, color: '#f59e0b' },
      { faixa: '7-8', value: 42, color: '#06b6d4' },
      { faixa: '9-10', value: 35, color: '#22c55e' },
    ],
    [],
  );

  const comparativoTurma = useMemo(
    () => [
      { turma: '9º A', media: 7.9, frequencia: 92 },
      { turma: '9º B', media: 7.7, frequencia: 94 },
      { turma: '8º A', media: 7.6, frequencia: 90 },
      { turma: '8º B', media: 7.8, frequencia: 95 },
      { turma: '7º A', media: 7.4, frequencia: 88 },
      { turma: '7º B', media: 7.5, frequencia: 91 },
    ],
    [],
  );

  const handleExportar = (tipo: 'PDF' | 'Excel') => {
    toast({
      title: `Exportação (${tipo})`,
      description: 'Funcionalidade de exportação em desenvolvimento.',
    });
  };

  const handleGerar = (origem?: string) => {
    toast({
      title: 'Relatório gerado',
      description: origem ? `Relatório (${origem}) em desenvolvimento (mock).` : 'Visualização em desenvolvimento (mock).',
    });
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
              <SelectItem value="9a">9º A</SelectItem>
              <SelectItem value="9b">9º B</SelectItem>
              <SelectItem value="8a">8º A</SelectItem>
              <SelectItem value="8b">8º B</SelectItem>
              <SelectItem value="7a">7º A</SelectItem>
              <SelectItem value="7b">7º B</SelectItem>
            </SelectContent>
          </Select>

          <Select value={bimestre} onValueChange={setBimestre}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="1º Bimestre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1º Bimestre</SelectItem>
              <SelectItem value="2">2º Bimestre</SelectItem>
              <SelectItem value="3">3º Bimestre</SelectItem>
              <SelectItem value="4">4º Bimestre</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1" />
          <Button variant="outline" disabled={!podeGerar} onClick={() => handleGerar('filtros')}>
            Gerar Relatório
          </Button>
        </div>

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
                <p className="mt-1 text-lg font-semibold">9º B</p>
                <p className="text-xs text-emerald-400">Média: 8.2</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Turma com Mais Faltas</p>
                <p className="mt-1 text-lg font-semibold">7º A</p>
                <p className="text-xs text-red-400">Frequência: 85%</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Alunos em Recuperação</p>
                <p className="mt-1 text-lg font-semibold">23</p>
                <p className="text-xs text-muted-foreground">13% do total</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Taxa de Aprovação</p>
                <p className="mt-1 text-lg font-semibold">87%</p>
                <p className="text-xs text-muted-foreground">Acima da meta</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Relatorios;

