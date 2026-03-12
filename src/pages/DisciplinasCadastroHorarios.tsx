import React, { useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, CalendarDays, Plus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createId, loadFromStorage, saveToStorage } from '@/lib/mockStorage';
import { CatalogItem, defaultDisciplinas, disciplinasStorageKey } from '@/lib/mockAcademics';
import { Turma, defaultTurmas, turmasStorageKey } from '@/lib/mockTurmas';

interface AulaCadastrada {
  id: string;
  disciplinaId: string;
  turmaId: string;
  dia: string;
  inicio: string;
  fim: string;
}

const aulasStorageKey = 'school-compass:grade-aulas';
const coresStorageKey = 'school-compass:disciplinas-cores';
const cores = [
  'blue',
  'green',
  'orange',
  'purple',
  'teal',
  'red',
  'yellow',
  'pink',
];
const classeCor: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  orange: 'bg-orange-500',
  purple: 'bg-purple-500',
  teal: 'bg-teal-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  pink: 'bg-pink-500',
};

const DisciplinasCadastroHorarios: React.FC = () => {
  const [disciplinas, setDisciplinas] = useState<CatalogItem[]>(
    () => loadFromStorage<CatalogItem[]>(disciplinasStorageKey, defaultDisciplinas),
  );
  const [turmas, setTurmas] = useState<Turma[]>(
    () => loadFromStorage<Turma[]>(turmasStorageKey, defaultTurmas),
  );
  const [aulas, setAulas] = useState<AulaCadastrada[]>(
    () => loadFromStorage<AulaCadastrada[]>(aulasStorageKey, []),
  );
  const [coresDisciplinas, setCoresDisciplinas] = useState<Record<string, string>>(
    () => loadFromStorage<Record<string, string>>(coresStorageKey, {}),
  );

  const [nomeDisciplina, setNomeDisciplina] = useState('');
  const [corSelecionada, setCorSelecionada] = useState('blue');

  const [nomeTurma, setNomeTurma] = useState('');
  const [anoSerie, setAnoSerie] = useState('');
  const [turnoTurma, setTurnoTurma] = useState<'Manha' | 'Tarde' | 'Noite'>('Manha');

  const [disciplinaAulaId, setDisciplinaAulaId] = useState('');
  const [turmaAulaId, setTurmaAulaId] = useState('');
  const [diaAula, setDiaAula] = useState('Segunda');
  const [inicioAula, setInicioAula] = useState('07:30');
  const [fimAula, setFimAula] = useState('08:20');

  const totalAulas = useMemo(() => aulas.length, [aulas]);

  const handleAddDisciplina = () => {
    const nome = nomeDisciplina.trim();
    if (!nome) return;
    const existe = disciplinas.some(
      (d) => d.nome.trim().toLowerCase() === nome.toLowerCase(),
    );
    if (existe) {
      window.alert('Disciplina ja cadastrada.');
      return;
    }
    const nova: CatalogItem = { id: createId('disciplina'), nome };
    const updated = [nova, ...disciplinas];
    const coresUpdated = { ...coresDisciplinas, [nova.id]: corSelecionada };
    setDisciplinas(updated);
    setCoresDisciplinas(coresUpdated);
    saveToStorage(disciplinasStorageKey, updated);
    saveToStorage(coresStorageKey, coresUpdated);
    setNomeDisciplina('');
  };

  const handleAddTurma = () => {
    const letraTurma = nomeTurma.trim().replace(/[^a-zA-Z]/g, '').toUpperCase();
    const anoNumero = anoSerie.trim().replace(/\D/g, '');
    if (!letraTurma || !anoNumero) return;
    const nomeCompleto = `${anoNumero}º Ano ${letraTurma}`;
    const existe = turmas.some(
      (t) => t.nome.trim().toLowerCase() === nomeCompleto.toLowerCase() && t.turno === turnoTurma,
    );
    if (existe) {
      window.alert('Ja existe uma turma com esse nome e turno.');
      return;
    }
    const nova: Turma = {
      id: createId('turma'),
      nome: nomeCompleto,
      turno: turnoTurma,
      alunos: 0,
      professor: '',
      status: 'Ativa',
      proximaAula: '',
    };
    const updated = [...turmas, nova];
    setTurmas(updated);
    saveToStorage(turmasStorageKey, updated);
    setNomeTurma('');
    setAnoSerie('');
  };

  const handleAddAula = () => {
    if (!disciplinaAulaId || !turmaAulaId) return;
    const nova: AulaCadastrada = {
      id: createId('aula'),
      disciplinaId: disciplinaAulaId,
      turmaId: turmaAulaId,
      dia: diaAula,
      inicio: inicioAula,
      fim: fimAula,
    };
    const updated = [...aulas, nova];
    setAulas(updated);
    saveToStorage(aulasStorageKey, updated);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/disciplinas">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="font-display text-3xl font-bold text-foreground">Cadastro de Horarios</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Disciplinas
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_auto]">
            <div className="space-y-2">
              <Label htmlFor="nome-disciplina">Nome da Disciplina</Label>
              <Input
                id="nome-disciplina"
                placeholder="Ex: Matematica"
                value={nomeDisciplina}
                onChange={(e) => setNomeDisciplina(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex items-center gap-2">
                {cores.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    onClick={() => setCorSelecionada(cor)}
                    className={`h-8 w-8 rounded-md border-2 ${corSelecionada === cor ? 'border-foreground' : 'border-transparent'} ${classeCor[cor]}`}
                    aria-label={`Cor ${cor}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddDisciplina}>
                <Plus className="w-4 h-4" />
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Turmas
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="nome-turma">Nome da Turma</Label>
              <Input
                id="nome-turma"
                placeholder="Ex: A"
                value={nomeTurma}
                onChange={(e) =>
                  setNomeTurma(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 1))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ano-serie">Ano/Serie</Label>
              <Input
                id="ano-serie"
                placeholder="Ex: 6"
                value={anoSerie}
                onChange={(e) => setAnoSerie(e.target.value.replace(/\D/g, '').slice(0, 2))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="turno">Turno</Label>
              <Select value={turnoTurma} onValueChange={(v: 'Manha' | 'Tarde' | 'Noite') => setTurnoTurma(v)}>
                <SelectTrigger id="turno">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manha">Manha</SelectItem>
                  <SelectItem value="Tarde">Tarde</SelectItem>
                  <SelectItem value="Noite">Noite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddTurma}>
                <Plus className="w-4 h-4" />
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              Aulas
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1fr_140px_140px_auto]">
            <div className="space-y-2">
              <Label htmlFor="disciplina-aula">Disciplina</Label>
              <Select value={disciplinaAulaId} onValueChange={setDisciplinaAulaId}>
                <SelectTrigger id="disciplina-aula">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {disciplinas.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="turma-aula">Turma</Label>
              <Select value={turmaAulaId} onValueChange={setTurmaAulaId}>
                <SelectTrigger id="turma-aula">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {turmas.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome} ({t.turno})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dia-aula">Dia</Label>
              <Select value={diaAula} onValueChange={setDiaAula}>
                <SelectTrigger id="dia-aula">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Segunda">Segunda</SelectItem>
                  <SelectItem value="Terca">Terca</SelectItem>
                  <SelectItem value="Quarta">Quarta</SelectItem>
                  <SelectItem value="Quinta">Quinta</SelectItem>
                  <SelectItem value="Sexta">Sexta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inicio-aula">Inicio</Label>
              <Input id="inicio-aula" value={inicioAula} onChange={(e) => setInicioAula(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fim-aula">Fim</Label>
              <Input id="fim-aula" value={fimAula} onChange={(e) => setFimAula(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddAula}>
                <Plus className="w-4 h-4" />
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button asChild variant="gradient">
            <Link to="/materiais">
              <CalendarDays className="w-4 h-4" />
              Ver Grade Completa ({totalAulas})
            </Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DisciplinasCadastroHorarios;
