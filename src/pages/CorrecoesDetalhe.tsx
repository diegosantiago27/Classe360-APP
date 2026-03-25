import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { CorrecoesListFiltersState } from '@/pages/Correcoes';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { defaultUsers, StoredUser, usersStorageKey } from '@/lib/mockUsers';
import { loadFromStorage, saveToStorage } from '@/lib/mockStorage';
import { useAuth } from '@/contexts/AuthContext';
import {
  getMinhaRespostaRelacional,
  getProvaRelacional,
  isProvasRelacionalEnabled,
  mapRelApiToStorageShape,
  patchCorrecaoRespostaRelacional,
  type ProvaRespostaApi,
} from '@/lib/provasRelApi';

const atividadesStorageKey = 'school-compass:atividades';
const entregasStorageKey = 'school-compass:atividades-entregas';
const provasStorageKey = 'school-compass:provas';
const provasRespostasStorageKey = 'school-compass:provas-respostas';

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

interface ProvaQuestao {
  id: string;
  enunciado: string;
  tipo: 'multipla' | 'aberta';
  opcoes: string[];
  corretaIndex?: number | null;
}

interface ProvaCor {
  id: string;
  titulo: string;
  turma: string;
  disciplina: string;
  periodo?: string;
  turno?: string;
  questoes?: ProvaQuestao[];
}

interface ProvaRespostaCor {
  id: string;
  provaId: string;
  alunoId: string;
  alunoNome?: string;
  status: string;
  notaFinal?: number | null;
  corrigidoEm?: string;
  enviadoEm?: string;
  feedbackProfessor?: string;
  respostas?: Array<{
    questaoId: string;
    tipo: 'multipla' | 'aberta';
    alternativaIndex?: number | null;
    respostaTexto?: string;
  }>;
}

const mapRespostaApiToDet = (resp: ProvaRespostaApi, alunoNomeFallback: string): ProvaRespostaCor => {
  const enviado =
    typeof resp.enviadoEm === 'string'
      ? resp.enviadoEm
      : Array.isArray(resp.enviadoEm)
        ? new Date(
            (resp.enviadoEm as number[])[0],
            ((resp.enviadoEm as number[])[1] ?? 1) - 1,
            (resp.enviadoEm as number[])[2] ?? 1,
          ).toISOString()
        : undefined;
  const corrigido =
    typeof resp.corrigidoEm === 'string'
      ? resp.corrigidoEm
      : Array.isArray(resp.corrigidoEm)
        ? new Date(
            (resp.corrigidoEm as number[])[0],
            ((resp.corrigidoEm as number[])[1] ?? 1) - 1,
            (resp.corrigidoEm as number[])[2] ?? 1,
          ).toISOString()
        : undefined;
  return {
    id: String(resp.id ?? `${resp.provaId}-${resp.alunoId}`),
    provaId: String(resp.provaId),
    alunoId: String(resp.alunoId),
    alunoNome: resp.alunoNome ?? alunoNomeFallback,
    status: resp.status ?? 'Enviado',
    notaFinal: resp.notaFinal ?? null,
    corrigidoEm: corrigido,
    enviadoEm: enviado,
    respostas: (resp.respostas ?? []).map((r) => ({
      questaoId: String(r.questaoId ?? ''),
      tipo: r.tipo === 'aberta' ? 'aberta' : 'multipla',
      alternativaIndex: r.alternativaIndex ?? null,
      respostaTexto: r.respostaTexto ?? '',
    })),
  };
};

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const state = location.state as
    | {
        alunosIds?: string[];
        tipo?: 'provas' | 'atividades' | '';
        turma?: string;
        materia?: string;
        turno?: string;
        provaId?: string;
        alunoId?: string;
        listFilters?: CorrecoesListFiltersState;
      }
    | undefined;

  const listFiltersRetorno = useMemo((): CorrecoesListFiltersState => {
    if (state?.listFilters) return state.listFilters;
    return {
      tipoCorrecao: state?.tipo === 'provas' ? 'provas' : 'atividades',
      statusFiltro: 'todos',
      turmaFiltro: state?.turma?.trim() ? state.turma : 'todas',
      materiaFiltro: state?.materia?.trim() ? state.materia : 'todas',
      busca: '',
    };
  }, [state]);

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

  const [provaAlvo, setProvaAlvo] = useState<ProvaCor | null>(null);
  const [respostaAlvo, setRespostaAlvo] = useState<ProvaRespostaCor | null>(null);
  const [carregandoProva, setCarregandoProva] = useState(false);
  const [draftProva, setDraftProva] = useState({ nota: '', feedback: '' });

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

  const isProvasFluxo = state?.tipo === 'provas';
  const provaIdNav = state?.provaId;
  const alunoIdNav = state?.alunoId;

  const subtituloCorrecao = useMemo(() => {
    if (state?.tipo === 'provas') {
      if (provaAlvo) {
        const partes = [
          provaAlvo.disciplina || state?.materia,
          provaAlvo.turma || state?.turma,
          provaAlvo.periodo?.trim() || null,
        ].filter((p): p is string => Boolean(p && String(p).trim()));
        return partes.join(' • ');
      }
      return [state?.materia, state?.turma].filter(Boolean).join(' • ');
    }
    return [state?.materia, state?.turma].filter(Boolean).join(' • ');
  }, [state?.tipo, state?.materia, state?.turma, provaAlvo]);

  useEffect(() => {
    if (!isProvasFluxo || !provaIdNav || !alunoIdNav) {
      setProvaAlvo(null);
      setRespostaAlvo(null);
      setDraftProva({ nota: '', feedback: '' });
      return;
    }

    let cancel = false;
    (async () => {
      setCarregandoProva(true);
      try {
        let prova: ProvaCor | null = null;
        if (isProvasRelacionalEnabled()) {
          const api = await getProvaRelacional(provaIdNav);
          if (api) {
            const mapped = mapRelApiToStorageShape(api);
            prova = {
              id: mapped.id,
              titulo: mapped.titulo,
              turma: mapped.turma,
              disciplina: mapped.disciplina,
              periodo: mapped.periodo,
              turno: mapped.turno,
              questoes: (mapped.questoes ?? []).map((q) => ({
                id: q.id,
                enunciado: q.enunciado,
                tipo: q.tipo === 'aberta' ? 'aberta' : 'multipla',
                opcoes: q.opcoes ?? [],
                corretaIndex: q.corretaIndex ?? null,
              })),
            };
          }
        }
        if (!prova) {
          const provas = loadFromStorage<ProvaCor[]>(provasStorageKey, []);
          prova = provas.find((p) => p.id === provaIdNav) ?? null;
        }
        if (cancel) return;
        setProvaAlvo(prova);

        const alunoNomeFb =
          usuarios.find((u) => u.id === alunoIdNav)?.nome ?? `Aluno ${alunoIdNav}`;

        let resp: ProvaRespostaCor | null = null;
        if (isProvasRelacionalEnabled()) {
          const apiResp = await getMinhaRespostaRelacional(provaIdNav, alunoIdNav);
          if (apiResp) resp = mapRespostaApiToDet(apiResp, alunoNomeFb);
        }
        if (!resp) {
          const respostas = loadFromStorage<ProvaRespostaCor[]>(provasRespostasStorageKey, []);
          resp = respostas.find((r) => r.provaId === provaIdNav && r.alunoId === alunoIdNav) ?? null;
        }
        if (cancel) return;
        setRespostaAlvo(resp);
        if (resp) {
          setDraftProva({
            nota: typeof resp.notaFinal === 'number' ? String(resp.notaFinal) : '',
            feedback: resp.feedbackProfessor ?? '',
          });
        } else {
          setDraftProva({ nota: '', feedback: '' });
        }
      } finally {
        if (!cancel) setCarregandoProva(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [isProvasFluxo, provaIdNav, alunoIdNav, usuarios]);

  const handleLiberarCorrecaoProva = async () => {
    if (!provaAlvo || !respostaAlvo || !user?.id) return;
    const notaNumber = Number(draftProva.nota);
    if (Number.isNaN(notaNumber) || notaNumber < 0 || notaNumber > 10) {
      window.alert('Informe uma nota válida entre 0 e 10.');
      return;
    }

    if (isProvasRelacionalEnabled()) {
      try {
        const updated = await patchCorrecaoRespostaRelacional(
          provaAlvo.id,
          respostaAlvo.alunoId,
          user.id,
          notaNumber,
        );
        const alunoNomeFb =
          respostaAlvo.alunoNome ??
          usuarios.find((u) => u.id === respostaAlvo.alunoId)?.nome ??
          `Aluno ${respostaAlvo.alunoId}`;
        const mapped = mapRespostaApiToDet(updated, alunoNomeFb);
        setRespostaAlvo({
          ...mapped,
          feedbackProfessor: draftProva.feedback.trim() || mapped.feedbackProfessor,
        });
        window.alert('Correção registrada.');
        navigate('/correcoes', { state: { listFilters: listFiltersRetorno } });
        return;
      } catch {
        /* tenta local abaixo */
      }
    }

    const stored = loadFromStorage<ProvaRespostaCor[]>(provasRespostasStorageKey, []);
    const idx = stored.findIndex((r) => r.provaId === provaAlvo.id && r.alunoId === respostaAlvo.alunoId);
    if (idx < 0) {
      window.alert(
        'Não foi possível salvar: resposta só existe no servidor. Verifique a API ou tente novamente.',
      );
      return;
    }
    const next = stored.map((r, i) =>
      i === idx
        ? {
            ...r,
            notaFinal: notaNumber,
            status: 'Corrigido',
            corrigidoEm: new Date().toISOString(),
            feedbackProfessor: draftProva.feedback.trim(),
          }
        : r,
    );
    saveToStorage(provasRespostasStorageKey, next);
    setRespostaAlvo(next[idx]!);
    window.alert('Correção salva localmente.');
    navigate('/correcoes', { state: { listFilters: listFiltersRetorno } });
  };

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
        <div className="flex flex-row items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl font-bold text-foreground">Correção</h1>
            <p className="text-muted-foreground">{subtituloCorrecao || '—'}</p>
          </div>
          <Link to="/correcoes" state={{ listFilters: listFiltersRetorno }} className="shrink-0">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </div>

        {isProvasFluxo ? (
          !provaIdNav || !alunoIdNav ? (
            <Card className="p-6 text-sm text-muted-foreground">
              Abra esta correção a partir da lista em Correções (botão Corrigir ou Ver em uma prova).
            </Card>
          ) : carregandoProva ? (
            <Card className="p-6 text-sm text-muted-foreground">Carregando prova e respostas...</Card>
          ) : !provaAlvo || !respostaAlvo ? (
            <Card className="p-6 text-sm text-muted-foreground">
              Não foi possível carregar a prova ou a resposta do aluno. Confira se o envio existe e se você tem
              permissão.
            </Card>
          ) : (
            <Card className="p-5 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold text-foreground">{provaAlvo.titulo}</h2>
                <Badge variant="outline">{respostaAlvo.alunoNome ?? `Aluno ${respostaAlvo.alunoId}`}</Badge>
                <Badge variant="secondary">{provaAlvo.turma}</Badge>
                {provaAlvo.periodo?.trim() ? (
                  <Badge variant="outline" className="font-normal">
                    {provaAlvo.periodo.trim()}
                  </Badge>
                ) : null}
                {(respostaAlvo.status === 'Corrigido' || Boolean(respostaAlvo.corrigidoEm)) && (
                  <Badge className="bg-success/15 text-success hover:bg-success/20">
                    Corrigida
                    {typeof respostaAlvo.notaFinal === 'number' ? ` • Nota ${respostaAlvo.notaFinal.toFixed(1)}` : ''}
                  </Badge>
                )}
              </div>

              {(provaAlvo.questoes ?? []).length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Esta prova não possui questões cadastradas.
                </div>
              ) : (
                <div className="space-y-4">
                  {provaAlvo.questoes?.map((questao, index) => {
                    const respostaAluno = respostaAlvo.respostas?.find(
                      (item) => String(item.questaoId) === String(questao.id),
                    );
                    const correta = questao.corretaIndex;
                    const acertou =
                      questao.tipo === 'multipla' &&
                      correta !== null &&
                      correta !== undefined &&
                      respostaAluno?.alternativaIndex === correta;

                    return (
                      <div key={questao.id} className="rounded-md border border-border/60 p-4 space-y-3">
                        <div className="text-sm font-semibold text-foreground">Questão {index + 1}</div>
                        <div className="text-sm text-muted-foreground">{questao.enunciado}</div>

                        {questao.tipo === 'multipla' ? (
                          <div className="space-y-2">
                            <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                              Resposta marcada:{' '}
                              <span className="font-semibold text-foreground">
                                {respostaAluno && typeof respostaAluno.alternativaIndex === 'number'
                                  ? String.fromCharCode(65 + respostaAluno.alternativaIndex)
                                  : '-'}
                              </span>
                            </div>
                            {(questao.opcoes ?? []).map((opcao, optionIndex) => {
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
                              {respostaAluno && typeof respostaAluno.alternativaIndex === 'number' ? (
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
                            Resposta discursiva do aluno:
                            <div className="mt-2 text-foreground">
                              {respostaAluno?.respostaTexto?.trim() || 'Sem resposta textual.'}
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
                    placeholder="Observações (armazenadas localmente quando não houver campo no servidor)..."
                    value={draftProva.feedback}
                    onChange={(event) => setDraftProva((d) => ({ ...d, feedback: event.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_auto] md:items-end">
                  <div className="space-y-2">
                    <Label>Nota final (0 a 10)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      step={0.1}
                      placeholder="0 - 10"
                      value={draftProva.nota}
                      onChange={(event) => setDraftProva((d) => ({ ...d, nota: event.target.value }))}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" variant="gradient" onClick={() => void handleLiberarCorrecaoProva()}>
                      Salvar
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )
        ) : state?.tipo !== 'atividades' ? (
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
                        Salvar
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
