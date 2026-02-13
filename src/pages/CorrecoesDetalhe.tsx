import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function CorrecoesDetalhe() {
  const location = useLocation();
  const state = location.state as
    | {
        alunosIds?: string[];
        turma?: string;
        materia?: string;
        turno?: string;
      }
    | undefined;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/correcoes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Correção</h1>
            <p className="text-muted-foreground">
              {state?.materia} {state?.turma ? `• ${state.turma}` : ''}
            </p>
          </div>
        </div>

        <Card className="p-6 space-y-2">
          <p className="text-sm text-muted-foreground">
            Tela de correção carregada.
          </p>
          <p className="text-sm text-muted-foreground">
            Turno: {state?.turno || '-'}
          </p>
          <p className="text-sm text-muted-foreground">
            Alunos selecionados: {state?.alunosIds?.length ?? 0}
          </p>
        </Card>
      </div>
    </DashboardLayout>
  );
}
