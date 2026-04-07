import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, CalendarDays, Plus } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createId, loadFromStorage, saveToStorage, syncKeysFromBackend } from '@/lib/mockStorage';
import { CatalogItem, defaultDisciplinas, disciplinasStorageKey } from '@/lib/mockAcademics';
import { Turma, defaultTurmas, turmasStorageKey } from '@/lib/mockTurmas';
import { StoredUser, defaultUsers, usersStorageKey } from '@/lib/mockUsers';
import { UserProfile } from '@/types/auth';
import {
  isApiEnabled,
  listDisciplinasApi,
  listGradeAulasApi,
  listTurmasApi,
  listUsuariosApi,
  saveDisciplinaApi,
  saveDisciplinaTurmaApi,
  saveGradeAulaApi,
} from '@/lib/entityCrudApi';
import { loadVinculosDisciplinaTurma } from '@/lib/vinculosRelacional';
import { mapTurnoFieldsFromTurmaApi, rotuloTurnoParaExibicao } from '@/lib/turnosCatalog';

interface AulaCadastrada {
  id: string;
  disciplinaId: string;
  turmaId: string;
  dia: string;
  inicio: string;
  fim: string;
}

interface AlunoVinculado {
  alunoId: string;
  alunoNome: string;
  turno?: 'Manha' | 'Tarde' | 'Noite';
  ano?: string;
  serie?: string;
}

interface DisciplinaVinculo {
  disciplinaId: string;
  turmaId: string;
  turmaNome: string;
  professorId: string;
  professorNome: string;
  alunos: AlunoVinculado[];
}

const aulasStorageKey = 'school-compass:grade-aulas';
const coresStorageKey = 'school-compass:disciplinas-cores';
const vinculosStorageKey = 'school-compass:disciplinas-vinculos';

function formatHorarioInput(value: string): string {
  const apenasDigitos = value.replace(/\D/g, '').slice(0, 4);
  if (apenasDigitos.length <= 2) return apenasDigitos;
  return `${apenasDigitos.slice(0, 2)}:${apenasDigitos.slice(2)}`;
}

function roleToPerfil(role: string): UserProfile {
  switch (role) {
    case 'ROLE_GESTOR':
      return UserProfile.GESTOR;
    case 'ROLE_ADMIN':
    case 'ADMIN':
      return UserProfile.ADMINISTRADOR;
    case 'ROLE_SECRETARIA':
      return UserProfile.SECRETARIA;
    case 'ROLE_PROFESSOR':
      return UserProfile.PROFESSOR;
    case 'ROLE_ALUNO':
    default:
      return UserProfile.ALUNO;
  }
}
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
  const location = useLocation();
  const disciplinaIdQuery = useMemo(
    () => new URLSearchParams(location.search).get('disciplinaId') ?? '',
    [location.search],
  );
  const [disciplinas, setDisciplinas] = useState<CatalogItem[]>(
    () => loadFromStorage<CatalogItem[]>(disciplinasStorageKey, isApiEnabled() ? [] : defaultDisciplinas),
  );
  const [turmas, setTurmas] = useState<Turma[]>(
    () => loadFromStorage<Turma[]>(turmasStorageKey, isApiEnabled() ? [] : defaultTurmas),
  );
  const [usuarios, setUsuarios] = useState<StoredUser[]>(
    () => loadFromStorage<StoredUser[]>(usersStorageKey, isApiEnabled() ? [] : defaultUsers),
  );
  const [vinculos, setVinculos] = useState<DisciplinaVinculo[]>(
    () => loadFromStorage<DisciplinaVinculo[]>(vinculosStorageKey, []),
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

  const [nomeDisciplina, setNomeDisciplina] = useState('');
  const [corSelecionada, setCorSelecionada] = useState('blue');
  const [professorId, setProfessorId] = useState('');

  const [disciplinaAulaId, setDisciplinaAulaId] = useState('');
  const [turmaAulaId, setTurmaAulaId] = useState('');
  const [diaAula, setDiaAula] = useState('');
  const [inicioAula, setInicioAula] = useState('');
  const [fimAula, setFimAula] = useState('');

  const professores = useMemo(
    () => usuarios.filter((u) => u.perfil === UserProfile.PROFESSOR && u.status === 'ativo'),
    [usuarios],
  );
  useEffect(() => {
    if (!disciplinaIdQuery) return;
    setDisciplinaAulaId(disciplinaIdQuery);
  }, [disciplinaIdQuery]);

  useEffect(() => {
    const keysOffline = [
      disciplinasStorageKey,
      turmasStorageKey,
      usersStorageKey,
      vinculosStorageKey,
      aulasStorageKey,
      coresStorageKey,
    ];
    if (isApiEnabled()) {
      void Promise.all([
        listDisciplinasApi(),
        listTurmasApi(),
        listUsuariosApi(),
        listGradeAulasApi(),
        loadVinculosDisciplinaTurma(),
      ])
        .then(([disciplinasApi, turmasApi, usuariosApi, gradeRows, vincRows]) => {
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
          const usuariosMapped: StoredUser[] = usuariosApi.map((u) => ({
            id: String(u.id ?? ''),
            cpf: u.cpf ?? '',
            nome: u.nome ?? '',
            email: u.email ?? '',
            perfil: roleToPerfil(String(u.role ?? 'ROLE_ALUNO')),
            turno: undefined,
            status: u.ativo === false ? 'inativo' : 'ativo',
            turmas: [],
          }));
          const aulasMapped: AulaCadastrada[] = gradeRows
            .filter((r) => r.disciplinaId != null && r.turmaId != null)
            .map((r) => ({
              id: String(r.id ?? createId('aula')),
              disciplinaId: String(r.disciplinaId),
              turmaId: String(r.turmaId),
              dia: r.dia ?? '',
              inicio: r.inicio ?? '',
              fim: r.fim ?? '',
            }));
          saveToStorage(disciplinasStorageKey, disciplinasMapped);
          saveToStorage(turmasStorageKey, turmasMapped);
          saveToStorage(usersStorageKey, usuariosMapped);
          setDisciplinas(disciplinasMapped);
          setTurmas(turmasMapped);
          setUsuarios(usuariosMapped);
          setVinculos(vincRows as DisciplinaVinculo[]);
          setAulas(aulasMapped);
        })
        .catch(() => null);
      return;
    }
    void syncKeysFromBackend(keysOffline).finally(() => {
      setDisciplinas(
        loadFromStorage<CatalogItem[]>(disciplinasStorageKey, isApiEnabled() ? [] : defaultDisciplinas),
      );
      setTurmas(loadFromStorage<Turma[]>(turmasStorageKey, isApiEnabled() ? [] : defaultTurmas));
      setUsuarios(loadFromStorage<StoredUser[]>(usersStorageKey, isApiEnabled() ? [] : defaultUsers));
      setVinculos(loadFromStorage<DisciplinaVinculo[]>(vinculosStorageKey, []));
      setAulas(loadFromStorage<AulaCadastrada[]>(aulasStorageKey, []));
    });
  }, []);

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
    const addLocal = () => {
      const nova: CatalogItem = { id: createId('disciplina'), nome, cor: corSelecionada };
      const updated = [nova, ...disciplinas];
      setDisciplinas(updated);
      saveToStorage(disciplinasStorageKey, updated);
      saveToStorage(coresStorageKey, {
        ...Object.fromEntries(disciplinas.map((d) => [d.id, d.cor && d.cor.trim() ? d.cor : 'blue'])),
        [nova.id]: corSelecionada,
      });
    };
    if (isApiEnabled()) {
      void saveDisciplinaApi({ nome, cor: corSelecionada })
        .then((saved) => {
          const nova: CatalogItem = {
            id: String(saved.id ?? createId('disciplina')),
            nome: saved.nome ?? nome,
            cor: saved.cor ?? corSelecionada,
          };
          const updated = [nova, ...disciplinas.filter((d) => d.id !== nova.id)];
          setDisciplinas(updated);
          saveToStorage(disciplinasStorageKey, updated);
        })
        .catch(() => {
          window.alert('Não foi possível salvar a disciplina. Verifique a API e tente novamente.');
        });
    } else {
      addLocal();
    }
    setNomeDisciplina('');
  };

  const handleAddAula = () => {
    const horarioValido = /^\d{2}:\d{2}$/;
    if (!disciplinaAulaId || !turmaAulaId || !diaAula || !inicioAula || !fimAula) {
      window.alert('Preencha disciplina, turma, dia, inicio e fim.');
      return;
    }
    if (!horarioValido.test(inicioAula) || !horarioValido.test(fimAula)) {
      window.alert('Use o formato de horario HH:MM (ex.: 07:30).');
      return;
    }
    const vinculoAtual = vinculos.find(
      (v) => v.disciplinaId === disciplinaAulaId && v.turmaId === turmaAulaId,
    );
    const professorAssociadoId = professorId || vinculoAtual?.professorId || '';

    const aulaDuplicada = aulas.some(
      (a) =>
        a.disciplinaId === disciplinaAulaId &&
        a.turmaId === turmaAulaId &&
        a.dia === diaAula &&
        a.inicio === inicioAula &&
        a.fim === fimAula,
    );
    if (aulaDuplicada) {
      window.alert('Essa aula ja esta cadastrada para essa turma no mesmo horario.');
      return;
    }

    if (professorAssociadoId) {
      const conflitoMesmoProfessor = aulas.some((a) => {
        if (
          a.turmaId !== turmaAulaId ||
          a.dia !== diaAula ||
          a.inicio !== inicioAula ||
          a.fim !== fimAula
        ) {
          return false;
        }
        const vinculoExistente = vinculos.find(
          (v) => v.disciplinaId === a.disciplinaId && v.turmaId === a.turmaId,
        );
        return vinculoExistente?.professorId === professorAssociadoId;
      });

      if (conflitoMesmoProfessor) {
        window.alert('Nao e permitido repetir professor na mesma turma e horario.');
        return;
      }
    }

    const createLocalAula = () => {
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
    if (isApiEnabled()) {
      const disciplinaIdNum = Number(disciplinaAulaId);
      const turmaIdNum = Number(turmaAulaId);
      if (Number.isFinite(disciplinaIdNum) && Number.isFinite(turmaIdNum)) {
        void saveGradeAulaApi({
          disciplinaId: disciplinaIdNum,
          turmaId: turmaIdNum,
          dia: diaAula,
          inicio: inicioAula,
          fim: fimAula,
        })
          .then((saved) => {
            const nova: AulaCadastrada = {
              id: String(saved.id ?? createId('aula')),
              disciplinaId: disciplinaAulaId,
              turmaId: turmaAulaId,
              dia: diaAula,
              inicio: inicioAula,
              fim: fimAula,
            };
            setAulas([...aulas, nova]);
          })
          .catch(() => {
            window.alert('Não foi possível salvar a aula. Verifique a API e tente novamente.');
          });
      } else {
        window.alert('Não foi possível salvar a aula. IDs inválidos.');
        return;
      }
    } else {
      createLocalAula();
    }

    if (professorId) {
      const turmaNome = turmas.find((t) => t.id === turmaAulaId)?.nome ?? '';
      const professorNome = professores.find((p) => p.id === professorId)?.nome ?? '';
      const disciplinaIdNum = Number(disciplinaAulaId);
      const turmaIdNum = Number(turmaAulaId);
      const professorNum = Number(professorId);
      if (turmaNome && professorNome) {
        const existente = vinculos.find(
          (v) => v.disciplinaId === disciplinaAulaId && v.turmaId === turmaAulaId,
        );
        const novo: DisciplinaVinculo = {
          disciplinaId: disciplinaAulaId,
          turmaId: turmaAulaId,
          turmaNome,
          professorId,
          professorNome,
          alunos: existente?.alunos ?? [],
        };
        const updatedVinculos = existente
          ? vinculos.map((v) =>
              v.disciplinaId === disciplinaAulaId && v.turmaId === turmaAulaId ? novo : v,
            )
          : [...vinculos, novo];
        setVinculos(updatedVinculos);
        if (
          isApiEnabled() &&
          Number.isFinite(disciplinaIdNum) &&
          Number.isFinite(turmaIdNum) &&
          Number.isFinite(professorNum)
        ) {
          void saveDisciplinaTurmaApi({
            disciplinaId: disciplinaIdNum,
            turmaId: turmaIdNum,
            professorId: professorNum,
          })
            .then(() => loadVinculosDisciplinaTurma().then((rows) => setVinculos(rows as DisciplinaVinculo[])))
            .catch(() => {
              window.alert('Não foi possível vincular o professor. Verifique a API e tente novamente.');
            });
        } else if (!isApiEnabled()) {
          saveToStorage(vinculosStorageKey, updatedVinculos);
        } else {
          window.alert('Não foi possível vincular o professor. IDs inválidos.');
        }
      }
    }

    setDisciplinaAulaId('');
    setTurmaAulaId('');
    setDiaAula('');
    setInicioAula('');
    setFimAula('');
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
              <BookOpen className="w-5 h-5 text-primary" />
              Atribuir Professor
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="professor-vinculo">Professor</Label>
              <Select value={professorId} onValueChange={setProfessorId}>
                <SelectTrigger id="professor-vinculo">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {professores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                      {t.nome} ({rotuloTurnoParaExibicao(t)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dia-aula">Dia</Label>
              <Select value={diaAula} onValueChange={setDiaAula}>
                <SelectTrigger id="dia-aula">
                  <SelectValue placeholder="Selecione" />
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
              <Input
                id="inicio-aula"
                value={inicioAula}
                onChange={(e) => setInicioAula(formatHorarioInput(e.target.value))}
                placeholder="07:30"
                inputMode="numeric"
                maxLength={5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fim-aula">Fim</Label>
              <Input
                id="fim-aula"
                value={fimAula}
                onChange={(e) => setFimAula(formatHorarioInput(e.target.value))}
                placeholder="08:20"
                inputMode="numeric"
                maxLength={5}
              />
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
            <Link to="/agenda-semanal">
              <CalendarDays className="w-4 h-4" />
              Ver Grade Completa
            </Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DisciplinasCadastroHorarios;
