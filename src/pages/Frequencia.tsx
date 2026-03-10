import React, { useMemo, useState } from 'react';
import { CalendarCheck, Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createId, loadFromStorage, saveToStorage } from '@/lib/mockStorage';
import { cn } from '@/lib/utils';

type PresencaStatus = 'Presente' | 'Falta';

const storageKey = 'school-compass:frequencia';
const presencasStorageKey = 'school-compass:frequencia-diaria';

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

const defaultAlunos: AlunoTurma[] = [
  { id: 'AL-9A-1', nome: 'Pedro Oliveira', turma: '9º Ano A' },
  { id: 'AL-9A-2', nome: 'Maria Souza', turma: '9º Ano A' },
  { id: 'AL-9B-1', nome: 'Joao Pedro', turma: '9º Ano B' },
  { id: 'AL-8A-1', nome: 'Lucia Ferreira', turma: '8º Ano A' },
];

const disciplinasDisponiveis = ['Matemática', 'Português', 'Física', 'História'];

const Frequencia: React.FC = () => {
  const { user } = useAuth();
  const somenteConsulta = user?.perfil === UserProfile.SECRETARIA;
  const [presencas, setPresencas] = useState<RegistroPresenca[]>(() =>
    loadFromStorage<RegistroPresenca[]>(presencasStorageKey, []),
  );
  const [turmaSelecionada, setTurmaSelecionada] = useState(defaultAlunos[0]?.turma ?? '9º Ano A');
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState(
    disciplinasDisponiveis[0] ?? 'Matemática',
  );
  const [dataSelecionada, setDataSelecionada] = useState(new Date());

  const turmasDisponiveis = useMemo(
    () => Array.from(new Set(defaultAlunos.map((item) => item.turma))).sort(),
    [],
  );

  const alunosDaTurma = useMemo(() => {
    return defaultAlunos.filter((item) => item.turma === turmaSelecionada);
  }, [turmaSelecionada]);

  const dataSelecionadaISO = useMemo(
    () => dataSelecionada.toISOString().slice(0, 10),
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

  const dataLabel = useMemo(() => {
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(dataSelecionada);
  }, [dataSelecionada]);

  const handleDataAnterior = () => {
    setDataSelecionada((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 1));
  };

  const handleDataProxima = () => {
    setDataSelecionada((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1));
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
          <Select value={disciplinaSelecionada} onValueChange={setDisciplinaSelecionada}>
            <SelectTrigger className="w-full lg:w-56">
              <SelectValue placeholder="Selecione a disciplina" />
            </SelectTrigger>
            <SelectContent>
              {disciplinasDisponiveis.map((disciplina) => (
                <SelectItem key={disciplina} value={disciplina}>
                  {disciplina}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-sm">
            <Button variant="ghost" size="icon" onClick={handleDataAnterior}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="flex-1 text-center text-sm font-medium text-foreground capitalize">
              {dataLabel}
            </span>
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
