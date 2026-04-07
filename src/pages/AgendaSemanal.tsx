import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Clock, Filter, GraduationCap, MapPin, Search, Trash2, Users } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { loadFromStorage, saveToStorage, syncKeysFromBackend } from '@/lib/mockStorage';
import { CatalogItem, defaultDisciplinas, disciplinasStorageKey } from '@/lib/mockAcademics';
import { Turma, defaultTurmas, turmasStorageKey } from '@/lib/mockTurmas';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/auth';
import { deleteGradeAulaApi, isApiEnabled, listDisciplinasApi, listGradeAulasApi, listTurmasApi } from '@/lib/entityCrudApi';
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

interface AulaAgenda {
  id: string;
  disciplina: string;
  professor: string;
  turma: string;
  turno: string;
  dia: string;
  inicio: string;
  fim: string;
}

const vinculosStorageKey = 'school-compass:disciplinas-vinculos';
const aulasStorageKey = 'school-compass:grade-aulas';
const coresStorageKey = 'school-compass:disciplinas-cores';

const diasSemana = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta'];
const corFallback = ['bg-blue-600', 'bg-red-600', 'bg-emerald-600', 'bg-orange-500', 'bg-purple-600', 'bg-cyan-600'];
const corPorNome: Record<string, string> = {
  blue: 'bg-blue-600',
  green: 'bg-emerald-600',
  orange: 'bg-orange-500',
  purple: 'bg-purple-600',
  teal: 'bg-cyan-600',
  red: 'bg-red-600',
  yellow: 'bg-amber-500',
  pink: 'bg-pink-600',
};

const AgendaSemanal: React.FC = () => {
  const { user } = useAuth();
  const [busca, setBusca] = useState('');
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState<string>('Todas');
  const [periodoSelecionado, setPeriodoSelecionado] = useState<'Todos' | 'Manha' | 'Tarde' | 'Noite'>('Todos');
  const podeRemover = user?.perfil === UserProfile.ADMINISTRADOR;

  const [disciplinas, setDisciplinas] = useState<CatalogItem[]>(
    () => loadFromStorage<CatalogItem[]>(disciplinasStorageKey, isApiEnabled() ? [] : defaultDisciplinas),
  );
  const [turmas, setTurmas] = useState<Turma[]>(
    () => loadFromStorage<Turma[]>(turmasStorageKey, isApiEnabled() ? [] : defaultTurmas),
  );
  const [vinculos, setVinculos] = useState<DisciplinaVinculoStorage[]>(
    () => loadFromStorage<DisciplinaVinculoStorage[]>(vinculosStorageKey, []),
  );
  const [aulas, setAulas] = useState<AulaCadastrada[]>(
    () => loadFromStorage<AulaCadastrada[]>(aulasStorageKey, []),
  );

  const coresDisciplinas = useMemo(() => {
    const m: Record<string, string> = {};
    disciplinas.forEach((d) => {
      m[d.id] = d.cor && d.cor.trim() ? d.cor : 'blue';
    });
    return m;
  }, [disciplinas]);

  useEffect(() => {
    const keysOffline = [
      disciplinasStorageKey,
      turmasStorageKey,
      vinculosStorageKey,
      aulasStorageKey,
      coresStorageKey,
    ];
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
            status: t.status === 'Inativa' ? 'Inativa' : 'Ativa',
            alunos: Array.isArray(t.alunosIds) ? t.alunosIds.length : 0,
            professor: '',
            proximaAula: '',
          }));
          const mappedAulas: AulaCadastrada[] = gradeRows
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
          setAulas(mappedAulas);
        })
        .catch(() => null);
      return;
    }
    void syncKeysFromBackend(keysOffline).finally(() => {
      setDisciplinas(
        loadFromStorage<CatalogItem[]>(disciplinasStorageKey, isApiEnabled() ? [] : defaultDisciplinas),
      );
      setTurmas(loadFromStorage<Turma[]>(turmasStorageKey, isApiEnabled() ? [] : defaultTurmas));
      setVinculos(loadFromStorage<DisciplinaVinculoStorage[]>(vinculosStorageKey, []));
      setAulas(loadFromStorage<AulaCadastrada[]>(aulasStorageKey, []));
    });
  }, []);

  const aulasAgenda = useMemo(() => {
    return aulas
      .map((aula) => {
        const disciplina = disciplinas.find((d) => d.id === aula.disciplinaId);
        const turma = turmas.find((t) => t.id === aula.turmaId);
        if (!disciplina || !turma) return null;

        const vinculoExato = vinculos.find(
          (v) => v.disciplinaId === aula.disciplinaId && v.turmaId === aula.turmaId,
        );
        const vinculoPorTurma = vinculos.find((v) => v.turmaId === aula.turmaId);
        const professor =
          vinculoExato?.professorNome?.trim() ||
          vinculoPorTurma?.professorNome?.trim() ||
          '-';

        return {
          id: aula.id,
          disciplina: disciplina.nome,
          professor,
          turma: turma.nome,
          turno: rotuloTurnoParaExibicao(turma),
          dia: aula.dia,
          inicio: aula.inicio,
          fim: aula.fim,
        } as AulaAgenda;
      })
      .filter((item): item is AulaAgenda => Boolean(item));
  }, [aulas, disciplinas, turmas, vinculos]);

  const disciplinasDisponiveis = useMemo(() => {
    const nomes = new Set(aulasAgenda.map((a) => a.disciplina));
    return ['Todas', ...Array.from(nomes).sort((a, b) => a.localeCompare(b, 'pt-BR'))];
  }, [aulasAgenda]);

  const aulasFiltradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return aulasAgenda.filter((aula) => {
      const matchDisciplina = disciplinaSelecionada === 'Todas' || aula.disciplina === disciplinaSelecionada;
      if (!matchDisciplina) return false;
      const matchPeriodo = periodoSelecionado === 'Todos' || aula.turno === periodoSelecionado;
      if (!matchPeriodo) return false;
      if (!termo) return true;
      const haystack = `${aula.disciplina} ${aula.professor} ${aula.turma}`.toLocaleLowerCase('pt-BR');
      return haystack.includes(termo);
    });
  }, [aulasAgenda, busca, disciplinaSelecionada, periodoSelecionado]);

  const stats = useMemo(() => {
    const disciplinasSet = new Set(aulasFiltradas.map((a) => a.disciplina));
    const professoresSet = new Set(aulasFiltradas.map((a) => a.professor).filter((n) => n !== '-'));
    const turmasSet = new Set(aulasFiltradas.map((a) => a.turma));
    return {
      totalAulas: aulasFiltradas.length,
      totalDisciplinas: disciplinasSet.size,
      totalProfessores: professoresSet.size,
      totalTurmas: turmasSet.size,
    };
  }, [aulasFiltradas]);

  const aulasPorDia = useMemo(() => {
    const map = new Map<string, AulaAgenda[]>();
    diasSemana.forEach((dia) => map.set(dia, []));

    aulasFiltradas.forEach((aula) => {
      map.get(aula.dia)?.push(aula);
    });

    diasSemana.forEach((dia) => {
      map.get(dia)?.sort((a, b) => a.inicio.localeCompare(b.inicio));
    });

    return map;
  }, [aulasFiltradas]);

  const corPorDisciplina = useMemo(() => {
    const map = new Map<string, string>();
    const disciplinasOrdenadas = Array.from(new Set(aulasAgenda.map((a) => a.disciplina))).sort((a, b) =>
      a.localeCompare(b, 'pt-BR'),
    );

    disciplinasOrdenadas.forEach((nome, idx) => {
      const d = disciplinas.find((item) => item.nome === nome);
      const corBase = d ? coresDisciplinas[d.id] : undefined;
      const classe = corBase ? corPorNome[corBase] ?? corFallback[idx % corFallback.length] : corFallback[idx % corFallback.length];
      map.set(nome, classe);
    });
    return map;
  }, [aulasAgenda, disciplinas, coresDisciplinas]);

  const handleRemoverAula = (id: string) => {
    if (!podeRemover) return;
    const confirmed = window.confirm('Deseja remover este registro da agenda?');
    if (!confirmed) return;
    const updated = aulas.filter((aula) => aula.id !== id);
    if (isApiEnabled()) {
      const idNum = Number(id);
      if (Number.isFinite(idNum)) {
        void deleteGradeAulaApi(idNum)
          .then(() => setAulas(updated))
          .catch(() => {
            window.alert('Não foi possível remover a aula. Verifique a API e tente novamente.');
          });
      }
      return;
    }
    setAulas(updated);
    saveToStorage(aulasStorageKey, updated);
  };

  const handleRemoverDuplicadas = () => {
    if (!podeRemover) return;
    if (isApiEnabled()) {
      window.alert('A remoção de duplicadas deve ser feita no banco de dados.');
      return;
    }
    const seen = new Set<string>();
    const updated = aulas.filter((aula) => {
      const signature = `${aula.disciplinaId}|${aula.turmaId}|${aula.dia}|${aula.inicio}|${aula.fim}`;
      if (seen.has(signature)) return false;
      seen.add(signature);
      return true;
    });
    if (updated.length === aulas.length) {
      window.alert('Nao ha aulas duplicadas para remover.');
      return;
    }
    const confirmed = window.confirm('Deseja remover os registros duplicados da agenda?');
    if (!confirmed) return;
    setAulas(updated);
    saveToStorage(aulasStorageKey, updated);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Agenda Semanal</h1>
          <p className="text-muted-foreground">
            Visualize disciplinas, horarios, professores e turmas da semana.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Aulas</CardTitle>
              <BookOpen className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{stats.totalAulas}</CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Disciplinas</CardTitle>
              <BookOpen className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{stats.totalDisciplinas}</CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Professores</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{stats.totalProfessores}</CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Turmas</CardTitle>
              <GraduationCap className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{stats.totalTurmas}</CardContent>
          </Card>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar por disciplina, professor ou turma..."
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="w-4 h-4" />
              Filtrar:
            </div>
            <Select
              value={periodoSelecionado}
              onValueChange={(value) => setPeriodoSelecionado(value as 'Todos' | 'Manha' | 'Tarde' | 'Noite')}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Periodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos os periodos</SelectItem>
                <SelectItem value="Manha">Manha</SelectItem>
                <SelectItem value="Tarde">Tarde</SelectItem>
                <SelectItem value="Noite">Noite</SelectItem>
              </SelectContent>
            </Select>
            {podeRemover && (
              <Button type="button" variant="outline" size="sm" onClick={handleRemoverDuplicadas}>
                <Trash2 className="w-4 h-4" />
                Remover duplicadas
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {disciplinasDisponiveis.map((nome) => {
              const ativo = disciplinaSelecionada === nome;
              return (
                <Button
                  key={nome}
                  type="button"
                  variant={ativo ? 'destructive' : 'outline'}
                  size="sm"
                  className="rounded-full"
                  onClick={() => setDisciplinaSelecionada(nome)}
                >
                  {nome}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          {diasSemana.map((dia) => (
            <div key={dia} className="space-y-2">
              <Badge className="w-full justify-center bg-blue-700 py-2 text-sm font-bold text-white hover:bg-blue-700">
                {dia.toUpperCase()}
              </Badge>

              {(aulasPorDia.get(dia) ?? []).length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  Sem aulas
                </div>
              ) : (
                (aulasPorDia.get(dia) ?? []).map((aula) => (
                  <div
                    key={`${dia}-${aula.id}`}
                    className={`rounded-xl p-3 text-white ${corPorDisciplina.get(aula.disciplina) ?? 'bg-blue-600'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        className="text-left font-semibold hover:underline"
                        onClick={() => setDisciplinaSelecionada(aula.disciplina)}
                      >
                        {aula.disciplina}
                      </button>
                      {podeRemover && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-white hover:bg-white/20 hover:text-white"
                          onClick={() => handleRemoverAula(aula.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-white/90 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {aula.turma} - {aula.turno}
                    </p>
                    <p className="mt-1 text-sm text-white/90 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {aula.inicio} - {aula.fim}
                    </p>
                    <p className="mt-1 text-sm text-white/90">Prof. {aula.professor}</p>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AgendaSemanal;
