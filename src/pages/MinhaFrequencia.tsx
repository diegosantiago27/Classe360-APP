import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, UserCheck } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { loadFromStorage, saveToStorage, syncKeysFromBackend } from '@/lib/mockStorage';
import { useAuth } from '@/contexts/AuthContext';
import { CatalogItem, disciplinasStorageKey } from '@/lib/mockAcademics';
import { StoredUser, usersStorageKey } from '@/lib/mockUsers';
import { UserProfile } from '@/types/auth';
import {
  isApiEnabled,
  listDisciplinasApi,
  listFrequenciasApi,
  listTurmasApi,
  listUsuariosApi,
} from '@/lib/entityCrudApi';
import { mergeAlunosTurmasFromApi } from '@/lib/turmasUsuariosMerge';
import { loadVinculosDisciplinaTurma } from '@/lib/vinculosRelacional';

interface FrequenciaItem {
  id: string;
  disciplina: string;
  presenca: number;
  faltas: number;
}

interface RegistroPresenca {
  id: string;
  turma: string;
  alunoId: string;
  alunoNome: string;
  data: string;
  status: 'Presente' | 'Falta';
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

const presencasStorageKey = 'school-compass:frequencia-diaria';
const vinculosStorageKey = 'school-compass:disciplinas-vinculos';

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

const MinhaFrequencia: React.FC = () => {
  const { user } = useAuth();
  const [storageTick, setStorageTick] = useState(0);

  useEffect(() => {
    if (isApiEnabled()) {
      void Promise.all([
        listUsuariosApi(),
        listDisciplinasApi(),
        listTurmasApi(),
        listFrequenciasApi(),
        loadVinculosDisciplinaTurma(),
      ])
        .then(([usuariosApi, disciplinasApi, turmasApi, frequenciasApi, vincRows]) => {
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
          const turmaNomeById = new Map(
            turmasApi.map((t) => [String(t.id ?? ''), t.nome ?? `Turma ${t.id ?? ''}`]),
          );
          const alunoNomeById = new Map(usuariosMapped.map((u) => [u.id, u.nome]));
          const presencasMapped: RegistroPresenca[] = frequenciasApi.map((f) => ({
            id: String(f.id ?? ''),
            turma: turmaNomeById.get(String(f.turmaId ?? '')) ?? `Turma ${f.turmaId ?? ''}`,
            alunoId: String(f.alunoId ?? ''),
            alunoNome: alunoNomeById.get(String(f.alunoId ?? '')) ?? '',
            data: f.data ?? '',
            status: f.presente ? 'Presente' : 'Falta',
          }));
          const usuariosComTurmas = mergeAlunosTurmasFromApi(usuariosMapped, turmasApi);
          saveToStorage(usersStorageKey, usuariosComTurmas);
          saveToStorage(disciplinasStorageKey, disciplinasMapped);
          saveToStorage(presencasStorageKey, presencasMapped);
          saveToStorage(vinculosStorageKey, vincRows as DisciplinaVinculo[]);
        })
        .catch(() => {
          window.alert('Não foi possível carregar sua frequência. Verifique a API e tente novamente.');
        })
        .finally(() => setStorageTick((prev) => prev + 1));
      return;
    }
    void syncKeysFromBackend([usersStorageKey, disciplinasStorageKey, vinculosStorageKey, presencasStorageKey])
      .finally(() => setStorageTick((prev) => prev + 1));
  }, []);

  const usuarios = useMemo(
    () => loadFromStorage<StoredUser[]>(usersStorageKey, []),
    [storageTick],
  );
  const disciplinas = useMemo(
    () => loadFromStorage<CatalogItem[]>(disciplinasStorageKey, []),
    [storageTick],
  );
  const vinculos = useMemo(
    () => loadFromStorage<DisciplinaVinculo[]>(vinculosStorageKey, []),
    [storageTick],
  );
  const presencas = useMemo(
    () => loadFromStorage<RegistroPresenca[]>(presencasStorageKey, []),
    [storageTick],
  );
  const alunoAtual = useMemo(
    () => usuarios.find((u) => u.id === user?.id && u.perfil === UserProfile.ALUNO) ?? null,
    [usuarios, user?.id],
  );

  const frequencias = useMemo(() => {
    if (!alunoAtual) return [];
    const turmaKeysAluno = new Set((alunoAtual.turmas ?? []).map((t) => getTurmaKey(t)));

    const vinculosAluno = vinculos.filter((v) => {
      const temAlunoNoVinculo = (v.alunos ?? []).some((a) => a.alunoId === alunoAtual.id);
      const turmaCompativel = turmaKeysAluno.has(getTurmaKey(v.turmaNome)) || turmaKeysAluno.has(getTurmaKey(v.turmaId));
      return temAlunoNoVinculo || turmaCompativel;
    });

    const unicos = new Map<string, FrequenciaItem>();
    vinculosAluno.forEach((v) => {
      const disciplinaNome =
        disciplinas.find((d) => d.id === v.disciplinaId)?.nome ??
        v.disciplinaId;
      const turmaKeyVinculo = getTurmaKey(v.turmaNome || v.turmaId);
      const presencasAlunoTurma = presencas.filter(
        (p) => p.alunoId === alunoAtual.id && getTurmaKey(p.turma) === turmaKeyVinculo,
      );
      const totalRegistros = presencasAlunoTurma.length;
      const faltas = presencasAlunoTurma.filter((p) => p.status === 'Falta').length;
      const presentes = totalRegistros - faltas;
      const presencaPercentual =
        totalRegistros > 0 ? Math.round((presentes / totalRegistros) * 1000) / 10 : 0;

      const item: FrequenciaItem = {
        id: `${v.disciplinaId}-${turmaKeyVinculo}`,
        disciplina: disciplinaNome,
        presenca: presencaPercentual,
        faltas,
      };
      unicos.set(item.id, item);
    });

    return Array.from(unicos.values()).sort((a, b) =>
      a.disciplina.localeCompare(b.disciplina, 'pt-BR', { sensitivity: 'base' }),
    );
  }, [alunoAtual, disciplinas, presencas, vinculos]);

  const media = useMemo(() => {
    if (frequencias.length === 0) return 0;
    return (
      Math.round((frequencias.reduce((acc, item) => acc + item.presenca, 0) / frequencias.length) * 10) /
      10
    );
  }, [frequencias]);

  const ultimaAtualizacao = useMemo(() => {
    if (!alunoAtual) return 'Sem registros';
    const datas = presencas
      .filter((p) => p.alunoId === alunoAtual.id)
      .map((p) => p.data)
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a));
    if (datas.length === 0) return 'Sem registros';
    const [yyyy, mm, dd] = datas[0].split('-');
    return dd && mm && yyyy ? `${dd}/${mm}/${yyyy}` : datas[0];
  }, [alunoAtual, presencas]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Minha frequencia
            </h1>
            <p className="text-muted-foreground">
              Acompanhe a frequencia por disciplina e seu historico geral.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Frequencia geral
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">{media}%</div>
              </div>
              <UserCheck className="w-5 h-5 text-success" />
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ultima atualizacao
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">{ultimaAtualizacao}</div>
              </div>
              <Calendar className="w-5 h-5 text-primary" />
            </CardHeader>
          </Card>
        </div>

        {frequencias.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhum registro de frequencia encontrado para suas disciplinas.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {frequencias.map((item) => (
              <Card key={item.id} className="card-hover">
                <CardHeader>
                  <CardTitle className="text-lg">{item.disciplina}</CardTitle>
                  <CardDescription>
                    Faltas registradas: {item.faltas}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-success"
                          style={{ width: `${item.presenca}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {item.presenca}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Somente leitura para alunos.
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MinhaFrequencia;
