import React, { useMemo, useState } from 'react';
import { Calendar, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { loadFromStorage } from '@/lib/mockStorage';
import { cn } from '@/lib/utils';

interface Prova {
  id: string;
  titulo: string;
  turma: string;
  disciplina: string;
  periodo: string;
  data: string;
  horario: string;
  publicada?: boolean;
}

const provasStorageKey = 'school-compass:provas';

const formatDate = (value?: string) => {
  if (!value) return '';
  if (value.includes('-')) {
    const [yyyy, mm, dd] = value.split('-');
    if (yyyy && mm && dd) return `${dd}/${mm}/${yyyy}`;
  }
  return value;
};

const getTurmaShort = (value?: string) => {
  if (!value) return '';
  const normalized = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const match = normalized.match(/(\d+)\s*(?:ano)?\s*([a-z])/i);
  if (match) return `${match[1]}${match[2]}`.toLowerCase();
  return normalized.replace(/[^a-z0-9]/g, '');
};

export default function ProvasAluno() {
  const navigate = useNavigate();
  const [materia, setMateria] = useState('');
  const [pesquisaAtiva, setPesquisaAtiva] = useState(false);

  const provas = useMemo(() => loadFromStorage<Prova[]>(provasStorageKey, []), []);

  const disciplinasDisponiveis = useMemo(() => {
    const disciplinas = Array.from(new Set(provas.map((p) => p.disciplina).filter(Boolean)));
    return disciplinas.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  }, [provas]);

  const provasFiltradas = useMemo(() => {
    const publicadas = provas.filter((p) => p.publicada);
    if (!pesquisaAtiva) return [];
    if (!materia) return [];
    return publicadas
      .filter((p) => p.disciplina === materia)
      .sort((a, b) => String(a.data).localeCompare(String(b.data)));
  }, [provas, pesquisaAtiva, materia]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Provas</h1>
          <p className="text-muted-foreground">
            Pesquise por matéria para ver as provas disponíveis.
          </p>
        </div>

        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Filtro</h2>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2 w-full md:max-w-sm">
              <Label>Matéria</Label>
              <Select value={materia} onValueChange={setMateria}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a matéria" />
                </SelectTrigger>
                <SelectContent>
                  {disciplinasDisponiveis.map((disc) => (
                    <SelectItem key={disc} value={disc}>
                      {disc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="gradient"
              className="gap-2 self-start md:self-auto"
              onClick={() => setPesquisaAtiva(true)}
              disabled={!materia}
            >
              <Search className="w-4 h-4" />
              Pesquisar
            </Button>
          </div>
        </Card>

        {pesquisaAtiva && materia && provasFiltradas.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhuma prova disponível para essa matéria.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {provasFiltradas.map((prova) => (
              <Card
                key={prova.id}
                className={cn('card-hover cursor-pointer')}
                onClick={() => navigate(`/provas/${prova.id}`)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Disponível</Badge>
                    <span className="text-xs text-muted-foreground">{getTurmaShort(prova.turma)}</span>
                  </div>
                  <CardTitle className="text-lg">{prova.titulo}</CardTitle>
                  <CardDescription>{prova.disciplina}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {formatDate(prova.data)} {prova.horario ? `• ${prova.horario}` : ''}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

