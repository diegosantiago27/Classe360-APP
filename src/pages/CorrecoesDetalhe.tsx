import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { defaultUsers, StoredUser, usersStorageKey } from '@/lib/mockUsers';
import { loadFromStorage, saveToStorage } from '@/lib/mockStorage';

const atividadesStorageKey = 'school-compass:atividades';
const entregasStorageKey = 'school-compass:atividades-entregas';

interface AtividadeQuestion {
  id: string;
  enunciado: string;
  tipo: 'multipla' | 'aberta';
  opcoes: string[];
  corretaIndex?: number | null;
}

interface Atividade {
  id: string;
  titulo: string;
  turma: string;
  disciplina: string;
  turno?: string;
  questoes?: AtividadeQuestion[];
}

interface AtividadeEntrega {
  id: string;
  atividadeId: string;
  alunoId: string;
  alunoNome: string;
  resposta: string;
  respostasObjetivas?: Array<{
    questaoId: string;
    alternativaIndex: number;
  }>;
  enviadoEm: string;
  nota?: number | null;
  feedbackProfessor?: string;
  corrigidoEm?: string;
}

const normalizeText = (value?: string) =>
  (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const getTurmaKey = (value: string) => {
  const normalized = normalizeText(value);
  const match = normalized.match(/(\d+)\s*(?:ano)?\s*([a-z])/i);
  if (match) return `${match[1]}${match[2]}`.toLowerCase();
  return normalized.replace(/[^a-z0-9]/g, '');
};

export default function CorrecoesDetalhe() {
  const location = useLocation();
  const state = location.state as
    | {
        alunosIds?: string[];
        tipo?: 'provas' | 'atividades' | '';
        turma?: string;
        materia?: string;
        turno?: string;
      }
    | undefined;

  const usuarios = useMemo(
    () => loadFromStorage<StoredUser[]>(usersStorageKey, defaultUsers),
    [],
  );
  const atividades = useMemo(
    () => loadFromStorage<Atividade[]>(atividadesStorageKey, []),
    [],
  );
  const [entregas, setEntregas] = useState<AtividadeEntrega[]>(
    () => loadFromStorage<AtividadeEntrega[]>(entregasStorageKey, []),
  );
  const [avaliacoesDraft, setAvaliacoesDraft] = useState<
    Record<string, { nota: string; feedback: string }>
  >({});

  const alunosIdsSelecionados = state?.alunosIds ?? [];
  const turmaFiltroKey = getTurmaKey(state?.turma ?? '');
  const materiaFiltro = normalizeText(state?.materia);
  const turnoFiltro = normalizeText(state?.turno);

  const correcoes = useMemo(() => {
    if (state?.tipo !== 'atividades') return [];

    const atividadesFiltradas = atividades.filter((atividade) => {
      if (turmaFiltroKey && getTurmaKey(atividade.turma) !== turmaFiltroKey) return false;
      if (materiaFiltro && normalizeText(atividade.disciplina) !== materiaFiltro) return false;
      if (turnoFiltro && atividade.turno && normalizeText(atividade.turno) !== turnoFiltro) return false;
      return true;
    });
    const atividadesPorId = new Map(atividadesFiltradas.map((atividade) => [atividade.id, atividade]));

    const entregasFiltradas = entregas.filter(
      (entrega) =>
        atividadesPorId.has(entrega.atividadeId) &&
        (alunosIdsSelecionados.length === 0 || alunosIdsSelecionados.includes(entrega.alunoId)),
    );

    return entregasFiltradas
      .map((entrega) => {
        const atividade = atividadesPorId.get(entrega.atividadeId);
        if (!atividade) return null;
        const aluno = usuarios.find((u) => u.id === entrega.alunoId);
        return {
          entrega,
          atividade,
          alunoNome: aluno?.nome ?? entrega.alunoNome ?? `Aluno ${entrega.alunoId}`,
        };
      })
      .filter((item): item is { entrega: AtividadeEntrega; atividade: Atividade; alunoNome: string } => Boolean(item))
      .sort((a, b) => b.entrega.enviadoEm.localeCompare(a.entrega.enviadoEm));
  }, [
    state?.tipo,
    atividades,
    entregas,
    usuarios,
    turmaFiltroKey,
    materiaFiltro,
    turnoFiltro,
    alunosIdsSelecionados,
  ]);

  useEffect(() => {
    setAvaliacoesDraft((prev) => {
      const next = { ...prev };
      correcoes.forEach(({ entrega }) => {
        if (!next[entrega.id]) {
          next[entrega.id] = {
            nota: typeof entrega.nota === 'number' ? String(entrega.nota) : '',
            feedback: entrega.feedbackProfessor ?? '',
          };
        }
      });
      return next;
    });
  }, [correcoes]);

  const handleChangeAvaliacao = (entregaId: string, campo: 'nota' | 'feedback', value: string) => {
    setAvaliacoesDraft((prev) => ({
      ...prev,
      [entregaId]: {
        nota: prev[entregaId]?.nota ?? '',
        feedback: prev[entregaId]?.feedback ?? '',
        [campo]: value,
      },
    }));
  };

  const handleLiberarCorrecao = (entregaId: string) => {
    const draft = avaliacoesDraft[entregaId];
    const notaNumber = Number(draft?.nota ?? '');
    if (Number.isNaN(notaNumber) || notaNumber < 0 || notaNumber > 10) {
      window.alert('Informe uma nota válida entre 0 e 10.');
      return;
    }
    const updated = entregas.map((item) =>
      item.id === entregaId
        ? {
            ...item,
            nota: notaNumber,
            feedbackProfessor: draft?.feedback?.trim() ?? '',
            corrigidoEm: new Date().toISOString(),
          }
        : item,
    );
    setEntregas(updated);
    saveToStorage(entregasStorageKey, updated);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/correcoes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Correção</h1>
            <p className="text-muted-foreground">
              {state?.materia} {state?.turma ? `• ${state.turma}` : ''}
            </p>
          </div>
        </div>

        {state?.tipo !== 'atividades' ? (
          <Card className="p-6 text-sm text-muted-foreground">
            No momento, esta tela detalhada está habilitada para correção de atividades.
          </Card>
        ) : correcoes.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">
            Nenhuma entrega encontrada para os filtros selecionados.
          </Card>
        ) : (
          <div className="space-y-4">
            {correcoes.map(({ entrega, atividade, alunoNome }) => (
              <Card key={entrega.id} className="p-5 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-semibold text-foreground">{atividade.titulo}</h2>
                  <Badge variant="outline">{alunoNome}</Badge>
                  <Badge variant="secondary">{atividade.turma}</Badge>
                  {typeof entrega.nota === 'number' && (
                    <Badge className="bg-success/15 text-success hover:bg-success/20">
                      Corrigida • Nota {entrega.nota.toFixed(1)}
                    </Badge>
                  )}
                </div>

                {(atividade.questoes ?? []).length === 0 ? (
                  <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                    Esta atividade não possui questões objetivas cadastradas.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {atividade.questoes?.map((questao, index) => {
                      const respostaAluno = entrega.respostasObjetivas?.find(
                        (item) => item.questaoId === questao.id,
                      );
                      const correta = questao.corretaIndex;
                      const acertou =
                        questao.tipo === 'multipla' &&
                        correta !== null &&
                        correta !== undefined &&
                        respostaAluno?.alternativaIndex === correta;

                      return (
                        <div key={questao.id} className="rounded-md border border-border/60 p-4 space-y-3">
                          <div className="text-sm font-semibold text-foreground">
                            Questão {index + 1}
                          </div>
                          <div className="text-sm text-muted-foreground">{questao.enunciado}</div>

                          {questao.tipo === 'multipla' ? (
                            <div className="space-y-2">
                              <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                                Resposta marcada:{' '}
                                <span className="font-semibold text-foreground">
                                  {respostaAluno
                                    ? String.fromCharCode(65 + respostaAluno.alternativaIndex)
                                    : '-'}
                                </span>
                              </div>
                              {questao.opcoes.map((opcao, optionIndex) => {
                                const letra = String.fromCharCode(65 + optionIndex);
                                const ehCorreta = correta === optionIndex;
                                const marcadaAluno = respostaAluno?.alternativaIndex === optionIndex;
                                const classeLinha = ehCorreta
                                  ? 'border-success/40 bg-success/10'
                                  : marcadaAluno
                                    ? 'border-destructive/40 bg-destructive/10'
                                    : 'border-border bg-background';
                                return (
                                  <div
                                    key={`${questao.id}-${optionIndex}`}
                                    className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${classeLinha}`}
                                  >
                                    <span className="text-foreground">
                                      {letra}) {opcao}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {ehCorreta && <span className="text-xs font-semibold text-success">Correta</span>}
                                      {marcadaAluno && (
                                        <span className="text-xs font-semibold text-destructive">Marcada</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              <div className="text-xs">
                                {respostaAluno ? (
                                  acertou ? (
                                    <span className="inline-flex items-center gap-1 text-success">
                                      <CheckCircle2 className="w-4 h-4" />
                                      Aluno acertou.
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-destructive">
                                      <XCircle className="w-4 h-4" />
                                      Aluno errou.
                                    </span>
                                  )
                                ) : (
                                  <span className="text-muted-foreground">Aluno não marcou alternativa.</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-md border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                              Resposta aberta do aluno:
                              <div className="mt-2 text-foreground">
                                {entrega.resposta?.trim() || 'Sem resposta textual.'}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-3 rounded-md border border-border/60 p-4">
                  <div className="space-y-2">
                    <Label>Feedback para o aluno</Label>
                    <Textarea
                      rows={4}
                      placeholder="Escreva um feedback detalhado..."
                      value={avaliacoesDraft[entrega.id]?.feedback ?? ''}
                      onChange={(event) =>
                        handleChangeAvaliacao(entrega.id, 'feedback', event.target.value)
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_auto] md:items-end">
                    <div className="space-y-2">
                      <Label>Nota</Label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        step={0.1}
                        placeholder="0 - 10"
                        value={avaliacoesDraft[entrega.id]?.nota ?? ''}
                        onChange={(event) =>
                          handleChangeAvaliacao(entrega.id, 'nota', event.target.value)
                        }
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="gradient"
                        onClick={() => handleLiberarCorrecao(entrega.id)}
                      >
                        Liberar correção
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
