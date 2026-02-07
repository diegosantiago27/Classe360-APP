import React from 'react';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface FeaturePageProps {
  title: string;
  description?: string;
  helperText?: string;
  actionLabel?: string;
  actionTo?: string;
}

const FeaturePage: React.FC<FeaturePageProps> = ({
  title,
  description,
  helperText = 'Esta funcionalidade esta em finalizacao para ficar completa e integrada.',
  actionLabel = 'Voltar ao painel',
  actionTo = '/index',
}) => {
  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        <div className="animate-fade-in">
          <h1 className="font-display font-bold text-3xl text-foreground mb-2">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>

        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Info className="w-5 h-5 text-primary" />
              Em andamento
            </CardTitle>
            <CardDescription>
              Estamos organizando os detalhes finais desta area.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{helperText}</p>
            <Button asChild variant="gradient">
              <Link to={actionTo}>{actionLabel}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default FeaturePage;
