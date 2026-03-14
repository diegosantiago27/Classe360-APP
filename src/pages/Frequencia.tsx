import React, { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createId, loadFromStorage, saveToStorage } from '@/lib/mockStorage';
import { defaultUsers, StoredUser, usersStorageKey } from '@/lib/mockUsers';
import { CatalogItem, defaultDisciplinas, disciplinasStorageKey } from '@/lib/mockAcademics';
import { cn } from '@/lib/utils';

type PresencaStatus = 'Presente' | 'Falta';

const storageKey = 'school-compass:frequencia';
const presencasStorageKey = 'school-compass:frequencia-diaria';
const vinculosStorageKey = 'school-compass:disciplinas-vinculos';

interface AlunoTurma {
  id: string;
  nome: string;
  turma: string;
}

interface RegistroPresenca {
  id: string;
  turma: string;
  alunoId: string;
  alunoNome: string;
  data: string;
  status: PresencaStatus;
}

interface AlunoVinculado {
  alunoId: string;
  alunoNome: string;
}

interface DisciplinaVinculo {
  disciplinaId: string;
  turmaId: string;
  turmaNome: string;
  professorId: string;
  professorNome: string;
  alunos: AlunoVinculado[];
}

const defaultAlunos: AlunoTurma[] = [
  { id: 'AL-9A-1', nome: 'Pedro Oliveira', turma: '9º Ano A' },
  { id: 'AL-9A-2', nome: 'Maria Souza', turma: '9º Ano A' },
  { id: 'AL-9B-1', nome: 'Joao Pedro', turma: '9º Ano B' },
  { id: 'AL-8A-1', nome: 'Lucia Ferreira', turma: '8º Ano A' },
];

function normalizeText(value?: string): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function isProfessorPerfil(perfil: unknown): boolean {
  if (perfil === UserProfile.PROFESSOR) return true;
  const normalized = String(perfil ?? '').trim().toUpperCase();
  return normalized === '3' || normalized === 'PROFESSOR' || normalized === 'ROLE_PROFESSOR';
}

function isSecretariaPerfil(perfil: unknown): boolean {
  if (perfil === UserProfile.SECRETARIA) return true;
  const normalized = String(perfil ?? '').trim().toUpperCase();
  return normalized === '5' || normalized === 'SECRETARIA' || normalized === 'ROLE_SECRETARIA';
}

function toISODateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const Frequencia: React.FC = () => {
  const { user } = useAuth();
  const perfilAtual = (user as { perfil?: unknown; role?: unknown } | null)?.perfil
    ?? (user as { perfil?: unknown; role?: unknown } | null)?.role;
  const somenteConsulta = isSecretariaPerfil(perfilAtual);
  const ehProfessor = isProfessorPerfil(perfilAtual);
  const [usuarios] = useState<StoredUser[]>(() =>
    loadFromStorage<StoredUser[]>(usersStorageKey, defaultUsers),
  );
  const [disciplinasCatalogo] = useState<CatalogItem[]>(() =>
    loadFromStorage<CatalogItem[]>(disciplinasStorageKey, defaultDisciplinas),
  );
  const [vinculos] = useState<DisciplinaVinculo[]>(() =>
    loadFromStorage<DisciplinaVinculo[]>(vinculosStorageKey, []),
  );
  const [presencas, setPresencas] = useState<RegistroPresenca[]>(() =>
    loadFromStorage<RegistroPresenca[]>(presencasStorageKey, []),
  );
  const [turmaSelecionada, setTurmaSelecionada] = useState('');
  const [disciplinaSelecionadaId, setDisciplinaSelecionadaId] = useState('');
  const [dataSelecionada, setDataSelecionada] = useState(new Date());

  const professorVinculos = useMemo(() => {
    if (!ehProfessor || !user) return [];
    const idAtual = normalizeText(user.id);
    if (!idAtual) return [];
    return vinculos.filter((v) => normalizeText(v.professorId) === idAtual);
  }, [ehProfessor, user, vinculos]);

  const disciplinasDisponiveis = useMemo(() => {
    if (ehProfessor) {
      const ids = Array.from(new Set(professorVinculos.map((v) => v.disciplinaId)));
      return ids
        .map((id) => disciplinasCatalogo.find((d) => d.id === id))
        .filter((item): item is CatalogItem => Boolean(item))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    }
    return [...disciplinasCatalogo].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [ehProfessor, professorVinculos, disciplinasCatalogo]);

  const turmasDisponiveis = useMemo(() => {
    if (ehProfessor) {
      const turmasDoProfessor = professorVinculos.map((v) => v.turmaNome || v.turmaId);
      return Array.from(new Set(turmasDoProfessor)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }

    const turmasAlunos = usuarios
      .filter((u) => u.perfil === UserProfile.ALUNO && u.status === 'ativo')
      .flatMap((u) => u.turmas ?? []);
    const base = turmasAlunos.length > 0 ? turmasAlunos : defaultAlunos.map((item) => item.turma);
    return Array.from(new Set(base)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [ehProfessor, professorVinculos, usuarios]);

  useEffect(() => {
    if (disciplinasDisponiveis.length === 0) {
      setDisciplinaSelecionadaId('');
      return;
    }
    const existeSelecionada = disciplinasDisponiveis.some((d) => d.id === disciplinaSelecionadaId);
    if (!existeSelecionada) {
      setDisciplinaSelecionadaId(disciplinasDisponiveis[0].id);
    }
  }, [disciplinasDisponiveis, disciplinaSelecionadaId]);

  useEffect(() => {
    if (turmasDisponiveis.length === 0) {
      setTurmaSelecionada('');
      return;
    }
    if (!turmasDisponiveis.includes(turmaSelecionada)) {
      setTurmaSelecionada(turmasDisponiveis[0]);
    }
  }, [turmasDisponiveis, turmaSelecionada]);

  const alunosDaTurma = useMemo(() => {
    if (!turmaSelecionada) return [];

    if (ehProfessor) {
      const vinculoSelecionado = professorVinculos.find(
        (v) =>
          v.disciplinaId === disciplinaSelecionadaId &&
          (v.turmaNome === turmaSelecionada || v.turmaId === turmaSelecionada),
      );
      if (vinculoSelecionado?.alunos?.length) {
        return [...vinculoSelecionado.alunos]
          .map((a) => ({ id: a.alunoId, nome: a.alunoNome, turma: turmaSelecionada }))
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      }
    }

    const alunosDoStorage = usuarios
      .filter(
        (u) =>
          u.perfil === UserProfile.ALUNO &&
          u.status === 'ativo' &&
          (u.turmas ?? []).includes(turmaSelecionada),
      )
      .map((u) => ({
        id: u.id,
        nome: u.nome,
        turma: turmaSelecionada,
      }));

    const base = alunosDoStorage.length > 0
      ? alunosDoStorage
      : defaultAlunos.filter((item) => item.turma === turmaSelecionada);

    return [...base].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [ehProfessor, professorVinculos, disciplinaSelecionadaId, usuarios, turmaSelecionada]);

  const dataSelecionadaISO = useMemo(
    () => toISODateLocal(dataSelecionada),
    [dataSelecionada],
  );

  const statusPorAluno = useMemo(() => {
    const mapa = new Map<string, PresencaStatus>();
    presencas
      .filter((item) => item.turma === turmaSelecionada && item.data === dataSelecionadaISO)
      .forEach((item) => {
        mapa.set(item.alunoId, item.status);
      });
    return mapa;
  }, [presencas, turmaSelecionada, dataSelecionadaISO]);

  const handleSetStatus = (aluno: AlunoTurma, status: PresencaStatus) => {
    const existente = presencas.find(
      (item) =>
        item.alunoId === aluno.id &&
        item.turma === turmaSelecionada &&
        item.data === dataSelecionadaISO,
    );
    const atualizado = existente
      ? presencas.map((item) =>
          item.id === existente.id ? { ...item, status } : item,
        )
      : [
          ...presencas,
          {
            id: createId('presenca'),
            turma: turmaSelecionada,
            alunoId: aluno.id,
            alunoNome: aluno.nome,
            data: dataSelecionadaISO,
            status,
          },
        ];
    setPresencas(atualizado);
    saveToStorage(presencasStorageKey, atualizado);
  };

  const handleSetAll = (status: PresencaStatus) => {
    const atualizado = alunosDaTurma.reduce<RegistroPresenca[]>((acc, aluno) => {
      const existente = presencas.find(
        (item) =>
          item.alunoId === aluno.id &&
          item.turma === turmaSelecionada &&
          item.data === dataSelecionadaISO,
      );
      if (existente) {
        acc.push(
          ...presencas.map((item) =>
            item.id === existente.id ? { ...item, status } : item,
          ),
        );
        return acc;
      }
      acc.push(...presencas);
      acc.push({
        id: createId('presenca'),
        turma: turmaSelecionada,
        alunoId: aluno.id,
        alunoNome: aluno.nome,
        data: dataSelecionadaISO,
        status,
      });
      return acc;
    }, []);
    const normalized = Array.from(new Map(atualizado.map((item) => [item.id, item])).values());
    setPresencas(normalized);
    saveToStorage(presencasStorageKey, normalized);
  };

  const totalPresentes = alunosDaTurma.filter(
    (aluno) => statusPorAluno.get(aluno.id) === 'Presente',
  ).length;
  const totalAusentes = alunosDaTurma.filter(
    (aluno) => statusPorAluno.get(aluno.id) === 'Falta',
  ).length;

  const handleDataAnterior = () => {
    setDataSelecionada((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 1));
  };

  const handleDataProxima = () => {
    setDataSelecionada((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1));
  };

  const handleDataDireta = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return;
    setDataSelecionada(new Date(year, month - 1, day));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Frequência</h1>
            <p className="text-muted-foreground">Registro de presença por aula</p>
          </div>
          {!somenteConsulta && (
          <Button variant="gradient" className="gap-2">
            <CalendarCheck className="w-4 h-4" />
            Salvar Chamada
          </Button>
          )}
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <Select value={turmaSelecionada} onValueChange={setTurmaSelecionada}>
            <SelectTrigger className="w-full lg:w-48">
              <SelectValue placeholder="Selecione a turma" />
            </SelectTrigger>
            <SelectContent>
              {turmasDisponiveis.map((turma) => (
                <SelectItem key={turma} value={turma}>
                  {turma}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={disciplinaSelecionadaId} onValueChange={setDisciplinaSelecionadaId}>
            <SelectTrigger className="w-full lg:w-56">
              <SelectValue placeholder="Selecione a disciplina" />
            </SelectTrigger>
            <SelectContent>
              {disciplinasDisponiveis.map((disciplina) => (
                <SelectItem key={disciplina.id} value={disciplina.id}>
                  {disciplina.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-sm">
            <Button variant="ghost" size="icon" onClick={handleDataAnterior}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Input
              type="date"
              value={dataSelecionadaISO}
              onChange={(event) => handleDataDireta(event.target.value)}
              className="h-8 w-[170px]"
              aria-label="Selecionar data da frequencia"
            />
            <Button variant="ghost" size="icon" onClick={handleDataProxima}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-2xl font-semibold text-foreground">{alunosDaTurma.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Presentes</div>
            <div className="text-2xl font-semibold text-success">{totalPresentes}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Ausentes</div>
            <div className="text-2xl font-semibold text-destructive">{totalAusentes}</div>
          </Card>
        </div>

        {!somenteConsulta && (
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="gap-2 border-success/40 text-success hover:bg-success/10"
            onClick={() => handleSetAll('Presente')}
          >
            <Check className="w-4 h-4" />
            Todos Presentes
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={() => handleSetAll('Falta')}
          >
            <X className="w-4 h-4" />
            Todos Ausentes
          </Button>
        </div>
        )}

        <Card className="divide-y divide-border/60">
          {alunosDaTurma.map((aluno, index) => {
            const status = statusPorAluno.get(aluno.id);
            const freqGeral = Math.max(75, 98 - index * 6);
            return (
              <div key={aluno.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
                <div className="flex items-center gap-3 flex-1">
                  <div className="min-w-7 text-center text-sm font-semibold text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-semibold">
                    {aluno.nome
                      .split(' ')
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join('')}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{aluno.nome}</p>
                    <p className="text-xs text-muted-foreground">Freq. geral: {freqGeral}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {somenteConsulta ? (
                    <span className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium',
                      status === 'Presente' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
                    )}>
                      {status ?? '—'}
                    </span>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        className={cn(
                          'gap-2 border-success/40 text-success hover:bg-success/10',
                          status === 'Presente' && 'bg-success/10',
                        )}
                        onClick={() => handleSetStatus(aluno, 'Presente')}
                      >
                        <Check className="w-4 h-4" />
                        Presente
                      </Button>
                      <Button
                        variant="outline"
                        className={cn(
                          'gap-2 border-destructive/40 text-destructive hover:bg-destructive/10',
                          status === 'Falta' && 'bg-destructive/10',
                        )}
                        onClick={() => handleSetStatus(aluno, 'Falta')}
                      >
                        <X className="w-4 h-4" />
                        Ausente
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Frequencia;
