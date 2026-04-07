import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Play, Send } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { loadFromStorage, saveToStorage } from '@/lib/mockStorage';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  getMinhaRespostaRelacional,
  getProvaRelacional,
  isProvasRelacionalEnabled,
  mapRelApiToStorageShape,
  submitRespostaRelacional,
} from '@/lib/provasRelApi';

type QuestionType = 'multipla' | 'aberta';

interface ProvaQuestion {
  id: string;
  enunciado: string;
  tipo?: QuestionType;
  pontos?: number;
  opcoes?: string[];
  corretaIndex?: number | null;
}

interface Prova {
  id: string;
  titulo: string;
  turma: string;
  disciplina: string;
  periodo: string;
  data: string;
  horario: string;
  sala: string;
  instrucoes: string;
  publicada?: boolean;
  questoes?: ProvaQuestion[];
}

interface ProvaRespostaItem {
  questaoId: string;
  tipo: QuestionType;
  alternativaIndex?: number | null;
  respostaTexto?: string;
}

interface ProvaResposta {
  id: string;
  provaId: string;
  provaTitulo: string;
  alunoId: string;
  alunoNome: string;
  turma: string;
  disciplina: string;
  status: 'Enviado' | 'Corrigido';
  respostas: ProvaRespostaItem[];
  enviadoEm: string;
  finalizadaPorTempo?: boolean;
}

const provasStorageKey = 'school-compass:provas';
const respostasStorageKey = 'school-compass:provas-respostas';
const sessoesStorageKey = 'school-compass:provas-sessoes';

/** Marca que o aluno já iniciou esta prova nesta aba (não pode sair até enviar). */
const sessaoAlunoProvaKey = (alunoId: string, provaId: string) =>
  `school-compass:prova-aluno-em-andamento:${alunoId}:${provaId}`;

interface ProvaSessao {
  id: string; // `${provaId}-${alunoId}`
  provaId: string;
  alunoId: string;
  iniciouEm: string; // ISO
  expiraEm: string; // ISO
}

const parseDurationToSeconds = (value?: string) => {
  if (!value) return null;
  const [hours, minutes] = value.split(':').map((item) => Number(item));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  const seconds = Math.max(0, hours * 3600 + minutes * 60);
  return seconds > 0 ? seconds : null;
};

const formatTimeLeft = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function ProvaRealizar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [respostasMultipla, setRespostasMultipla] = useState<Record<string, number | null>>({});
  const [respostasAbertas, setRespostasAbertas] = useState<Record<string, string>>({});
  const [tempoRestante, setTempoRestante] = useState<number | null>(null);
  const [timeExpired, setTimeExpired] = useState(false);
  const timerRef = useRef<number | null>(null);

  const [prova, setProva] = useState<Prova | null>(() => {
    if (!id) return null;
    if (isProvasRelacionalEnabled()) return null;
    const provas = loadFromStorage<Prova[]>(provasStorageKey, []);
    return provas.find((item) => item.id === id) ?? null;
  });

  const [respostaExistente, setRespostaExistente] = useState<ProvaResposta | null>(() => {
    if (!user?.id || !id) return null;
    if (isProvasRelacionalEnabled()) return null;
    const respostas = loadFromStorage<ProvaResposta[]>(respostasStorageKey, []);
    return respostas.find((item) => item.provaId === id && item.alunoId === user.id) ?? null;
  });

  const [provaIniciada, setProvaIniciada] = useState(false);

  useEffect(() => {
    if (!id) {
      setProva(null);
      return;
    }
    if (isProvasRelacionalEnabled()) {
      void getProvaRelacional(id).then((p) => {
        if (p) {
          setProva({ ...mapRelApiToStorageShape(p), sala: '' } as Prova);
          return;
        }
        setProva(null);
      });
      return;
    }
    const provas = loadFromStorage<Prova[]>(provasStorageKey, []);
    setProva(provas.find((item) => item.id === id) ?? null);
  }, [id]);

  useLayoutEffect(() => {
    if (!user?.id || !id || !prova) return;
    if (respostaExistente) {
      sessionStorage.removeItem(sessaoAlunoProvaKey(user.id, id));
      setProvaIniciada(false);
      return;
    }
    const key = sessaoAlunoProvaKey(user.id, id);
    if (sessionStorage.getItem(key) === '1') {
      setProvaIniciada(true);
      return;
    }
    const st = location.state as { iniciarProva?: boolean } | null;
    if (st?.iniciarProva) {
      sessionStorage.setItem(key, '1');
      setProvaIniciada(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [user?.id, id, prova, respostaExistente, location.pathname, location.state, navigate]);

  const handleIniciarProvaLocal = useCallback(() => {
    if (!user?.id || !id) return;
    sessionStorage.setItem(sessaoAlunoProvaKey(user.id, id), '1');
    setProvaIniciada(true);
  }, [user?.id, id]);

  useEffect(() => {
    if (!user?.id || !id) {
      setRespostaExistente(null);
      return;
    }
    if (isProvasRelacionalEnabled()) {
      void getMinhaRespostaRelacional(id, user.id).then((resp) => {
        if (!resp) {
          // Em modo relacional, ausência no backend deve prevalecer para evitar dado fantasma local.
          setRespostaExistente(null);
          return;
        }
        setRespostaExistente({
          id: String(resp.id ?? `${id}-${user.id}`),
          provaId: String(resp.provaId),
          provaTitulo: resp.provaTitulo ?? prova?.titulo ?? '',
          alunoId: String(resp.alunoId),
          alunoNome: resp.alunoNome ?? user.nome,
          turma: resp.turma ?? prova?.turma ?? '',
          disciplina: resp.disciplina ?? prova?.disciplina ?? '',
          status: (resp.status as 'Enviado' | 'Corrigido') ?? 'Enviado',
          respostas: (resp.respostas ?? []).map((r) => ({
            questaoId: String(r.questaoId ?? ''),
            tipo: r.tipo === 'aberta' ? 'aberta' : 'multipla',
            alternativaIndex: r.alternativaIndex ?? null,
            respostaTexto: r.respostaTexto ?? '',
          })),
          enviadoEm: resp.enviadoEm ?? new Date().toISOString(),
          finalizadaPorTempo: resp.finalizadaPorTempo,
        });
      });
      return;
    }
    const respostas = loadFromStorage<ProvaResposta[]>(respostasStorageKey, []);
    setRespostaExistente(
      respostas.find((item) => item.provaId === id && item.alunoId === user.id) ?? null,
    );
  }, [id, user?.id, prova?.disciplina, prova?.titulo, prova?.turma, user?.nome]);

  const modoConsulta = Boolean(respostaExistente);

  React.useEffect(() => {
    if (!respostaExistente) return;
    const mapMultipla: Record<string, number | null> = {};
    const mapAbertas: Record<string, string> = {};
    (respostaExistente.respostas ?? []).forEach((item) => {
      if (item.tipo === 'aberta') {
        mapAbertas[item.questaoId] = item.respostaTexto ?? '';
      } else {
        mapMultipla[item.questaoId] = typeof item.alternativaIndex === 'number' ? item.alternativaIndex : null;
      }
    });
    setRespostasMultipla(mapMultipla);
    setRespostasAbertas(mapAbertas);
  }, [respostaExistente]);

  const submitProva = useCallback(async (force = false) => {
    if (!prova || !user) return;

    const questoes = prova.questoes ?? [];
    if (!force) {
      const faltaResposta = questoes.some((questao) => {
        const tipo = questao.tipo ?? 'multipla';
        if (tipo === 'aberta') return !respostasAbertas[questao.id]?.trim();
        return respostasMultipla[questao.id] === undefined || respostasMultipla[questao.id] === null;
      });

      if (faltaResposta) {
        window.alert('Responda todas as questões antes de enviar.');
        return;
      }
    }

    const respostasFinal: ProvaRespostaItem[] = questoes.map((questao) => {
      const tipo = questao.tipo ?? 'multipla';
      if (tipo === 'aberta') {
        return {
          questaoId: questao.id,
          tipo: 'aberta',
          respostaTexto: respostasAbertas[questao.id] ?? '',
        };
      }
      return {
        questaoId: questao.id,
        tipo: 'multipla',
        alternativaIndex: respostasMultipla[questao.id] ?? null,
      };
    });

    let salvoNoRelacional = false;
    if (isProvasRelacionalEnabled()) {
      try {
        const resp = await submitRespostaRelacional(
          prova.id,
          user.id,
          respostasFinal.map((r) => ({
            questaoId: Number(r.questaoId),
            tipo: r.tipo,
            alternativaIndex: r.alternativaIndex ?? null,
            respostaTexto: r.respostaTexto ?? '',
          })),
          force,
        );
        const novoRegistro: ProvaResposta = {
          id: String(resp.id ?? `${prova.id}-${user.id}`),
          provaId: String(resp.provaId),
          provaTitulo: resp.provaTitulo ?? prova.titulo,
          alunoId: String(resp.alunoId),
          alunoNome: resp.alunoNome ?? user.nome,
          turma: resp.turma ?? prova.turma,
          disciplina: resp.disciplina ?? prova.disciplina,
          status: (resp.status as 'Enviado' | 'Corrigido') ?? 'Enviado',
          respostas: respostasFinal,
          enviadoEm: resp.enviadoEm ?? new Date().toISOString(),
          finalizadaPorTempo: resp.finalizadaPorTempo,
        };
        sessionStorage.removeItem(sessaoAlunoProvaKey(user.id, prova.id));
        setProvaIniciada(false);
        setRespostaExistente(novoRegistro);
        salvoNoRelacional = true;
      } catch {
        window.alert('Não foi possível enviar a prova. Verifique a API e tente novamente.');
        return;
      }
    }
    if (!salvoNoRelacional) {
      const novoRegistro: ProvaResposta = {
        id: `${prova.id}-${user.id}`,
        provaId: prova.id,
        provaTitulo: prova.titulo,
        alunoId: user.id,
        alunoNome: user.nome,
        turma: prova.turma,
        disciplina: prova.disciplina,
        status: 'Enviado',
        respostas: respostasFinal,
        enviadoEm: new Date().toISOString(),
        finalizadaPorTempo: force ? true : undefined,
      };

      const stored = loadFromStorage<ProvaResposta[]>(respostasStorageKey, []);
      const updated = [
        novoRegistro,
        ...stored.filter((item) => !(item.provaId === prova.id && item.alunoId === user.id)),
      ];
      saveToStorage(respostasStorageKey, updated);
      sessionStorage.removeItem(sessaoAlunoProvaKey(user.id, prova.id));
      setProvaIniciada(false);
      setRespostaExistente(novoRegistro);
    }
    toast(
      force
        ? {
            title: 'Tempo esgotado',
            description: 'A prova foi enviada automaticamente com as respostas preenchidas.',
          }
        : {
            title: 'Prova enviada com sucesso',
            description: 'Suas respostas foram registradas e não podem ser alteradas.',
          },
    );
  }, [prova, respostasAbertas, respostasMultipla, toast, user]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void submitProva(false);
  };

  useEffect(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setTimeExpired(false);
    if (!prova || modoConsulta || !user?.id || !provaIniciada) {
      setTempoRestante(null);
      return;
    }

    const durationSeconds = parseDurationToSeconds(prova.horario);
    if (!durationSeconds) {
      setTempoRestante(null);
      return;
    }

    const sessoes = isProvasRelacionalEnabled()
      ? []
      : loadFromStorage<ProvaSessao[]>(sessoesStorageKey, []);
    const sessaoId = `${prova.id}-${user.id}`;
    const existente = sessoes.find((item) => item.id === sessaoId) ?? null;
    const agora = Date.now();

    let expiraEm = existente ? Date.parse(existente.expiraEm) : NaN;
    if (!existente || !Number.isFinite(expiraEm)) {
      expiraEm = agora + durationSeconds * 1000;
      const novaSessao: ProvaSessao = {
        id: sessaoId,
        provaId: prova.id,
        alunoId: user.id,
        iniciouEm: new Date(agora).toISOString(),
        expiraEm: new Date(expiraEm).toISOString(),
      };
      const updated = [novaSessao, ...sessoes.filter((item) => item.id !== sessaoId)];
      if (!isProvasRelacionalEnabled()) {
        saveToStorage(sessoesStorageKey, updated);
      }
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((expiraEm - Date.now()) / 1000));
      setTempoRestante(remaining);
      if (remaining <= 0) {
        setTimeExpired(true);
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        void submitProva(true);
      }
    };

    tick();
    timerRef.current = window.setInterval(tick, 1000);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [modoConsulta, prova, provaIniciada, submitProva, user?.id]);

  const provaTravada = provaIniciada && !modoConsulta;

  useEffect(() => {
    if (!provaTravada) return;

    const rearmHistory = () => {
      window.history.pushState({ provaLock: true }, '', window.location.href);
    };
    rearmHistory();

    const onPopState = () => {
      rearmHistory();
      window.alert(
        'Você precisa enviar a prova para sair. Use o botão "Enviar prova" ao terminar.',
      );
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [provaTravada]);

  useEffect(() => {
    if (!provaTravada) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [provaTravada]);

  if (!prova) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <h1 className="font-display text-3xl font-bold text-foreground">Prova não encontrada</h1>
          <Link to="/provas-aluno">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  if (!modoConsulta && !provaIniciada) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Link to="/provas-aluno">
              <Button variant="ghost" size="icon" type="button">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">Antes de começar</h1>
              <p className="text-muted-foreground">
                {prova.titulo} • {prova.disciplina} • {prova.turma}
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leia com atenção</CardTitle>
              <CardDescription>
                Ao iniciar, o menu lateral será ocultado e você só poderá sair após enviar a prova.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                O botão voltar do navegador não encerra a prova. Para concluir, use{' '}
                <strong className="text-foreground">Enviar prova</strong> no final do questionário.
              </p>
              {prova.instrucoes?.trim() ? (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm whitespace-pre-wrap">
                  {prova.instrucoes}
                </div>
              ) : null}
              <Button
                type="button"
                variant="gradient"
                className="gap-2 w-full sm:w-auto"
                onClick={handleIniciarProvaLocal}
              >
                <Play className="h-4 w-4" />
                Iniciar prova
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const respostasBloqueadas = modoConsulta || timeExpired;

  return (
    <DashboardLayout focusMode={provaTravada}>
      <div className="max-w-3xl mx-auto space-y-6">
        {provaTravada && (
          <div
            role="status"
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
          >
            <strong>Prova em andamento.</strong> Envie a prova para voltar ao painel. O menu está
            desativado até o envio.
          </div>
        )}

        <div className="flex items-center gap-3">
          {!provaTravada ? (
            <Link to="/provas-aluno">
              <Button variant="ghost" size="icon" type="button">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
          ) : (
            <div className="w-10 shrink-0" aria-hidden />
          )}
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              {modoConsulta ? 'Prova enviada' : 'Realizar prova'}
            </h1>
            <p className="text-muted-foreground">
              {prova.titulo} • {prova.disciplina} • {prova.turma}
            </p>
          </div>
        </div>

        {!modoConsulta && tempoRestante !== null && (
          <div className="text-sm text-muted-foreground">
            Tempo restante:{' '}
            <span className="font-semibold text-foreground">{formatTimeLeft(tempoRestante)}</span>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sua resposta</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {(prova.questoes ?? []).map((questao, index) => {
                const tipo = questao.tipo ?? 'multipla';
                return (
                  <div key={questao.id} className="rounded-xl border border-border/60 bg-muted/10 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-foreground">
                        Questão {index + 1} {questao.pontos ? `(${questao.pontos} pts)` : ''}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {tipo === 'aberta' ? 'Aberta' : 'Múltipla Escolha'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{questao.enunciado}</div>

                    {tipo === 'aberta' ? (
                      <Textarea
                        value={respostasAbertas[questao.id] ?? ''}
                        onChange={(event) =>
                          setRespostasAbertas((prev) => ({ ...prev, [questao.id]: event.target.value }))
                        }
                        rows={4}
                        placeholder="Digite sua resposta"
                        disabled={respostasBloqueadas}
                      />
                    ) : (
                      <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground">
                        {(questao.opcoes ?? []).map((opcao, optionIndex) => (
                          <label
                            key={`${questao.id}-opcao-${optionIndex}`}
                            className={cn(
                              'flex items-center gap-3 rounded-lg border border-border/60 bg-card/60 px-3 py-2',
                              modoConsulta && respostasMultipla[questao.id] === optionIndex && 'border-primary/50 bg-primary/5',
                            )}
                          >
                            <input
                              type="radio"
                              name={`resposta-${questao.id}`}
                              checked={respostasMultipla[questao.id] === optionIndex}
                              onChange={() =>
                                setRespostasMultipla((prev) => ({ ...prev, [questao.id]: optionIndex }))
                              }
                              disabled={respostasBloqueadas}
                            />
                            <span className="text-xs font-semibold text-foreground/80">
                              {String.fromCharCode(65 + optionIndex)})
                            </span>
                            <span>{opcao}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex justify-end gap-2">
                {!provaTravada ? (
                  <Link to="/provas-aluno">
                    <Button type="button" variant="outline">
                      Voltar
                    </Button>
                  </Link>
                ) : null}
                {!respostasBloqueadas && (
                  <Button type="submit" variant="gradient" className="gap-2">
                    <Send className="w-4 h-4" />
                    Enviar prova
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

