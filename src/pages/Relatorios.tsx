import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';

const Relatorios: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">
            Visualize indicadores e relatórios do professor.
          </p>
        </div>

        <Card className="p-6">
          <p className="text-sm text-muted-foreground">
            Nenhum relatório disponível no momento.
          </p>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Relatorios;
