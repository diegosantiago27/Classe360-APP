import React, { useMemo, useState } from 'react';
import { BookOpen, Calendar, CheckCircle2, ClipboardList } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { loadFromStorage } from '@/lib/mockStorage';
import { useAuth } from '@/contexts/AuthContext';
import {
  MateriaAluno,
  defaultMateriasAluno,
  materiasAlunoStorageKey,
} from '@/lib/mockMateriasAluno';
import { Link } from 'react-router-dom';

const MinhasMaterias: React.FC = () => {
  const { user } = useAuth();
  const materias = useMemo(
    () => loadFromStorage<MateriaAluno[]>(materiasAlunoStorageKey, defaultMateriasAluno),
    [],
  );
  const materiasFiltradas = useMemo(
    () => materias.filter((item) => !item.alunoId || item.alunoId === user?.id),
    [materias, user],
  );
  const [materiaSelecionada, setMateriaSelecionada] = useState<MateriaAluno | null>(
    materiasFiltradas[0] ?? null,
  );

  const handleSelecionar = (materia: MateriaAluno) => {
    setMateriaSelecionada(materia);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Minhas materias
            </h1>
            <p className="text-muted-foreground">
              Selecione uma disciplina para ver detalhes da sua turma.
            </p>
          </div>
          <Link to="/atividades">
            <Button variant="gradient">
              <ClipboardList className="w-4 h-4" />
              Ver atividades
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-1">
            {materiasFiltradas.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nenhuma materia cadastrada para o aluno.
              </div>
            ) : (
              materiasFiltradas.map((materia) => (
                <Card
                  key={materia.id}
                  className={`cursor-pointer transition-colors ${
                    materiaSelecionada?.id === materia.id ? 'border-primary/60' : 'card-hover'
                  }`}
                  onClick={() => handleSelecionar(materia)}
                >
                  <CardHeader>
                    <CardTitle className="text-base">{materia.disciplina}</CardTitle>
                    <p className="text-xs text-muted-foreground">{materia.professor}</p>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    {materia.turma} • {materia.turno}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            {materiaSelecionada ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{materiaSelecionada.disciplina}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Professor</p>
                      <p className="text-base font-medium text-foreground">
                        {materiaSelecionada.professor}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Turma</p>
                      <p className="text-base font-medium text-foreground">
                        {materiaSelecionada.turma}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Turno</p>
                      <p className="text-base font-medium text-foreground">
                        {materiaSelecionada.turno}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Serie</p>
                      <p className="text-base font-medium text-foreground">
                        {materiaSelecionada.serie}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Frequencia
                        </CardTitle>
                        <div className="text-2xl font-semibold text-foreground">
                          {materiaSelecionada.frequencia}%
                        </div>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Atividades pendentes
                        </CardTitle>
                        <div className="text-2xl font-semibold text-foreground">
                          {materiaSelecionada.atividadesPendentes}
                        </div>
                      </div>
                      <ClipboardList className="w-5 h-5 text-warning" />
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Ultima atividade
                        </CardTitle>
                        <div className="text-sm font-semibold text-foreground">
                          {materiaSelecionada.ultimaAtividade}
                        </div>
                      </div>
                      <Calendar className="w-5 h-5 text-primary" />
                    </CardHeader>
                  </Card>
                </div>

                <div className="flex items-center justify-end">
                  <Link to={`/atividades?disciplina=${encodeURIComponent(materiaSelecionada.disciplina)}`}>
                    <Button variant="outline">
                      <BookOpen className="w-4 h-4" />
                      Ver atividades desta materia
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Selecione uma materia para ver detalhes.
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MinhasMaterias;
