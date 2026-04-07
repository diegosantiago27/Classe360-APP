import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { createId, loadFromStorage, saveToStorage, syncKeysFromBackend } from '@/lib/mockStorage';
import {
  isApiEnabled,
  listDisciplinasApi,
  listPeriodosApi,
  listTurmasApi,
  saveProvaApi,
} from '@/lib/entityCrudApi';
import { loadVinculosDisciplinaTurma } from '@/lib/vinculosRelacional';
import { mapTurnoFieldsFromTurmaApi, rotuloTurnoParaExibicao } from '@/lib/turnosCatalog';
import {
  CatalogItem,
  defaultDisciplinas,
  defaultPeriodos,
  disciplinasStorageKey,
  periodosParaSelecao,
  periodosStorageKey,
} from '@/lib/mockAcademics';
import { Turma, defaultTurmas, turmasStorageKey } from '@/lib/mockTurmas';
import { defaultInstituicao, instituicaoStorageKey } from '@/lib/mockInstituicao';
import { createProvaRelacional, isProvasRelacionalEnabled } from '@/lib/provasRelApi';

const vinculosStorageKey = 'school-compass:disciplinas-vinculos';

function normalizeText(value?: string): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

interface DisciplinaVinculo {
  disciplinaId: string;
  turmaId: string;
  turmaNome: string;
  professorId: string;
  professorNome: string;
  disciplinaNome?: string;
}

type TipoQuestao = 'multipla' | 'dissertativa' | 'verdadeiro-falso';

interface QuestaoDraft {
  id: string;
  enunciado: string;
  tipo: TipoQuestao;
  pontuacao: number;
  alternativas: string[];
  corretaIndex: number | null;
}

interface Prova {
  id: string;
  professorId?: string;
  professorNome?: string;
  titulo: string;
  turma: string;
  disciplina: string;
  periodo: string;
  data: string;
  horario: string; // duração (hh:mm)
  sala: string;
  instrucoes: string;
  status: 'Agendada' | 'Rascunho' | 'Concluida';
  publicada: boolean;
  questoes?: Array<{
    id: string;
    enunciado: string;
    tipo: 'multipla' | 'aberta';
    pontos: number;
    opcoes: string[];
    corretaIndex: number | null;
  }>;
  turno?: string;
}

const provasStorageKey = 'school-compass:provas';

const NovaProva: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [disciplinaId, setDisciplinaId] = useState('');
  const [turmaId, setTurmaId] = useState('');
  const [turno, setTurno] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [data, setData] = useState('');
  const [duracao, setDuracao] = useState('');
  const [titulo, setTitulo] = useState('');
  const [instrucoes, setInstrucoes] = useState('');

  const [questoes, setQuestoes] = useState<QuestaoDraft[]>([
    {
      id: createId('questao'),
      enunciado: '',
      tipo: 'multipla',
      pontuacao: 2.5,
      alternativas: ['', '', '', ''],
      corretaIndex: null,
    },
  ]);

  const [disciplinasDisponiveis, setDisciplinasDisponiveis] = useState<CatalogItem[]>(
    () => loadFromStorage<CatalogItem[]>(disciplinasStorageKey, isApiEnabled() ? [] : defaultDisciplinas),
  );
  const [turmasDisponiveis, setTurmasDisponiveis] = useState<Turma[]>(
    () => loadFromStorage<Turma[]>(turmasStorageKey, isApiEnabled() ? [] : defaultTurmas),
  );
  const [vinculos, setVinculos] = useState<DisciplinaVinculo[]>(
    () => loadFromStorage<DisciplinaVinculo[]>(vinculosStorageKey, []),
  );
  const [periodosDisponiveis, setPeriodosDisponiveis] = useState<CatalogItem[]>(() =>
    periodosParaSelecao(
      loadFromStorage<CatalogItem[]>(periodosStorageKey, isApiEnabled() ? [] : defaultPeriodos),
    ),
  );
  const instituicao = useMemo(() => {
    const dados = loadFromStorage(instituicaoStorageKey, defaultInstituicao);
    return dados.nome?.trim() || defaultInstituicao.nome;
  }, []);

  useEffect(() => {
    const keys = [disciplinasStorageKey, turmasStorageKey, vinculosStorageKey, periodosStorageKey];
    if (isApiEnabled()) {
      void Promise.all([listDisciplinasApi(), listTurmasApi(), listPeriodosApi()])
        .then(([disciplinasApi, turmasApi, periodosApi]) => {
          const disciplinasMapped: CatalogItem[] = disciplinasApi.map((d) => ({
            id: String(d.id ?? ''),
            nome: d.nome ?? `Disciplina ${d.id ?? ''}`,
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
          const periodosMapped: CatalogItem[] = periodosApi.map((p) => ({
            id: String(p.id ?? ''),
            nome: p.nome ?? `Periodo ${p.id ?? ''}`,
          }));
          saveToStorage(disciplinasStorageKey, disciplinasMapped);
          saveToStorage(turmasStorageKey, turmasMapped);
          saveToStorage(periodosStorageKey, periodosMapped);
          setDisciplinasDisponiveis(disciplinasMapped);
          setTurmasDisponiveis(turmasMapped);
          setPeriodosDisponiveis(periodosParaSelecao(periodosMapped));
          void loadVinculosDisciplinaTurma()
            .then((rows) => setVinculos(rows as DisciplinaVinculo[]))
            .catch(() => setVinculos([]));
        })
        .catch(() => {
          window.alert('Não foi possível carregar disciplinas, turmas e períodos. Verifique a API e tente novamente.');
          setDisciplinasDisponiveis(loadFromStorage<CatalogItem[]>(disciplinasStorageKey, []));
          setTurmasDisponiveis(loadFromStorage<Turma[]>(turmasStorageKey, []));
          setVinculos(loadFromStorage<DisciplinaVinculo[]>(vinculosStorageKey, []));
          setPeriodosDisponiveis(periodosParaSelecao(loadFromStorage<CatalogItem[]>(periodosStorageKey, [])));
        });
      return;
    }
    void syncKeysFromBackend(keys).finally(() => {
      setDisciplinasDisponiveis(loadFromStorage<CatalogItem[]>(disciplinasStorageKey, defaultDisciplinas));
      setTurmasDisponiveis(loadFromStorage<Turma[]>(turmasStorageKey, defaultTurmas));
      setVinculos(loadFromStorage<DisciplinaVinculo[]>(vinculosStorageKey, []));
      setPeriodosDisponiveis(
        periodosParaSelecao(loadFromStorage<CatalogItem[]>(periodosStorageKey, defaultPeriodos)),
      );
    });
  }, []);

  const professorVinculos = useMemo(() => {
    if (!user?.id) return [];
    const idAtual = normalizeText(user.id);
    if (!idAtual) return [];
    return vinculos.filter((v) => normalizeText(v.professorId) === idAtual);
  }, [vinculos, user?.id]);

  const disciplinasFiltradas = useMemo(() => {
    if (professorVinculos.length === 0) return disciplinasDisponiveis;
    const ids = new Set(professorVinculos.map((v) => v.disciplinaId));
    return disciplinasDisponiveis.filter((d) => ids.has(d.id));
  }, [disciplinasDisponiveis, professorVinculos]);

  const turmasFiltradas = useMemo(() => {
    if (!disciplinaId) return [];
    const disciplinaSelecionada = disciplinasDisponiveis.find((d) => d.id === disciplinaId);
    const disciplinaNomeSelecionada = normalizeText(disciplinaSelecionada?.nome);

    const vinculosDaDisciplina = professorVinculos.filter((v) => {
      const matchPorId = normalizeText(v.disciplinaId) === normalizeText(disciplinaId);
      const matchPorNome =
        disciplinaNomeSelecionada &&
        normalizeText(v.disciplinaNome) === disciplinaNomeSelecionada;
      return matchPorId || Boolean(matchPorNome);
    });

    const turmaIds = new Set(vinculosDaDisciplina.map((v) => normalizeText(v.turmaId)));
    const turmaNomes = new Set(vinculosDaDisciplina.map((v) => normalizeText(v.turmaNome)));

    return turmasDisponiveis.filter(
      (t) => turmaIds.has(normalizeText(t.id)) || turmaNomes.has(normalizeText(t.nome)),
    );
  }, [disciplinaId, disciplinasDisponiveis, professorVinculos, turmasDisponiveis]);

  const turnoPorTurma = useMemo(
    () =>
      Object.fromEntries(turmasDisponiveis.map((t) => [t.id, rotuloTurnoParaExibicao(t)] as const)),
    [turmasDisponiveis],
  );

  const handleAddQuestao = () => {
    setQuestoes((prev) => [
      ...prev,
      {
        id: createId('questao'),
        enunciado: '',
        tipo: 'multipla',
        pontuacao: 2.5,
        alternativas: ['', '', '', ''],
        corretaIndex: null,
      },
    ]);
  };

  const handleRemoveQuestao = (questaoId: string) => {
    setQuestoes((prev) => prev.filter((questao) => questao.id !== questaoId));
  };

  const handleTipoChange = (questaoId: string, tipo: TipoQuestao) => {
    setQuestoes((prev) =>
      prev.map((questao) => {
        if (questao.id !== questaoId) return questao;
        if (tipo === 'dissertativa') {
          return { ...questao, tipo, alternativas: [], corretaIndex: null };
        }
        if (tipo === 'verdadeiro-falso') {
          return { ...questao, tipo, alternativas: ['Verdadeiro', 'Falso'], corretaIndex: null };
        }
        return {
          ...questao,
          tipo,
          alternativas: questao.alternativas.length ? questao.alternativas : ['', '', '', ''],
        };
      }),
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!disciplinaId || !turmaId || !periodo || !data || !titulo.trim()) {
      window.alert('Preencha disciplina, turma, bimestre, data e título.');
      return;
    }

    const disciplinaNome =
      disciplinasDisponiveis.find((d) => d.id === disciplinaId)?.nome ?? '';
    const turmaNome = turmasDisponiveis.find((t) => t.id === turmaId)?.nome ?? '';
    if (!disciplinaNome || !turmaNome) {
      window.alert('Selecione disciplina e turma válidas.');
      return;
    }

    const questoesFormatadas = questoes.map((questao) => ({
      id: questao.id,
      enunciado: questao.enunciado,
      tipo: questao.tipo === 'dissertativa' ? 'aberta' : 'multipla',
      pontos: questao.pontuacao,
      opcoes: questao.alternativas,
      corretaIndex: questao.tipo === 'dissertativa' ? null : questao.corretaIndex,
    }));
    const turmaIdNum = Number(turmaId);
    const disciplinaIdNum = Number(disciplinaId);

    const stored = loadFromStorage<Prova[]>(provasStorageKey, []);
    const provaLocal: Prova = {
      id: createId('prova'),
      professorId: user?.id ?? '',
      professorNome: user?.nome ?? '',
      titulo,
      turma: turmaNome,
      disciplina: disciplinaNome,
      periodo,
      data,
      horario: duracao,
      sala: '',
      instrucoes,
      status: 'Agendada',
      publicada: true,
      questoes: questoesFormatadas,
      turno,
    };

    if (isProvasRelacionalEnabled()) {
      try {
        await createProvaRelacional({
          professorId: Number(user?.id),
          professorNome: user?.nome ?? '',
          turmaId: Number.isFinite(turmaIdNum) ? turmaIdNum : undefined,
          turmaNome,
          disciplinaId: Number.isFinite(disciplinaIdNum) ? disciplinaIdNum : undefined,
          disciplinaNome,
          titulo,
          descricao: instrucoes,
          periodo,
          data,
          horario: duracao,
          instrucoes,
          status: 'Agendada',
          publicada: true,
          turno,
          questoes: questoesFormatadas.map((q) => ({
            enunciado: q.enunciado,
            tipo: q.tipo === 'aberta' ? 'aberta' : q.tipo,
            pontos: q.pontos,
            opcoes: q.opcoes,
            corretaIndex: q.corretaIndex,
          })),
        });
        navigate('/provas');
        return;
      } catch {
        window.alert('Nao foi possivel salvar a prova no servidor relacional.');
        return;
      }
    }

    if (isApiEnabled()) {
      try {
        await saveProvaApi({
          id: undefined,
          data,
          horario: duracao,
          titulo,
          status: 'Agendada',
          descricao: JSON.stringify({
            sala: '',
            questoes: questoesFormatadas,
            turno,
            periodo,
            instrucoes,
            professorId: user?.id ?? '',
            professorNome: user?.nome ?? '',
          }),
          turmaId: Number.isFinite(turmaIdNum) ? turmaIdNum : null,
          disciplinaId: Number.isFinite(disciplinaIdNum) ? disciplinaIdNum : null,
          periodo,
          instrucoes,
          publicada: true,
          ativa: true,
          professorId: Number.isFinite(Number(user?.id)) ? Number(user?.id) : null,
          turno,
        });
        navigate('/provas');
        return;
      } catch {
        window.alert('Nao foi possivel salvar a prova no servidor.');
        return;
      }
    }

    saveToStorage(provasStorageKey, [provaLocal, ...stored]);
    navigate('/provas');
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/provas">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Criar Prova</h1>
            <p className="text-muted-foreground">Cadastre a prova e defina as questões.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-6 space-y-6">
            <h2 className="text-sm font-semibold text-foreground">Cabeçalho da Prova</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Instituição</Label>
                <Input value={instituicao} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Professor</Label>
                <Input value={user?.nome ?? 'Professor'} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Disciplina</Label>
                <Select
                  value={disciplinaId}
                  onValueChange={(value) => {
                    setDisciplinaId(value);
                    setTurmaId('');
                    setTurno('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a disciplina" />
                  </SelectTrigger>
                  <SelectContent>
                    {disciplinasFiltradas.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Turma / Série</Label>
                <Select
                  value={turmaId}
                  onValueChange={(value) => {
                    setTurmaId(value);
                    setTurno(turnoPorTurma[value] ?? '');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {turmasFiltradas.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Turno</Label>
                <Select value={turno} onValueChange={setTurno}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o turno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Manha">Manhã</SelectItem>
                    <SelectItem value="Tarde">Tarde</SelectItem>
                    <SelectItem value="Noite">Noite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bimestre</Label>
                <Select value={periodo} onValueChange={setPeriodo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o bimestre" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodosDisponiveis.map((item) => (
                      <SelectItem key={item.id} value={item.nome}>
                        {item.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data da Prova</Label>
                <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Horário de Duração</Label>
                <Input type="time" value={duracao} onChange={(e) => setDuracao(e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Título da Prova</Label>
                <Input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Prova de Matemática - Unidade 1"
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Instruções Gerais</Label>
                <Textarea
                  value={instrucoes}
                  onChange={(e) => setInstrucoes(e.target.value)}
                  placeholder="Descreva as instruções para os alunos..."
                  rows={4}
                />
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Questões</h2>
              <Button type="button" variant="outline" className="gap-2" onClick={handleAddQuestao}>
                <Plus className="h-4 w-4" />
                Adicionar questão
              </Button>
            </div>

            {questoes.map((questao, index) => (
              <div key={questao.id} className="rounded-xl border border-border/60 bg-muted/10 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    Questão {index + 1}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveQuestao(questao.id)}
                    disabled={questoes.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Enunciado</Label>
                  <Textarea
                    value={questao.enunciado}
                    onChange={(e) =>
                      setQuestoes((prev) =>
                        prev.map((q) => (q.id === questao.id ? { ...q, enunciado: e.target.value } : q)),
                      )
                    }
                    placeholder="Digite o enunciado da questão..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={questao.tipo} onValueChange={(v) => handleTipoChange(questao.id, v as TipoQuestao)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multipla">Múltipla Escolha</SelectItem>
                        <SelectItem value="dissertativa">Dissertativa</SelectItem>
                        <SelectItem value="verdadeiro-falso">Verdadeiro/Falso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Pontuação</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={questao.pontuacao}
                      onChange={(e) => {
                        const num = Number(e.target.value);
                        setQuestoes((prev) =>
                          prev.map((q) => (q.id === questao.id ? { ...q, pontuacao: Number.isNaN(num) ? 0 : num } : q)),
                        );
                      }}
                    />
                  </div>
                </div>

                {questao.tipo !== 'dissertativa' && (
                  <div className="space-y-3">
                    <Label>Alternativas (clique na correta)</Label>
                    {questao.alternativas.map((alternativa, altIndex) => (
                      <div key={`${questao.id}-alt-${altIndex}`} className="flex items-center gap-3">
                        <input
                          type="radio"
                          name={`correta-${questao.id}`}
                          checked={questao.corretaIndex === altIndex}
                          onChange={() =>
                            setQuestoes((prev) =>
                              prev.map((q) => (q.id === questao.id ? { ...q, corretaIndex: altIndex } : q)),
                            )
                          }
                        />
                        <div className="h-8 w-8 rounded-full border border-border/60 flex items-center justify-center text-xs font-semibold">
                          {String.fromCharCode(65 + altIndex)}
                        </div>
                        <Input
                          value={alternativa}
                          onChange={(e) =>
                            setQuestoes((prev) =>
                              prev.map((q) => {
                                if (q.id !== questao.id) return q;
                                const alternativas = [...q.alternativas];
                                alternativas[altIndex] = e.target.value;
                                return { ...q, alternativas };
                              }),
                            )
                          }
                          placeholder={`Alternativa ${String.fromCharCode(65 + altIndex)}`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </Card>

          <div className="flex flex-col gap-3 md:flex-row md:justify-end">
            <Button type="button" variant="outline">
              Salvar rascunho
            </Button>
            <Button type="submit" variant="gradient" className="gap-2">
              <Save className="w-4 h-4" />
              Publicar prova
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default NovaProva;
