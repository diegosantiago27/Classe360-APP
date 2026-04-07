import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarClock, Send } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { loadFromStorage, saveToStorage } from '@/lib/mockStorage';
import { useAuth } from '@/contexts/AuthContext';
import {
  isApiEnabled,
  listAtividadesApi,
  listDisciplinasApi,
  listEntregasAtividadesApi,
  listTurmasApi,
  saveEntregaAtividadeApi,
} from '@/lib/entityCrudApi';

interface Atividade {
  id: string;
  titulo: string;
  turma?: string;
  disciplina: string;
  periodo?: string;
  sala?: string;
  data?: string;
  horario?: string;
  instrucoes?: string;
  descricao: string;
  entrega?: string;
  questoes?: Array<{
    id: string;
    enunciado: string;
    tipo: 'multipla' | 'aberta';
    pontos?: number;
    opcoes: string[];
  }>;
  status: 'Pendente' | 'Entregue';
}

interface AtividadeEntrega {
  id: string;
  atividadeId: string;
  alunoId: string;
  alunoNome: string;
  disciplina: string;
  resposta: string;
  respostasObjetivas?: Array<{
    questaoId: string;
    alternativaIndex: number;
  }>;
  linkAnexo?: string;
  enviadoEm: string;
  nota?: number | null;
}

const atividadesStorageKey = 'school-compass:atividades';
const entregasStorageKey = 'school-compass:atividades-entregas';

type AtividadeMeta = {
  descricao?: string;
  periodo?: string;
  sala?: string;
  horario?: string;
  instrucoes?: string;
  questoes?: Atividade['questoes'];
};

const parseAtividadeMeta = (value?: string): AtividadeMeta => {
  if (!value?.trim()) return {};
  try {
    const parsed = JSON.parse(value) as AtividadeMeta;
    if (parsed && typeof parsed === 'object') return parsed;
    return {};
  } catch {
    return { descricao: value };
  }
};

const parseEntregaResposta = (value?: string) => {
  if (!value?.trim()) return { resposta: '', linkAnexo: '', respostasObjetivas: [] as AtividadeEntrega['respostasObjetivas'] };
  try {
    const parsed = JSON.parse(value) as {
      resposta?: string;
      linkAnexo?: string;
      respostasObjetivas?: AtividadeEntrega['respostasObjetivas'];
    };
    if (parsed && typeof parsed === 'object') {
      return {
        resposta: parsed.resposta ?? '',
        linkAnexo: parsed.linkAnexo ?? '',
        respostasObjetivas: parsed.respostasObjetivas ?? [],
      };
    }
    return { resposta: value, linkAnexo: '', respostasObjetivas: [] as AtividadeEntrega['respostasObjetivas'] };
  } catch {
    return { resposta: value, linkAnexo: '', respostasObjetivas: [] as AtividadeEntrega['respostasObjetivas'] };
  }
};

const AtividadeRealizar: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [resposta, setResposta] = useState('');
  const [linkAnexo, setLinkAnexo] = useState('');
  const [respostasMultipla, setRespostasMultipla] = useState<Record<string, number>>({});

  const atividadeLocal = useMemo(() => {
    if (isApiEnabled()) return null;
    const atividades = loadFromStorage<Atividade[]>(atividadesStorageKey, []);
    return atividades.find((item) => item.id === id) ?? null;
  }, [id]);

  const entregaLocal = useMemo(() => {
    if (!user?.id || !id) return null;
    if (isApiEnabled()) return null;
    const entregas = loadFromStorage<AtividadeEntrega[]>(entregasStorageKey, []);
    return entregas.find((item) => item.atividadeId === id && item.alunoId === user.id) ?? null;
  }, [id, user]);
  const [atividade, setAtividade] = useState<Atividade | null>(atividadeLocal);
  const [entregaExistente, setEntregaExistente] = useState<AtividadeEntrega | null>(entregaLocal);

  useEffect(() => {
    setAtividade(atividadeLocal);
  }, [atividadeLocal]);

  useEffect(() => {
    setEntregaExistente(entregaLocal);
  }, [entregaLocal]);

  useEffect(() => {
    if (!id || !isApiEnabled()) return;
    void Promise.all([
      listAtividadesApi(),
      listDisciplinasApi(),
      listTurmasApi(),
      listEntregasAtividadesApi(),
    ])
      .then(([atividadesApi, disciplinasApi, turmasApi, entregasApi]) => {
        const turmaNomeById = new Map(
          turmasApi.map((t) => [String(t.id ?? ''), t.nome ?? `Turma ${t.id ?? ''}`]),
        );
        const disciplinaNomeById = new Map(
          disciplinasApi.map((d) => [String(d.id ?? ''), d.nome ?? `Disciplina ${d.id ?? ''}`]),
        );
        const atividadeApi = atividadesApi.find((item) => String(item.id ?? '') === String(id));
        if (atividadeApi) {
          const meta = parseAtividadeMeta(atividadeApi.descricao ?? '');
          setAtividade({
            id: String(atividadeApi.id ?? id),
            titulo: atividadeApi.titulo ?? '',
            turma: turmaNomeById.get(String(atividadeApi.turmaId ?? '')) ?? '',
            disciplina: disciplinaNomeById.get(String(atividadeApi.disciplinaId ?? '')) ?? '',
            periodo: meta.periodo ?? '',
            sala: meta.sala ?? '',
            data: atividadeApi.dataEntrega ?? '',
            horario: meta.horario ?? '',
            instrucoes: meta.instrucoes ?? '',
            descricao: meta.descricao ?? '',
            entrega: atividadeApi.dataEntrega ?? '',
            questoes: meta.questoes ?? [],
            status: 'Pendente',
          });
        }
        if (user?.id) {
          const entregaApi = entregasApi.find(
            (item) =>
              String(item.atividadeId ?? '') === String(id) &&
              String(item.alunoId ?? '') === String(user.id),
          );
          if (entregaApi) {
            const respostaPayload = parseEntregaResposta(entregaApi.resposta ?? '');
            setEntregaExistente({
              id: String(entregaApi.id ?? `${id}-${user.id}`),
              atividadeId: String(entregaApi.atividadeId ?? id),
              alunoId: String(entregaApi.alunoId ?? user.id),
              alunoNome: user.nome,
              disciplina:
                disciplinaNomeById.get(String(atividadeApi?.disciplinaId ?? '')) ?? atividade?.disciplina ?? '',
              resposta: respostaPayload.resposta,
              linkAnexo: respostaPayload.linkAnexo,
              respostasObjetivas: respostaPayload.respostasObjetivas,
              enviadoEm: '',
              nota: entregaApi.nota ?? null,
            });
          }
        }
      })
      .catch(() => {
        window.alert('Nao foi possivel carregar a atividade. Verifique a API e tente novamente.');
      });
  }, [id, user?.id]);

  const modoConsulta = Boolean(entregaExistente);
  const dataEntrega = atividade?.data ?? atividade?.entrega ?? '';
  const horarioEntrega = atividade?.horario ?? '';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!atividade || !user) return;
    const respostasObjetivas = Object.entries(respostasMultipla).map(([questaoId, alternativaIndex]) => ({
      questaoId,
      alternativaIndex,
    }));
    const temObjetivaSelecionada = respostasObjetivas.length > 0;
    if (!resposta.trim() && !linkAnexo.trim() && !temObjetivaSelecionada) {
      window.alert('Informe uma resposta, marque alternativas ou anexe um link.');
      return;
    }

    const entrega: AtividadeEntrega = {
      id: `${atividade.id}-${user.id}`,
      atividadeId: atividade.id,
      alunoId: user.id,
      alunoNome: user.nome,
      disciplina: atividade.disciplina,
      resposta: resposta.trim(),
      respostasObjetivas,
      linkAnexo: linkAnexo.trim(),
      enviadoEm: new Date().toISOString(),
    };

    if (isApiEnabled()) {
      const atividadeIdNum = Number(atividade.id);
      const alunoIdNum = Number(user.id);
      if (Number.isFinite(atividadeIdNum) && Number.isFinite(alunoIdNum)) {
        try {
          await saveEntregaAtividadeApi({
            id: undefined,
            atividadeId: atividadeIdNum,
            alunoId: alunoIdNum,
            resposta: resposta.trim(),
            nota: null,
            corrigido: false,
          });
          navigate('/atividades');
          return;
        } catch {
          window.alert('Nao foi possivel enviar a atividade no servidor.');
          return;
        }
      }
      window.alert('Nao foi possivel enviar a atividade. IDs invalidos.');
      return;
    }
    const stored = loadFromStorage<AtividadeEntrega[]>(entregasStorageKey, []);
    const updated = [
      entrega,
      ...stored.filter(
        (item) => !(item.atividadeId === atividade.id && item.alunoId === user.id),
      ),
    ];
    saveToStorage(entregasStorageKey, updated);
    navigate('/atividades');
  };

  useEffect(() => {
    if (entregaExistente) {
      setResposta(entregaExistente.resposta ?? '');
      setLinkAnexo(entregaExistente.linkAnexo ?? '');
      const respostas = entregaExistente.respostasObjetivas ?? [];
      setRespostasMultipla(
        respostas.reduce<Record<string, number>>((acc, item) => {
          acc[item.questaoId] = item.alternativaIndex;
          return acc;
        }, {}),
      );
    }
  }, [entregaExistente]);

  if (!atividade) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <h1 className="font-display text-3xl font-bold text-foreground">
            Atividade não encontrada
          </h1>
          <Link to="/atividades">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/atividades">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              {modoConsulta ? 'Atividade enviada' : 'Realizar atividade'}
            </h1>
            <p className="text-muted-foreground">
              {atividade.disciplina}
              {dataEntrega ? ` • Entrega em ${dataEntrega}` : ''}
              {horarioEntrega ? ` • ${horarioEntrega}` : ''}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{atividade.titulo}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {atividade.instrucoes && (
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                {atividade.instrucoes}
              </div>
            )}
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              {atividade.descricao || 'Sem enunciado informado.'}
            </div>
            {atividade.questoes && atividade.questoes.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Questões</h3>
                {atividade.questoes.map((questao, index) => (
                  <div key={questao.id} className="rounded-md border border-border p-3 space-y-2">
                    <div className="text-sm font-medium text-foreground">
                      Questão {index + 1}
                    </div>
                    <div className="text-sm text-muted-foreground">{questao.enunciado}</div>
                    {questao.tipo === 'multipla' && questao.opcoes.length > 0 && (
                      <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground">
                        {questao.opcoes.map((opcao, optionIndex) => (
                          <label
                            key={`${questao.id}-${optionIndex}`}
                            className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 hover:bg-muted/30"
                          >
                            <input
                              type="radio"
                              name={`questao-${questao.id}`}
                              checked={respostasMultipla[questao.id] === optionIndex}
                              onChange={() =>
                                setRespostasMultipla((prev) => ({ ...prev, [questao.id]: optionIndex }))
                              }
                              disabled={modoConsulta}
                            />
                            <span>
                              {String.fromCharCode(65 + optionIndex)}) {opcao}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                    {questao.tipo === 'aberta' && (
                      <div className="text-xs text-muted-foreground">
                        Resposta aberta.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarClock className="w-4 h-4" />
              {dataEntrega ? `Entrega em ${dataEntrega}` : 'Entrega sem data'}
              {horarioEntrega ? ` • ${horarioEntrega}` : ''}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sua resposta</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Resposta</Label>
                <Textarea
                  value={resposta}
                  onChange={(event) => setResposta(event.target.value)}
                  rows={6}
                  placeholder="Digite sua resposta ou resumo da atividade"
                  disabled={modoConsulta}
                />
              </div>
              <div className="space-y-2">
                <Label>Link do arquivo (opcional)</Label>
                <Input
                  value={linkAnexo}
                  onChange={(event) => setLinkAnexo(event.target.value)}
                  placeholder="Ex: https://drive.google.com/..."
                  disabled={modoConsulta}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Link to="/atividades">
                  <Button type="button" variant="outline">
                    Voltar
                  </Button>
                </Link>
                {!modoConsulta && (
                  <Button type="submit" variant="gradient">
                    <Send className="w-4 h-4" />
                    Enviar atividade
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AtividadeRealizar;
