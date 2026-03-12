import React, { useMemo } from 'react';
import { CalendarDays, Clock, MapPin, Users } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/auth';
import { loadFromStorage } from '@/lib/mockStorage';
import { CatalogItem, defaultDisciplinas, disciplinasStorageKey } from '@/lib/mockAcademics';
import { Turma, defaultTurmas, turmasStorageKey } from '@/lib/mockTurmas';

interface DisciplinaVinculoStorage {
  disciplinaId: string;
  turmaId: string;
  professorId?: string;
  professorNome?: string;
}

interface AulaSemana {
  disciplina: string;
  turmaNome: string;
  turno: string;
  dia: string;
  horario: string;
}

const vinculosStorageKey = 'school-compass:disciplinas-vinculos';
const diasSemana = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA'];
const horariosPorTurno: Record<string, string[]> = {
  Manha: ['07:30 - 08:20', '08:20 - 09:10', '09:30 - 10:20'],
  Tarde: ['13:00 - 13:50', '13:50 - 14:40', '14:40 - 15:30'],
  Noite: ['19:00 - 19:50', '19:50 - 20:40', '20:40 - 21:30'],
};
const coresDisciplina = [
  'bg-blue-600',
  'bg-red-600',
  'bg-emerald-600',
  'bg-amber-500',
  'bg-purple-600',
  'bg-cyan-600',
];

const Materiais: React.FC = () => {
  const { user } = useAuth();
  const disciplinas = useMemo(
    () => loadFromStorage<CatalogItem[]>(disciplinasStorageKey, defaultDisciplinas),
    [],
  );
  const turmas = useMemo(
    () => loadFromStorage<Turma[]>(turmasStorageKey, defaultTurmas),
    [],
  );
  const vinculos = useMemo(
    () => loadFromStorage<DisciplinaVinculoStorage[]>(vinculosStorageKey, []),
    [],
  );

  const vinculosProfessor = useMemo(() => {
    if (!user) return [];
    if (user.perfil !== UserProfile.PROFESSOR) return vinculos;
    return vinculos.filter(
      (v) => v.professorId === user.id || v.professorNome === user.nome,
    );
  }, [user, vinculos]);

  const aulas = useMemo(() => {
    return vinculosProfessor
      .map((v, idx) => {
        const turma = turmas.find((t) => t.id === v.turmaId);
        const disciplina = disciplinas.find((d) => d.id === v.disciplinaId);
        if (!turma || !disciplina) return null;
        const horarios = horariosPorTurno[turma.turno] ?? horariosPorTurno.Manha;
        const turnoOffset = turma.turno === 'Manha' ? 0 : turma.turno === 'Tarde' ? 1 : 2;
        const dia = diasSemana[(idx + turnoOffset) % diasSemana.length];
        const horario = horarios[idx % horarios.length];
        return {
          disciplina: disciplina.nome,
          turmaNome: turma.nome,
          turno: turma.turno,
          dia,
          horario,
        } as AulaSemana;
      })
      .filter((item): item is AulaSemana => Boolean(item));
  }, [disciplinas, turmas, vinculosProfessor]);

  const resumoDisciplinas = useMemo(() => {
    const map = new Map<string, { disciplina: string; turmas: Set<string>; aulas: number }>();
    aulas.forEach((aula) => {
      if (!map.has(aula.disciplina)) {
        map.set(aula.disciplina, { disciplina: aula.disciplina, turmas: new Set(), aulas: 0 });
      }
      const item = map.get(aula.disciplina)!;
      item.turmas.add(aula.turmaNome);
      item.aulas += 1;
    });
    return Array.from(map.values());
  }, [aulas]);

  const aulasPorDia = useMemo(() => {
    const map = new Map<string, AulaSemana[]>();
    diasSemana.forEach((dia) => map.set(dia, []));
    aulas.forEach((aula) => {
      map.get(aula.dia)?.push(aula);
    });
    diasSemana.forEach((dia) => {
      map.get(dia)?.sort((a, b) => a.horario.localeCompare(b.horario));
    });
    return map;
  }, [aulas]);

  const turmasResumo = useMemo(() => {
    const map = new Map<string, { turma: Turma; aulas: AulaSemana[] }>();
    aulas.forEach((aula) => {
      const turma = turmas.find((t) => t.nome === aula.turmaNome);
      if (!turma) return;
      if (!map.has(turma.id)) {
        map.set(turma.id, { turma, aulas: [] });
      }
      map.get(turma.id)!.aulas.push(aula);
    });
    return Array.from(map.values());
  }, [aulas, turmas]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Minhas Disciplinas
          </h1>
          <p className="text-muted-foreground">
            Visualize suas disciplinas, grade semanal e turmas atribuidas.
          </p>
        </div>

        {resumoDisciplinas.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhuma disciplina atribuida no momento.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
              {resumoDisciplinas.map((item, idx) => (
                <Card key={item.disciplina} className={`${coresDisciplina[idx % coresDisciplina.length]} text-white border-0`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{item.disciplina}</CardTitle>
                    <CardDescription className="text-white/80">
                      {item.turmas.size} turma(s)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 text-sm text-white/90">
                    {item.aulas} aula(s)/semana
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-3">
              <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                Grade Semanal
              </h2>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
                {diasSemana.map((dia) => (
                  <div key={dia} className="space-y-2">
                    <div className="rounded-md bg-blue-700 py-2 text-center text-sm font-bold text-white">
                      {dia}
                    </div>
                    {(aulasPorDia.get(dia) ?? []).length === 0 ? (
                      <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                        Sem aulas
                      </div>
                    ) : (
                      (aulasPorDia.get(dia) ?? []).map((aula, idx) => (
                        <div
                          key={`${dia}-${aula.turmaNome}-${aula.disciplina}-${idx}`}
                          className={`rounded-md p-3 text-white ${coresDisciplina[idx % coresDisciplina.length]}`}
                        >
                          <p className="font-semibold">{aula.disciplina}</p>
                          <p className="text-xs text-white/90 flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {aula.turmaNome} - {aula.turno}
                          </p>
                          <p className="text-xs text-white/90 flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            {aula.horario}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Minhas Turmas
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {turmasResumo.map((item) => (
                  <Card key={item.turma.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{item.turma.nome}</CardTitle>
                        <Badge variant="secondary">{item.turma.turno}</Badge>
                      </div>
                      <CardDescription>{item.turma.nome.split(' ')[0]} ano</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {item.aulas.slice(0, 4).map((aula, idx) => (
                        <div key={`${item.turma.id}-${idx}`} className="text-muted-foreground flex items-center gap-2">
                          <CalendarDays className="w-4 h-4" />
                          <span>{aula.dia}</span>
                          <Clock className="w-4 h-4" />
                          <span>{aula.horario}</span>
                          <span>-</span>
                          <span>{aula.disciplina}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
                {turmasResumo.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                    Nenhuma turma atribuida para exibir.
                  </div>
                )}
                </div>
              </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Materiais;
