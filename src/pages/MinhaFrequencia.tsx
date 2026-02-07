import React, { useMemo, useState } from 'react';
import { Calendar, UserCheck } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { loadFromStorage } from '@/lib/mockStorage';

interface FrequenciaItem {
  id: string;
  disciplina: string;
  presenca: number;
  faltas: number;
}

const storageKey = 'school-compass:minha-frequencia';

const defaultFrequencias: FrequenciaItem[] = [
  { id: 'MAT', disciplina: 'Matematica', presenca: 95, faltas: 2 },
  { id: 'POR', disciplina: 'Portugues', presenca: 92, faltas: 3 },
  { id: 'HIS', disciplina: 'Historia', presenca: 98, faltas: 1 },
  { id: 'GEO', disciplina: 'Geografia', presenca: 90, faltas: 4 },
];

const MinhaFrequencia: React.FC = () => {
  const [frequencias, setFrequencias] = useState<FrequenciaItem[]>(
    () => loadFromStorage<FrequenciaItem[]>(storageKey, defaultFrequencias),
  );

  const media = useMemo(() => {
    if (frequencias.length === 0) return 0;
    return (
      Math.round((frequencias.reduce((acc, item) => acc + item.presenca, 0) / frequencias.length) * 10) /
      10
    );
  }, [frequencias]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Minha frequencia
            </h1>
            <p className="text-muted-foreground">
              Acompanhe a frequencia por disciplina e seu historico geral.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Frequencia geral
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">{media}%</div>
              </div>
              <UserCheck className="w-5 h-5 text-success" />
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ultima atualizacao
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">Ontem</div>
              </div>
              <Calendar className="w-5 h-5 text-primary" />
            </CardHeader>
          </Card>
        </div>

        {frequencias.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhuma frequencia cadastrada. Clique em "Nova disciplina".
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {frequencias.map((item) => (
              <Card key={item.id} className="card-hover">
                <CardHeader>
                  <CardTitle className="text-lg">{item.disciplina}</CardTitle>
                  <CardDescription>
                    Faltas registradas: {item.faltas}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-success"
                          style={{ width: `${item.presenca}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {item.presenca}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Somente leitura para alunos.
                    </span>
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

export default MinhaFrequencia;
