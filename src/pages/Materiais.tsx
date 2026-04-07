import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, MapPin, Users } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/auth';
import { loadFromStorage, saveToStorage, syncKeysFromBackend } from '@/lib/mockStorage';
import { CatalogItem, defaultDisciplinas, disciplinasStorageKey } from '@/lib/mockAcademics';
import { Turma, defaultTurmas, turmasStorageKey } from '@/lib/mockTurmas';
import { isApiEnabled, listDisciplinasApi, listGradeAulasApi, listTurmasApi } from '@/lib/entityCrudApi';
import { mapTurnoFieldsFromTurmaApi, rotuloTurnoParaExibicao } from '@/lib/turnosCatalog';
import { loadVinculosDisciplinaTurma } from '@/lib/vinculosRelacional';

interface DisciplinaVinculoStorage {
  disciplinaId: string;
  turmaId: string;
  professorId?: string;
  professorNome?: string;
}

interface AulaCadastrada {
  id: string;
  disciplinaId: string;
  turmaId: string;
  dia: string;
  inicio: string;
  fim: string;
}

interface AulaSemana {
  disciplina: string;
  turmaNome: string;
  turno: string;
  dia: string;
  horario: string;
}

const vinculosStorageKey = 'school-compass:disciplinas-vinculos';
const aulasStorageKey = 'school-compass:grade-aulas';

/** Mesmos valores que Agenda Semanal / cadastro de horários */
const diasSemana = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta'] as const;

const coresDisciplina = [
  'bg-blue-600',
  'bg-red-600',
  'bg-emerald-600',
  'bg-amber-500',
  'bg-purple-600',
  'bg-cyan-600',
];

const normalizeText = (value?: string) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

/** Alinha o texto do dia salvo com a chave usada na grade (Segunda, Terca, …). */
const resolveDiaGrade = (raw: string): string => {
  const found = diasSemana.find((d) => normalizeText(d) === normalizeText(raw));
  return found ?? raw;
};

const Materiais: React.FC = () => {
  const { user } = useAuth();
  const [disciplinas, setDisciplinas] = useState<CatalogItem[]>(() =>
    loadFromStorage<CatalogItem[]>(disciplinasStorageKey, isApiEnabled() ? [] : defaultDisciplinas),
  );
  const [turmas, setTurmas] = useState<Turma[]>(() =>
    loadFromStorage<Turma[]>(turmasStorageKey, isApiEnabled() ? [] : defaultTurmas),
  );
  const [vinculos, setVinculos] = useState<DisciplinaVinculoStorage[]>(() =>
    loadFromStorage<DisciplinaVinculoStorage[]>(vinculosStorageKey, []),
  );
  const [aulasGrade, setAulasGrade] = useState<AulaCadastrada[]>(() =>
    loadFromStorage<AulaCadastrada[]>(aulasStorageKey, []),
  );

  useEffect(() => {
    if (isApiEnabled()) {
      void Promise.all([
        listDisciplinasApi(),
        listTurmasApi(),
        listGradeAulasApi(),
        loadVinculosDisciplinaTurma(),
      ])
        .then(([disciplinasApi, turmasApi, gradeRows, vincRows]) => {
          const disciplinasMapped: CatalogItem[] = disciplinasApi.map((d) => ({
            id: String(d.id ?? ''),
            nome: d.nome ?? `Disciplina ${d.id ?? ''}`,
            cor: d.cor ?? undefined,
          }));
          const turmasMapped: Turma[] = turmasApi.map((t) => ({
            id: String(t.id ?? ''),
            nome: t.nome ?? `Turma ${t.id ?? ''}`,
            ...mapTurnoFieldsFromTurmaApi(t),
            status: t.status ?? 'Ativa',
            professor: t.professorId ? String(t.professorId) : '',
            alunos: Array.isArray(t.alunosIds) ? t.alunosIds.length : 0,
            proximaAula: '',
          }));
          const mapped: AulaCadastrada[] = gradeRows
            .filter((r) => r.disciplinaId != null && r.turmaId != null)
            .map((r) => ({
              id: String(r.id ?? ''),
              disciplinaId: String(r.disciplinaId),
              turmaId: String(r.turmaId),
              dia: r.dia ?? '',
              inicio: r.inicio ?? '',
              fim: r.fim ?? '',
            }));
          saveToStorage(disciplinasStorageKey, disciplinasMapped);
          saveToStorage(turmasStorageKey, turmasMapped);
          setDisciplinas(disciplinasMapped);
          setTurmas(turmasMapped);
          setVinculos(vincRows as DisciplinaVinculoStorage[]);
          setAulasGrade(mapped);
        })
        .catch(() => null);
      return;
    }
    const keys = [disciplinasStorageKey, turmasStorageKey, vinculosStorageKey, aulasStorageKey];
    void syncKeysFromBackend(keys).finally(() => {
      setDisciplinas(
        loadFromStorage<CatalogItem[]>(disciplinasStorageKey, isApiEnabled() ? [] : defaultDisciplinas),
      );
      setTurmas(loadFromStorage<Turma[]>(turmasStorageKey, isApiEnabled() ? [] : defaultTurmas));
      setVinculos(loadFromStorage<DisciplinaVinculoStorage[]>(vinculosStorageKey, []));
      setAulasGrade(loadFromStorage<AulaCadastrada[]>(aulasStorageKey, []));
    });
  }, []);

  const ehProfessorApi =
    user?.perfil === UserProfile.PROFESSOR ||
    String((user as { role?: unknown } | null)?.role ?? '')
      .trim()
      .toUpperCase() === 'ROLE_PROFESSOR';

  const vinculosProfessor = useMemo(() => {
    if (!user) return [];
    if (!ehProfessorApi) return vinculos;
    return vinculos.filter(
      (v) =>
        normalizeText(v.professorId) === normalizeText(user.id) ||
        normalizeText(v.professorNome) === normalizeText(user.nome),
    );
  }, [user, vinculos, ehProfessorApi]);

  const aulas = useMemo(() => {
    const out: AulaSemana[] = [];

    aulasGrade.forEach((aula) => {
      const turma = turmas.find((t) => t.id === aula.turmaId);
      const disciplina = disciplinas.find((d) => d.id === aula.disciplinaId);
      if (!turma || !disciplina) return;

      const vinculo = vinculos.find(
        (v) => v.disciplinaId === aula.disciplinaId && v.turmaId === aula.turmaId,
      );

      if (ehProfessorApi && user) {
        if (!vinculo) return;
        const souEu =
          normalizeText(vinculo.professorId) === normalizeText(user.id) ||
          normalizeText(vinculo.professorNome) === normalizeText(user.nome);
        if (!souEu) return;
      }

      const dia = resolveDiaGrade(aula.dia);
      if (!diasSemana.includes(dia as (typeof diasSemana)[number])) return;

      out.push({
        disciplina: disciplina.nome,
        turmaNome: turma.nome,
        turno: rotuloTurnoParaExibicao(turma),
        dia,
        horario: `${aula.inicio} - ${aula.fim}`,
      });
    });

    return out;
  }, [aulasGrade, disciplinas, turmas, vinculos, ehProfessorApi, user]);

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

  const temConteudoProfessor =
    ehProfessorApi && vinculosProfessor.length > 0 && resumoDisciplinas.length === 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Minhas Disciplinas</h1>
          <p className="text-muted-foreground">
            Visualize suas disciplinas, grade semanal e turmas atribuidas (dados da agenda institucional).
          </p>
        </div>

        {resumoDisciplinas.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground space-y-2">
            {temConteudoProfessor ? (
              <>
                <p>
                  Você tem disciplinas vinculadas, mas ainda <strong>não há horários</strong> na grade.
                </p>
                <p>
                  Peça à secretaria para cadastrar os horários em{' '}
                  <span className="font-medium text-foreground">Disciplinas</span> (cadastro de horários)
                  ou confira a <span className="font-medium text-foreground">Agenda semanal</span>.
                </p>
              </>
            ) : (
              <p>Nenhuma disciplina atribuida no momento.</p>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
              {resumoDisciplinas.map((item, idx) => (
                <Card
                  key={item.disciplina}
                  className={`${coresDisciplina[idx % coresDisciplina.length]} text-white border-0`}
                >
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
                      {dia.toUpperCase()}
                    </div>
                    {(aulasPorDia.get(dia) ?? []).length === 0 ? (
                      <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                        Sem aulas
                      </div>
                    ) : (
                      (aulasPorDia.get(dia) ?? []).map((aula, idx) => (
                        <div
                          key={`${dia}-${aula.turmaNome}-${aula.disciplina}-${aula.horario}-${idx}`}
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
                        <Badge variant="secondary">{rotuloTurnoParaExibicao(item.turma)}</Badge>
                      </div>
                      <CardDescription>{item.turma.nome.split(' ')[0]} ano</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {item.aulas.slice(0, 8).map((aula, idx) => (
                        <div
                          key={`${item.turma.id}-${idx}`}
                          className="text-muted-foreground flex flex-wrap items-center gap-2"
                        >
                          <CalendarDays className="w-4 h-4 shrink-0" />
                          <span>{aula.dia.toUpperCase()}</span>
                          <Clock className="w-4 h-4 shrink-0" />
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
