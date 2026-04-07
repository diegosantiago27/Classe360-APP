import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Calendar, CheckCircle2, ClipboardList } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { loadFromStorage, saveToStorage, syncKeysFromBackend } from '@/lib/mockStorage';
import { useAuth } from '@/contexts/AuthContext';
import {
  MateriaAluno,
} from '@/lib/mockMateriasAluno';
import { Link } from 'react-router-dom';
import { CatalogItem, disciplinasStorageKey } from '@/lib/mockAcademics';
import { Turma, turmasStorageKey } from '@/lib/mockTurmas';
import { StoredUser, usersStorageKey } from '@/lib/mockUsers';
import {
  isApiEnabled,
  listAtividadesApi,
  listDisciplinasApi,
  listEntregasAtividadesApi,
  listFrequenciasApi,
  listTurmasApi,
  listUsuariosApi,
} from '@/lib/entityCrudApi';
import { mergeAlunosTurmasFromApi } from '@/lib/turmasUsuariosMerge';
import { loadVinculosDisciplinaTurma } from '@/lib/vinculosRelacional';
import { mapTurnoFieldsFromTurmaApi } from '@/lib/turnosCatalog';

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
  alunos?: AlunoVinculado[];
}

interface Atividade {
  id: string;
  titulo?: string;
  turma: string;
  disciplina: string;
}

interface AtividadeEntrega {
  id: string;
  atividadeId: string;
  alunoId: string;
}

interface RegistroPresenca {
  alunoId: string;
  turma: string;
  status: 'Presente' | 'Falta';
}

const vinculosStorageKey = 'school-compass:disciplinas-vinculos';
const atividadesStorageKey = 'school-compass:atividades';
const entregasStorageKey = 'school-compass:atividades-entregas';
const presencasStorageKey = 'school-compass:frequencia-diaria';

const normalizeText = (value?: string) =>
  (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const getTurmaKey = (value?: string) => {
  const normalized = normalizeText(value).replace(/º/g, 'o').replace(/\s+/g, ' ');
  const match = normalized.match(/(\d+)\s*(?:o|ano)?\s*([a-z])/i);
  if (match) return `${match[1]}${match[2]}`.toLowerCase();
  return normalized.replace(/[^a-z0-9]/g, '');
};

const getSerieFromTurma = (turmaNome: string) => {
  const match = turmaNome.match(/(\d+)/);
  return match ? `${match[1]}º Ano` : '-';
};

const MinhasMaterias: React.FC = () => {
  const { user } = useAuth();
  const [storageTick, setStorageTick] = useState(0);

  useEffect(() => {
    if (isApiEnabled()) {
      void Promise.all([
        listUsuariosApi(),
        listDisciplinasApi(),
        listTurmasApi(),
        listAtividadesApi(),
        listEntregasAtividadesApi(),
        listFrequenciasApi(),
        loadVinculosDisciplinaTurma(),
      ])
        .then(
          ([
            usuariosApi,
            disciplinasApi,
            turmasApi,
            atividadesApi,
            entregasApi,
            frequenciasApi,
            vincRows,
          ]) => {
          const usuariosMapped: StoredUser[] = usuariosApi.map((u) => ({
            id: String(u.id ?? ''),
            cpf: u.cpf ?? '',
            nome: u.nome ?? '',
            email: u.email ?? '',
            perfil: String(u.role ?? '').includes('PROFESSOR')
              ? 3
              : String(u.role ?? '').includes('ADMIN')
                ? 2
                : String(u.role ?? '').includes('GESTOR')
                  ? 1
                  : String(u.role ?? '').includes('SECRETARIA')
                    ? 5
                    : 4,
            status: u.ativo === false ? 'inativo' : 'ativo',
            turmas: [],
          }));
          const disciplinasMapped: CatalogItem[] = disciplinasApi.map((d) => ({
            id: String(d.id ?? ''),
            nome: d.nome ?? `Disciplina ${d.id ?? ''}`,
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
          const turmaNomeById = new Map(turmasMapped.map((t) => [String(t.id), t.nome]));
          const disciplinaNomeById = new Map(disciplinasMapped.map((d) => [String(d.id), d.nome]));
          const atividadesMapped: Atividade[] = atividadesApi.map((a) => ({
            id: String(a.id ?? ''),
            titulo: a.titulo ?? '',
            turma: turmaNomeById.get(String(a.turmaId ?? '')) ?? `Turma ${a.turmaId ?? ''}`,
            disciplina:
              disciplinaNomeById.get(String(a.disciplinaId ?? '')) ?? `Disciplina ${a.disciplinaId ?? ''}`,
          }));
          const entregasMapped: AtividadeEntrega[] = entregasApi.map((e) => ({
            id: String(e.id ?? ''),
            atividadeId: String(e.atividadeId ?? ''),
            alunoId: String(e.alunoId ?? ''),
          }));
          const presencasMapped: RegistroPresenca[] = frequenciasApi.map((f) => ({
            alunoId: String(f.alunoId ?? ''),
            turma: turmaNomeById.get(String(f.turmaId ?? '')) ?? `Turma ${f.turmaId ?? ''}`,
            status: f.presente ? 'Presente' : 'Falta',
          }));

          const usuariosComTurmas = mergeAlunosTurmasFromApi(usuariosMapped, turmasApi);
          saveToStorage(usersStorageKey, usuariosComTurmas);
          saveToStorage(disciplinasStorageKey, disciplinasMapped);
          saveToStorage(turmasStorageKey, turmasMapped);
          saveToStorage(atividadesStorageKey, atividadesMapped);
          saveToStorage(entregasStorageKey, entregasMapped);
          saveToStorage(presencasStorageKey, presencasMapped);
          saveToStorage(vinculosStorageKey, vincRows as DisciplinaVinculo[]);
        })
        .catch(() => {
          window.alert('Não foi possível carregar suas matérias. Verifique a API e tente novamente.');
        })
        .finally(() => setStorageTick((prev) => prev + 1));
      return;
    }
    void syncKeysFromBackend([
      usersStorageKey,
      disciplinasStorageKey,
      turmasStorageKey,
      vinculosStorageKey,
      atividadesStorageKey,
      entregasStorageKey,
      presencasStorageKey,
    ]).finally(() => setStorageTick((prev) => prev + 1));
  }, []);

  const usuarios = useMemo(
    () => loadFromStorage<StoredUser[]>(usersStorageKey, []),
    [storageTick],
  );
  const disciplinas = useMemo(
    () => loadFromStorage<CatalogItem[]>(disciplinasStorageKey, []),
    [storageTick],
  );
  const turmas = useMemo(
    () => loadFromStorage<Turma[]>(turmasStorageKey, []),
    [storageTick],
  );
  const vinculos = useMemo(
    () => loadFromStorage<DisciplinaVinculo[]>(vinculosStorageKey, []),
    [storageTick],
  );
  const atividades = useMemo(
    () => loadFromStorage<Atividade[]>(atividadesStorageKey, []),
    [storageTick],
  );
  const entregas = useMemo(
    () => loadFromStorage<AtividadeEntrega[]>(entregasStorageKey, []),
    [storageTick],
  );
  const presencas = useMemo(
    () => loadFromStorage<RegistroPresenca[]>(presencasStorageKey, []),
    [storageTick],
  );

  const alunoAtual = useMemo(
    () => usuarios.find((u) => u.id === user?.id) ?? null,
    [usuarios, user?.id],
  );

  const materias = useMemo(() => {
    if (!user?.id) return [];
    const turmaKeysAluno = new Set((alunoAtual?.turmas ?? []).map((t) => getTurmaKey(t)));

    const vinculosAluno = vinculos.filter((v) => {
      const isAlunoNoVinculo = (v.alunos ?? []).some((a) => a.alunoId === user.id);
      const turmaNome = turmas.find((t) => t.id === v.turmaId)?.nome ?? v.turmaNome;
      const isTurmaDoAluno = turmaKeysAluno.has(getTurmaKey(turmaNome));
      return isAlunoNoVinculo || isTurmaDoAluno;
    });

    if (vinculosAluno.length === 0) {
      return [];
    }

    const unique = new Map<string, MateriaAluno>();
    vinculosAluno.forEach((v) => {
      const turmaNome = turmas.find((t) => t.id === v.turmaId)?.nome ?? v.turmaNome ?? v.turmaId;
      const turno = turmas.find((t) => t.id === v.turmaId)?.turno ?? '-';
      const disciplinaNome =
        disciplinas.find((d) => d.id === v.disciplinaId)?.nome ?? v.disciplinaId;
      const turmaKey = getTurmaKey(turmaNome);
      const presencasAluno = presencas.filter(
        (p) => p.alunoId === user.id && getTurmaKey(p.turma) === turmaKey,
      );
      const faltas = presencasAluno.filter((p) => p.status === 'Falta').length;
      const presencaPercentual =
        presencasAluno.length > 0
          ? Math.round(((presencasAluno.length - faltas) / presencasAluno.length) * 1000) / 10
          : 0;

      const atividadesMateria = atividades.filter(
        (a) =>
          getTurmaKey(a.turma) === turmaKey &&
          normalizeText(a.disciplina) === normalizeText(disciplinaNome),
      );
      const atividadeIds = new Set(atividadesMateria.map((a) => a.id));
      const entregues = new Set(
        entregas
          .filter((e) => e.alunoId === user.id && atividadeIds.has(e.atividadeId))
          .map((e) => e.atividadeId),
      );
      const atividadesPendentes = Math.max(0, atividadeIds.size - entregues.size);
      const ultimaAtividade = atividadesMateria[0]?.titulo?.trim() || 'Sem atividade';

      const id = `${v.disciplinaId}-${v.turmaId || turmaNome}`;
      unique.set(id, {
        id,
        alunoId: user.id,
        disciplina: disciplinaNome,
        professor: v.professorNome?.trim() ? `Prof. ${v.professorNome}` : 'Professor não definido',
        turma: turmaNome,
        turno,
        serie: getSerieFromTurma(turmaNome),
        frequencia: presencaPercentual,
        atividadesPendentes,
        atividadesTotais: atividadeIds.size,
        ultimaAtividade,
      });
    });

    return Array.from(unique.values()).sort((a, b) =>
      a.disciplina.localeCompare(b.disciplina, 'pt-BR', { sensitivity: 'base' }),
    );
  }, [alunoAtual?.turmas, atividades, disciplinas, entregas, presencas, turmas, user?.id, vinculos]);

  const materiasFiltradas = useMemo(
    () => materias.filter((item) => !item.alunoId || item.alunoId === user?.id),
    [materias, user],
  );
  const [materiaSelecionada, setMateriaSelecionada] = useState<MateriaAluno | null>(
    materiasFiltradas[0] ?? null,
  );

  useEffect(() => {
    if (materiasFiltradas.length === 0) {
      setMateriaSelecionada(null);
      return;
    }
    const atualExiste = materiasFiltradas.some((item) => item.id === materiaSelecionada?.id);
    if (!atualExiste) {
      setMateriaSelecionada(materiasFiltradas[0]);
    }
  }, [materiaSelecionada?.id, materiasFiltradas]);

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
