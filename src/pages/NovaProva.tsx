import React, { useMemo, useState } from 'react';
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
import { createId, loadFromStorage, saveToStorage } from '@/lib/mockStorage';
import {
  CatalogItem,
  defaultDisciplinas,
  defaultPeriodos,
  disciplinasStorageKey,
  periodosStorageKey,
} from '@/lib/mockAcademics';
import { defaultInstituicao, instituicaoStorageKey } from '@/lib/mockInstituicao';

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

  const [disciplina, setDisciplina] = useState('');
  const [turma, setTurma] = useState('');
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

  const disciplinasDisponiveis = useMemo(
    () => loadFromStorage<CatalogItem[]>(disciplinasStorageKey, defaultDisciplinas),
    [],
  );
  const periodosDisponiveis = useMemo(
    () => loadFromStorage<CatalogItem[]>(periodosStorageKey, defaultPeriodos),
    [],
  );
  const instituicao = useMemo(() => {
    const dados = loadFromStorage(instituicaoStorageKey, defaultInstituicao);
    return dados.nome?.trim() || defaultInstituicao.nome;
  }, []);

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
    if (!disciplina || !turma || !periodo || !data || !titulo.trim()) {
      window.alert('Preencha disciplina, turma, bimestre, data e título.');
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

    const stored = loadFromStorage<Prova[]>(provasStorageKey, []);
    const prova: Prova = {
      id: createId('prova'),
      titulo,
      turma,
      disciplina,
      periodo,
      data,
      horario: duracao,
      sala: '',
      instrucoes,
      status: 'Agendada',
      publicada: false,
      questoes: questoesFormatadas,
      turno,
    };

    saveToStorage(provasStorageKey, [prova, ...stored]);
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
                <Select value={disciplina} onValueChange={setDisciplina}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a disciplina" />
                  </SelectTrigger>
                  <SelectContent>
                    {disciplinasDisponiveis.map((item) => (
                      <SelectItem key={item.id} value={item.nome}>
                        {item.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Turma / Série</Label>
                <Select value={turma} onValueChange={setTurma}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a turma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9º Ano A">9º Ano A</SelectItem>
                    <SelectItem value="9º Ano B">9º Ano B</SelectItem>
                    <SelectItem value="8º Ano A">8º Ano A</SelectItem>
                    <SelectItem value="7º Ano C">7º Ano C</SelectItem>
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
                    <SelectItem value="Manhã">Manhã</SelectItem>
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
