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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { CatalogItem, defaultDisciplinas, disciplinasStorageKey } from '@/lib/mockAcademics';
import { Turma, defaultTurmas, turmasStorageKey } from '@/lib/mockTurmas';
import { createId, loadFromStorage, saveToStorage, syncKeysFromBackend } from '@/lib/mockStorage';
import { defaultInstituicao, instituicaoStorageKey } from '@/lib/mockInstituicao';

type TipoQuestao = 'multipla' | 'dissertativa' | 'verdadeiro-falso';

interface Atividade {
  id: string;
  professorId?: string;
  professorNome?: string;
  titulo: string;
  turma: string;
  disciplina: string;
  periodo: string;
  sala: string;
  data: string;
  horario: string;
  instrucoes: string;
  descricao: string;
  entrega?: string;
  turno?: string;
  valeNota?: boolean;
  pontuacaoTotal?: number;
  peso?: number;
  dataLiberacao?: string;
  dataLimite?: string;
  questoes?: Array<{
    id: string;
    enunciado: string;
    tipo: 'multipla' | 'aberta';
    pontos: number;
    opcoes: string[];
    corretaIndex: number | null;
  }>;
  status: 'Pendente' | 'Entregue';
}

interface QuestaoDraft {
  id: string;
  enunciado: string;
  tipo: TipoQuestao;
  pontuacao: number;
  alternativas: string[];
  corretaIndex: number | null;
}

const storageKey = 'school-compass:atividades';
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

const NovaAtividade: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [disciplinaId, setDisciplinaId] = useState('');
  const [turmaId, setTurmaId] = useState('');
  const [turno, setTurno] = useState('');
  const [data, setData] = useState('');
  const [titulo, setTitulo] = useState('');
  const [instrucoes, setInstrucoes] = useState('');

  const [valeNota, setValeNota] = useState(true);
  const [pontuacaoTotal, setPontuacaoTotal] = useState('10');
  const [peso, setPeso] = useState('2');
  const [dataLiberacao, setDataLiberacao] = useState('');
  const [dataLimite, setDataLimite] = useState('');

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
    () => loadFromStorage<CatalogItem[]>(disciplinasStorageKey, defaultDisciplinas),
  );
  const [turmasDisponiveis, setTurmasDisponiveis] = useState<Turma[]>(
    () => loadFromStorage<Turma[]>(turmasStorageKey, defaultTurmas),
  );
  const [vinculos, setVinculos] = useState<DisciplinaVinculo[]>(
    () => loadFromStorage<DisciplinaVinculo[]>(vinculosStorageKey, []),
  );
  const instituicao = useMemo(() => {
    const dados = loadFromStorage(instituicaoStorageKey, defaultInstituicao);
    return dados.nome?.trim() || defaultInstituicao.nome;
  }, []);

  useEffect(() => {
    const keys = [disciplinasStorageKey, turmasStorageKey, vinculosStorageKey];
    void syncKeysFromBackend(keys).finally(() => {
      setDisciplinasDisponiveis(loadFromStorage<CatalogItem[]>(disciplinasStorageKey, defaultDisciplinas));
      setTurmasDisponiveis(loadFromStorage<Turma[]>(turmasStorageKey, defaultTurmas));
      setVinculos(loadFromStorage<DisciplinaVinculo[]>(vinculosStorageKey, []));
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
    () => Object.fromEntries(turmasDisponiveis.map((t) => [t.id, t.turno] as const)),
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

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!disciplinaId || !turmaId || !data || !titulo.trim()) {
      window.alert('Preencha disciplina, turma, data e título.');
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

    const stored = loadFromStorage<Atividade[]>(storageKey, []);
    const atividade: Atividade = {
      id: createId('atividade'),
      professorId: user?.id ?? '',
      professorNome: user?.nome ?? '',
      titulo,
      turma: turmaNome,
      disciplina: disciplinaNome,
      periodo: 'Periodo',
      sala: '',
      data,
      horario: '',
      instrucoes,
      descricao: instrucoes,
      entrega: dataLimite || data,
      turno,
      valeNota,
      pontuacaoTotal: Number(pontuacaoTotal),
      peso: Number(peso),
      dataLiberacao,
      dataLimite,
      questoes: questoesFormatadas,
      status: 'Pendente',
    };

    saveToStorage(storageKey, [atividade, ...stored]);
    navigate('/atividades');
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/atividades">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Criar Atividade / Prova</h1>
            <p className="text-muted-foreground">Cadastre a atividade e defina as questões.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-6 space-y-6">
            <h2 className="text-sm font-semibold text-foreground">Cabeçalho da Atividade</h2>

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
                <Label>Data</Label>
                <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Título da Atividade / Prova</Label>
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

          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Configurações</h2>
            <div className="flex items-center gap-3">
              <Switch checked={valeNota} onCheckedChange={setValeNota} />
              <span className="text-sm text-foreground">Vale nota</span>
              <Badge variant="outline" className="text-xs">
                Vale nota
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Pontuação Total</Label>
                <Input type="number" value={pontuacaoTotal} onChange={(e) => setPontuacaoTotal(e.target.value)} disabled={!valeNota} />
              </div>
              <div className="space-y-2">
                <Label>Peso</Label>
                <Input type="number" value={peso} onChange={(e) => setPeso(e.target.value)} disabled={!valeNota} />
              </div>
              <div className="space-y-2">
                <Label>Data de Liberação</Label>
                <Input type="date" value={dataLiberacao} onChange={(e) => setDataLiberacao(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Data Limite</Label>
                <Input type="date" value={dataLimite} onChange={(e) => setDataLimite(e.target.value)} />
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-3 md:flex-row md:justify-end">
            <Button type="button" variant="outline">
              Salvar rascunho
            </Button>
            <Button type="submit" variant="gradient" className="gap-2">
              <Save className="w-4 h-4" />
              Publicar atividade
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default NovaAtividade;
