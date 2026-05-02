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
import { useToast } from '@/hooks/use-toast';
import { defaultUsers, StoredUser, usersStorageKey } from '@/lib/mockUsers';
import { loadFromStorage, saveToStorage } from '@/lib/mockStorage';
import { defaultInstituicao, instituicaoStorageKey } from '@/lib/mockInstituicao';
import { useAuth } from '@/contexts/AuthContext';
import {
  getMinhaRespostaRelacional,
  getProvaRelacional,
  isProvasRelacionalEnabled,
  mapRelApiToStorageShape,
  patchCorrecaoRespostaRelacional,
  type ProvaRespostaApi,
} from '@/lib/provasRelApi';
import {
  getInstituicaoApi,
  isApiEnabled,
  listAtividadesApi,
  listDisciplinasApi,
  listEntregasAtividadesApi,
  listTurmasApi,
  listUsuariosApi,
  saveEntregaAtividadeApi,
} from '@/lib/entityCrudApi';

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
  /** Bimestre / período letivo (JSON em `descricao`). */
  periodo?: string;
  sala?: string;
  horario?: string;
  instrucoes?: string;
  /** Texto descritivo da atividade (JSON em `descricao`). */
  descricaoTexto?: string;
  /** ISO `YYYY-MM-DD` da API. */
  dataEntrega?: string;
  questoes?: AtividadeQuestion[];
}

/** Mesmo formato salvo em `atividade.descricao` (JSON) pela tela de criação. */
interface AtividadeDescricaoMeta {
  descricao?: string;
  periodo?: string;
  sala?: string;
  horario?: string;
  instrucoes?: string;
  turno?: string;
  questoes?: Array<{
    id: string;
    enunciado?: string;
    tipo?: string;
    opcoes?: string[];
    corretaIndex?: number | null;
  }>;
}

const parseAtividadeDescricaoApi = (value?: string): AtividadeDescricaoMeta => {
  if (!value?.trim()) return {};
  try {
    const parsed = JSON.parse(value) as AtividadeDescricaoMeta;
    if (parsed && typeof parsed === 'object') return parsed;
    return {};
  } catch {
    return {};
  }
};

const parseEntregaRespostaApi = (value?: string) => {
  if (!value?.trim()) {
    return { resposta: '', linkAnexo: '', respostasObjetivas: [] as AtividadeEntrega['respostasObjetivas'] };
  }
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
  data?: string;
  horario?: string;
  instrucoes?: string;
  professorNome?: string;
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

const formatDataBR = (value?: string | unknown) => {
  if (value == null) return '';
  if (Array.isArray(value) && value.length >= 3) {
    const y = Number(value[0]);
    const m = Number(value[1]);
    const day = Number(value[2]);
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(day)) {
      return new Date(y, m - 1, day).toLocaleDateString('pt-BR');
    }
  }
  const raw = String(value).trim();
  if (!raw) return '';
  const d = raw.includes('T') ? new Date(raw) : new Date(`${raw}T12:00:00`);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('pt-BR');
};

const formatDataHoraBR = (iso?: string) => {
  if (!iso?.trim()) return '';
  const d = new Date(iso.trim());
  if (Number.isNaN(d.getTime())) return iso.trim();
  return d.toLocaleString('pt-BR');
};

const DetalheMetadado: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => {
  const t = typeof value === 'string' ? value.trim() : '';
  if (!t) return null;
  return (
    <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="break-words text-foreground">{t}</div>
    </div>
  );
};

export default function CorrecoesDetalhe() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
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

  const [storageTick, setStorageTick] = useState(0);
  const [entregas, setEntregas] = useState<AtividadeEntrega[]>(
    () => loadFromStorage<AtividadeEntrega[]>(entregasStorageKey, []),
  );

  const usuarios = useMemo(
    () => loadFromStorage<StoredUser[]>(usersStorageKey, isApiEnabled() ? [] : defaultUsers),
    [storageTick],
  );
  const atividades = useMemo(
    () => loadFromStorage<Atividade[]>(atividadesStorageKey, []),
    [storageTick],
  );
  const [avaliacoesDraft, setAvaliacoesDraft] = useState<
    Record<string, { nota: string; feedback: string }>
  >({});

  const [provaAlvo, setProvaAlvo] = useState<ProvaCor | null>(null);
  const [respostaAlvo, setRespostaAlvo] = useState<ProvaRespostaCor | null>(null);
  const [carregandoProva, setCarregandoProva] = useState(false);
  const [draftProva, setDraftProva] = useState({ nota: '', feedback: '' });
  const [instituicaoNome, setInstituicaoNome] = useState<string>('');

  useEffect(() => {
    if (isApiEnabled()) return;
    const stored = loadFromStorage(instituicaoStorageKey, defaultInstituicao);
    const n = stored?.nome?.trim();
    if (n) setInstituicaoNome(n);
  }, []);

  useEffect(() => {
    if (!isApiEnabled()) return;
    void Promise.all([
      getInstituicaoApi().catch(() => null),
      listUsuariosApi(),
      listDisciplinasApi(),
      listTurmasApi(),
      listAtividadesApi(),
      listEntregasAtividadesApi(),
    ])
      .then(([instituicao, usuariosApi, disciplinasApi, turmasApi, atividadesApi, entregasApi]) => {
        let nomeInst = instituicao?.nome?.trim();
        if (!nomeInst) {
          const stored = loadFromStorage(instituicaoStorageKey, defaultInstituicao);
          nomeInst = stored?.nome?.trim() ?? '';
        }
        if (nomeInst) setInstituicaoNome(nomeInst);
        const usuarioNomeById = new Map(usuariosApi.map((u) => [String(u.id ?? ''), u.nome ?? '']));
        const turmaNomeById = new Map(
          turmasApi.map((t) => [String(t.id ?? ''), t.nome ?? `Turma ${t.id ?? ''}`]),
        );
        const disciplinaNomeById = new Map(
          disciplinasApi.map((d) => [String(d.id ?? ''), d.nome ?? `Disciplina ${d.id ?? ''}`]),
        );

        const atividadesMapped: Atividade[] = atividadesApi.map((a) => {
          const meta = parseAtividadeDescricaoApi(a.descricao ?? '');
          const questoesRaw = meta.questoes ?? [];
          const questoes: AtividadeQuestion[] = questoesRaw.map((q) => ({
            id: String(q.id ?? ''),
            enunciado: q.enunciado ?? '',
            tipo: q.tipo === 'aberta' || q.tipo === 'dissertativa' ? 'aberta' : 'multipla',
            opcoes: Array.isArray(q.opcoes) ? q.opcoes : [],
            corretaIndex: q.corretaIndex ?? null,
          }));
          return {
            id: String(a.id ?? ''),
            titulo: a.titulo ?? '',
            turma: turmaNomeById.get(String(a.turmaId ?? '')) ?? `Turma ${a.turmaId ?? ''}`,
            disciplina:
              disciplinaNomeById.get(String(a.disciplinaId ?? '')) ?? `Disciplina ${a.disciplinaId ?? ''}`,
            turno: meta.turno ?? '',
            periodo: meta.periodo ?? '',
            sala: meta.sala ?? '',
            horario: meta.horario ?? '',
            instrucoes: meta.instrucoes ?? '',
            descricaoTexto: meta.descricao ?? '',
            dataEntrega: a.dataEntrega ?? '',
            questoes,
          };
        });
        const entregasMapped: AtividadeEntrega[] = entregasApi.map((e) => {
          const parsed = parseEntregaRespostaApi(e.resposta ?? '');
          return {
            id: String(e.id ?? ''),
            atividadeId: String(e.atividadeId ?? ''),
            alunoId: String(e.alunoId ?? ''),
            alunoNome: usuarioNomeById.get(String(e.alunoId ?? '')) ?? '',
            resposta: parsed.resposta,
            respostasObjetivas: parsed.respostasObjetivas,
            enviadoEm: '',
            nota: e.nota ?? null,
            corrigidoEm: e.corrigido ? new Date().toISOString() : undefined,
          };
        });

        saveToStorage(atividadesStorageKey, atividadesMapped);
        saveToStorage(entregasStorageKey, entregasMapped);
      })
      .catch(() => null)
      .finally(() => setStorageTick((p) => p + 1));
  }, []);

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
    if (!storageTick) return;
    setEntregas(loadFromStorage<AtividadeEntrega[]>(entregasStorageKey, []));
  }, [storageTick]);

  useEffect(() => {
    if (state?.tipo !== 'atividades') return;
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
  }, [correcoes, state?.tipo]);

  const isProvasFluxo = state?.tipo === 'provas';
  const provaIdNav = state?.provaId;
  const alunoIdNav = state?.alunoId;

  const subtituloCorrecao = useMemo(() => {
    const inst = instituicaoNome?.trim();
    if (state?.tipo === 'provas') {
      if (provaAlvo) {
        const partes = [
          inst,
          provaAlvo.disciplina || state?.materia,
          provaAlvo.turma || state?.turma,
          provaAlvo.periodo?.trim() || null,
        ].filter((p): p is string => Boolean(p && String(p).trim()));
        return partes.join(' • ');
      }
      return [inst, state?.materia, state?.turma].filter(Boolean).join(' • ');
    }
    const periodoAtiv = correcoes[0]?.atividade.periodo?.trim();
    const partes = [inst, state?.materia, state?.turma, periodoAtiv].filter(
      (p): p is string => Boolean(p && String(p).trim()),
    );
    return partes.join(' • ');
  }, [state?.tipo, state?.materia, state?.turma, provaAlvo, instituicaoNome, correcoes]);

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
              data: mapped.data,
              horario: mapped.horario,
              instrucoes: mapped.instrucoes,
              professorNome: api.professorNome ?? '',
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
        toast({
          title: 'Salvo com sucesso',
          description: 'A correção da prova foi registrada.',
        });
        navigate('/correcoes', { state: { listFilters: listFiltersRetorno } });
        return;
      } catch {
        /* tenta local abaixo */
      }
    }

    if (isApiEnabled()) {
      window.alert('Não foi possível salvar a correção. Verifique a API e tente novamente.');
      return;
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
    toast({
      title: 'Salvo com sucesso',
      description: 'A correção da prova foi salva localmente.',
    });
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
    if (isApiEnabled()) {
      const entrega = updated.find((e) => e.id === entregaId);
      const entregaIdNum = Number(entregaId);
      const atividadeIdNum = Number(entrega?.atividadeId);
      const alunoIdNum = Number(entrega?.alunoId);
      if (entrega && Number.isFinite(atividadeIdNum) && Number.isFinite(alunoIdNum)) {
        void saveEntregaAtividadeApi({
          id: Number.isFinite(entregaIdNum) ? entregaIdNum : undefined,
          atividadeId: atividadeIdNum,
          alunoId: alunoIdNum,
          resposta: entrega.resposta ?? '',
          nota: notaNumber,
          corrigido: true,
        }).catch(() => null);
      }
      toast({
        title: 'Salvo com sucesso',
        description: 'A correção da atividade foi registrada.',
      });
      return;
    }
    saveToStorage(entregasStorageKey, updated);
    toast({
      title: 'Salvo com sucesso',
      description: 'A correção da atividade foi salva localmente.',
    });
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

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <DetalheMetadado label="Instituição" value={instituicaoNome} />
                <DetalheMetadado label="Bimestre" value={provaAlvo.periodo} />
                <DetalheMetadado label="Data da prova" value={formatDataBR(provaAlvo.data)} />
                <DetalheMetadado label="Horário" value={provaAlvo.horario} />
                <DetalheMetadado label="Turno" value={provaAlvo.turno} />
                <DetalheMetadado label="Professor" value={provaAlvo.professorNome} />
                <DetalheMetadado label="Aluno" value={respostaAlvo.alunoNome ?? `Aluno ${respostaAlvo.alunoId}`} />
                <DetalheMetadado label="Enviado em" value={formatDataHoraBR(respostaAlvo.enviadoEm)} />
                <DetalheMetadado label="Corrigido em" value={formatDataHoraBR(respostaAlvo.corrigidoEm)} />
                <DetalheMetadado label="Instruções" value={provaAlvo.instrucoes} />
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

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <DetalheMetadado label="Instituição" value={instituicaoNome} />
                  <DetalheMetadado label="Bimestre" value={atividade.periodo} />
                  <DetalheMetadado label="Data de entrega" value={formatDataBR(atividade.dataEntrega)} />
                  <DetalheMetadado label="Turno" value={atividade.turno} />
                  <DetalheMetadado label="Sala" value={atividade.sala} />
                  <DetalheMetadado label="Horário" value={atividade.horario} />
                  <DetalheMetadado label="Descrição da atividade" value={atividade.descricaoTexto} />
                  <DetalheMetadado label="Instruções" value={atividade.instrucoes} />
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
