import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const Agenda: React.FC = () => {
  const [mesAtual, setMesAtual] = useState(() => new Date());
  const [dataSelecionada, setDataSelecionada] = useState(() => new Date());

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

  const { dias, mesLabel } = useMemo(() => {
    const ano = mesAtual.getFullYear();
    const mes = mesAtual.getMonth();
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    const totalDias = ultimoDia.getDate();
    const inicioSemana = primeiroDia.getDay();
    const placeholders = Array.from({ length: inicioSemana }, () => null);
    const diasMes = Array.from({ length: totalDias }, (_, index) => index + 1);
    const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
      mesAtual,
    );
    const labelFormatado = label.charAt(0).toUpperCase() + label.slice(1);
    return { dias: [...placeholders, ...diasMes], mesLabel: labelFormatado };
  }, [mesAtual]);

  const handleMesAnterior = () => {
    setMesAtual((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleMesProximo = () => {
    setMesAtual((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleSelecionarDia = (dia: number) => {
    setDataSelecionada(new Date(mesAtual.getFullYear(), mesAtual.getMonth(), dia));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Agenda</h1>
            <p className="text-muted-foreground">Organize seus compromissos e prazos</p>
          </div>
          <Button variant="gradient" className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Evento
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={handleMesAnterior}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-semibold text-foreground">{mesLabel}</span>
                <Button variant="ghost" size="icon" onClick={handleMesProximo}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground">
                {diasSemana.map((dia) => (
                  <span key={dia} className="text-center">
                    {dia}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {dias.map((dia, index) => {
                  if (!dia) {
                    return <div key={`empty-${index}`} />;
                  }
                  const isSelecionado =
                    dataSelecionada.getDate() === dia &&
                    dataSelecionada.getMonth() === mesAtual.getMonth() &&
                    dataSelecionada.getFullYear() === mesAtual.getFullYear();
                  return (
                    <button
                      key={`dia-${dia}`}
                      type="button"
                      onClick={() => handleSelecionarDia(dia)}
                      className={cn(
                        'h-9 rounded-lg border border-border/60 text-sm transition-colors',
                        isSelecionado
                          ? 'border-primary/60 bg-primary/10 text-foreground'
                          : 'text-muted-foreground hover:bg-muted/30',
                      )}
                    >
                      {dia}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Próximos Eventos</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="destructive">Prova</Badge>
                <Badge className="bg-primary/20 text-primary hover:bg-primary/30">Trabalho</Badge>
                <Badge className="bg-warning/20 text-warning-foreground hover:bg-warning/30">
                  Reunião
                </Badge>
                <Badge className="bg-secondary text-secondary-foreground">Prazo</Badge>
                <Badge variant="outline">Evento</Badge>
              </div>
              <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                Nenhum evento cadastrado ainda
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Agenda;
