import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/common/StatCard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { loadFromStorage, saveToStorage, syncKeysFromBackend } from '@/lib/mockStorage';
import { CatalogItem, defaultDisciplinas, disciplinasStorageKey } from '@/lib/mockAcademics';
import { Turma, defaultTurmas, turmasStorageKey } from '@/lib/mockTurmas';
import { StoredUser, usersStorageKey } from '@/lib/mockUsers';
import {
  BookOpen,
  Users,
  ClipboardList,
  Calendar,
  FileText,
  Bell,
  Clock,
  ChevronRight,
  Award,
  UserCheck,
  Download,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  isApiEnabled,
  listAvisosApi,
  listDisciplinasApi,
  listFrequenciasApi,
  listGradeAulasApi,
  listTurmasApi,
  listUsuariosApi,
} from '@/lib/entityCrudApi';
import { loadVinculosDisciplinaTurma } from '@/lib/vinculosRelacional';
import { mapTurnoFieldsFromTurmaApi } from '@/lib/turnosCatalog';
import {
  getMinhaRespostaRelacional,
  isProvasRelacionalEnabled,
  listProvasRelacionalParaAluno,
  submitRespostaRelacional,
} from '@/lib/provasRelApi';
import { isNotasRelacionalEnabled, listNotasRelacionalPorAluno } from '@/lib/notasRelApi';

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
  status: 'Agendada' | 'Rascunho' | 'Concluida';
  publicada?: boolean;
  questoes?: ProvaQuestion[];
}

const provasStorageKey = 'school-compass:provas';
const respostasStorageKey = 'school-compass:provas-respostas';
const notasAlunosStorageKey = 'school-compass:notas-alunos';
const presencasStorageKey = 'school-compass:frequencia-diaria';
const vinculosStorageKey = 'school-compass:disciplinas-vinculos';
const aulasStorageKey = 'school-compass:grade-aulas';
const avisosStorageKey = 'school-compass:avisos';

interface NotaAluno {
  id: string;
  alunoId: string;
  alunoNome: string;
  turma: string;
  disciplina: string;
  bimestre: string;
  trabalhosNota?: number | null;
  provasNota?: number | null;
  nota: number | null;
}

interface AlunoVinculado {
  alunoId: string;
  alunoNome: string;
}

interface DisciplinaVinculoDash {
  disciplinaId: string;
  turmaId: string;
  turmaNome: string;
  professorId: string;
  professorNome: string;
  alunos?: AlunoVinculado[];
}

interface AulaCadastrada {
  id: string;
  disciplinaId: string;
  turmaId: string;
  dia: string;
  inicio: string;
  fim: string;
}

interface RegistroPresenca {
  id?: string;
  turma: string;
  alunoId: string;
  alunoNome?: string;
  data?: string;
  status: 'Presente' | 'Falta';
}

interface AvisoItem {
  id: string;
  titulo: string;
  descricao?: string;
  data: string;
  nivel?: string;
}

const normalizeText = (value?: string) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const getTurmaKey = (value?: string) => {
  const normalized = normalizeText(value).replace(/º/g, 'o').replace(/\s+/g, ' ');
  const match = normalized.match(/(\d+)\s*(?:o|ano)?\s*([a-z])/i);
  if (match) return `${match[1]}${match[2]}`.toLowerCase();
  return normalized.replace(/[^a-z0-9]/g, '');
};

const diasAgenda = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];

interface ProvaRespostaItem {
  questaoId: string;
  tipo: QuestionType;
  alternativaIndex?: number | null;
  respostaTexto?: string;
  pontosObtidos?: number | null;
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
  pontosMaximos?: number;
  pontosObtidos?: number;
  notaFinal?: number | null;
  enviadoEm: string;
  corrigidoEm?: string;
}

const AlunoDashboard: React.FC = () => {
  const { user } = useAuth();
  const [provasList, setProvasList] = useState<Prova[]>(() =>
    isApiEnabled() ? [] : loadFromStorage<Prova[]>(provasStorageKey, []),
  );
  const [respostasRegistradas, setRespostasRegistradas] = useState<ProvaResposta[]>(
    () => (isApiEnabled() ? [] : loadFromStorage<ProvaResposta[]>(respostasStorageKey, [])),
  );
  const [notasAlunos, setNotasAlunos] = useState<NotaAluno[]>(() =>
    isApiEnabled() ? [] : loadFromStorage<NotaAluno[]>(notasAlunosStorageKey, []),
  );
  const [presencas, setPresencas] = useState<RegistroPresenca[]>(() =>
    isApiEnabled() ? [] : loadFromStorage<RegistroPresenca[]>(presencasStorageKey, []),
  );
  const [vinculos, setVinculos] = useState<DisciplinaVinculoDash[]>(() =>
    isApiEnabled() ? [] : loadFromStorage<DisciplinaVinculoDash[]>(vinculosStorageKey, []),
  );
  const [turmasList, setTurmasList] = useState<Turma[]>(() =>
    loadFromStorage<Turma[]>(turmasStorageKey, isApiEnabled() ? [] : defaultTurmas),
  );
  const [disciplinasList, setDisciplinasList] = useState<CatalogItem[]>(() =>
    loadFromStorage<CatalogItem[]>(disciplinasStorageKey, isApiEnabled() ? [] : defaultDisciplinas),
  );
  const [usuarios, setUsuarios] = useState<StoredUser[]>(() =>
    isApiEnabled() ? [] : loadFromStorage<StoredUser[]>(usersStorageKey, []),
  );
  const [aulasGrade, setAulasGrade] = useState<AulaCadastrada[]>(() =>
    isApiEnabled() ? [] : loadFromStorage<AulaCadastrada[]>(aulasStorageKey, []),
  );
  const [avisosLista, setAvisosLista] = useState<AvisoItem[]>(() =>
    isApiEnabled() ? [] : loadFromStorage<AvisoItem[]>(avisosStorageKey, []),
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [provaSelecionada, setProvaSelecionada] = useState<Prova | null>(null);
  const [respostasDraft, setRespostasDraft] = useState<Record<string, ProvaRespostaItem>>({});
  const [modoConsulta, setModoConsulta] = useState(false);

  useEffect(() => {
    if (!isApiEnabled()) {
      const keysOnline = [
        provasStorageKey,
        respostasStorageKey,
        notasAlunosStorageKey,
        presencasStorageKey,
        turmasStorageKey,
        disciplinasStorageKey,
        usersStorageKey,
        avisosStorageKey,
      ];
      const keysOffline = [...keysOnline, vinculosStorageKey, aulasStorageKey];
      void syncKeysFromBackend(keysOffline).finally(() => {
        setProvasList(loadFromStorage<Prova[]>(provasStorageKey, []));
        setRespostasRegistradas(loadFromStorage<ProvaResposta[]>(respostasStorageKey, []));
        setNotasAlunos(loadFromStorage<NotaAluno[]>(notasAlunosStorageKey, []));
        setPresencas(loadFromStorage<RegistroPresenca[]>(presencasStorageKey, []));
        setTurmasList(loadFromStorage<Turma[]>(turmasStorageKey, isApiEnabled() ? [] : defaultTurmas));
        setDisciplinasList(
          loadFromStorage<CatalogItem[]>(disciplinasStorageKey, isApiEnabled() ? [] : defaultDisciplinas),
        );
        setUsuarios(loadFromStorage<StoredUser[]>(usersStorageKey, []));
        setAvisosLista(loadFromStorage<AvisoItem[]>(avisosStorageKey, []));
        setVinculos(loadFromStorage<DisciplinaVinculoDash[]>(vinculosStorageKey, []));
        setAulasGrade(loadFromStorage<AulaCadastrada[]>(aulasStorageKey, []));
      });
      return;
    }
    void Promise.all([
      listUsuariosApi(),
      listDisciplinasApi(),
      listTurmasApi(),
      listFrequenciasApi(),
      listAvisosApi(),
      listGradeAulasApi(),
      loadVinculosDisciplinaTurma(),
    ])
      .then(([usuariosApi, disciplinasApi, turmasApi, frequenciasApi, avisosApi, gradeRows, vincRows]) => {
        const usuariosMapped: StoredUser[] = usuariosApi.map((u) => ({
          id: String(u.id ?? ''),
          cpf: u.cpf ?? '',
          nome: u.nome ?? '',
          email: u.email ?? '',
          perfil: String(u.role ?? '').includes('PROFESSOR')
            ? UserProfile.PROFESSOR
            : String(u.role ?? '').includes('ADMIN')
              ? UserProfile.ADMINISTRADOR
              : String(u.role ?? '').includes('GESTOR')
                ? UserProfile.GESTOR
                : String(u.role ?? '').includes('SECRETARIA')
                  ? UserProfile.SECRETARIA
                  : UserProfile.ALUNO,
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
        const alunoNomeById = new Map(usuariosMapped.map((u) => [u.id, u.nome]));
        const presencasMapped: RegistroPresenca[] = frequenciasApi.map((f) => ({
          id: String(f.id ?? ''),
          turma: turmaNomeById.get(String(f.turmaId ?? '')) ?? `Turma ${f.turmaId ?? ''}`,
          alunoId: String(f.alunoId ?? ''),
          alunoNome: alunoNomeById.get(String(f.alunoId ?? '')) ?? '',
          data: f.data ?? '',
          status: f.presente ? 'Presente' : 'Falta',
        }));
        const avisosMapeados: AvisoItem[] = avisosApi.map((a) => ({
          id: String(a.id ?? ''),
          titulo: a.titulo ?? '',
          descricao: a.conteudo ?? '',
          data: a.dataCriacao ? new Date(a.dataCriacao).toISOString() : new Date().toISOString(),
          nivel: (a.conteudo ?? '').includes('[NIVEL:Urgente]')
            ? 'Urgente'
            : (a.conteudo ?? '').includes('[NIVEL:Lembrete]')
              ? 'Lembrete'
              : 'Informativo',
        }));
        setUsuarios(usuariosMapped);
        setDisciplinasList(disciplinasMapped);
        setTurmasList(turmasMapped);
        setPresencas(presencasMapped);
        setAvisosLista(avisosMapeados);
        saveToStorage(usersStorageKey, usuariosMapped);
        saveToStorage(disciplinasStorageKey, disciplinasMapped);
        saveToStorage(turmasStorageKey, turmasMapped);
        saveToStorage(presencasStorageKey, presencasMapped);
        saveToStorage(avisosStorageKey, avisosMapeados);
        const aulasMapped: AulaCadastrada[] = gradeRows
          .filter((r) => r.disciplinaId != null && r.turmaId != null)
          .map((r) => ({
            id: String(r.id ?? ''),
            disciplinaId: String(r.disciplinaId),
            turmaId: String(r.turmaId),
            dia: r.dia ?? '',
            inicio: r.inicio ?? '',
            fim: r.fim ?? '',
          }));
        setAulasGrade(aulasMapped);
        setVinculos(vincRows as DisciplinaVinculoDash[]);
      })
      .catch(() => {
        window.alert('Nao foi possivel carregar dados do painel. Verifique a API e tente novamente.');
      });
    if (isProvasRelacionalEnabled() && user?.id && Number.isFinite(Number(user.id))) {
      void listProvasRelacionalParaAluno(user.id)
        .then(async (provasRel) => {
          const provasMapped: Prova[] = provasRel.map((p) => ({
            id: String(p.id ?? ''),
            titulo: p.titulo,
            turma: p.turmaNome ?? '',
            disciplina: p.disciplinaNome ?? '',
            periodo: p.periodo ?? '',
            data: p.data,
            horario: p.horario ?? '',
            sala: '',
            instrucoes: p.instrucoes ?? '',
            status:
              p.status === 'Agendada' || p.status === 'Concluida' || p.status === 'Rascunho'
                ? p.status
                : 'Agendada',
            publicada: Boolean(p.publicada),
            questoes: (p.questoes ?? []).map((q, idx) => ({
              id: String(q.id ?? `q-${idx}`),
              enunciado: q.enunciado,
              tipo: q.tipo === 'aberta' ? 'aberta' : 'multipla',
              pontos: q.pontos ?? 0,
              opcoes: q.opcoes ?? [],
              corretaIndex: q.corretaIndex ?? null,
            })),
          }));
          const respostasLoaded: ProvaResposta[] = [];
          for (const prova of provasMapped) {
            if (!Number.isFinite(Number(prova.id))) continue;
            const minha = await getMinhaRespostaRelacional(Number(prova.id), Number(user.id));
            if (!minha) continue;
            respostasLoaded.push({
              id: String(minha.id ?? `${minha.provaId}-${minha.alunoId}`),
              provaId: String(minha.provaId),
              provaTitulo: minha.provaTitulo ?? prova.titulo,
              alunoId: String(minha.alunoId),
              alunoNome: minha.alunoNome ?? user.nome,
              turma: minha.turma ?? prova.turma,
              disciplina: minha.disciplina ?? prova.disciplina,
              status:
                minha.status === 'Corrigido' || (minha.notaFinal ?? null) !== null ? 'Corrigido' : 'Enviado',
              respostas: (minha.respostas ?? []).map((i) => ({
                questaoId: String(i.questaoId ?? ''),
                tipo: i.tipo === 'aberta' ? 'aberta' : 'multipla',
                alternativaIndex: i.alternativaIndex ?? null,
                respostaTexto: i.respostaTexto ?? '',
                pontosObtidos: i.pontosObtidos ?? null,
              })),
              pontosMaximos: minha.pontosMaximos ?? 0,
              pontosObtidos: minha.pontosObtidos ?? 0,
              notaFinal: minha.notaFinal ?? null,
              enviadoEm: minha.enviadoEm ?? '',
              corrigidoEm: typeof minha.corrigidoEm === 'string' ? minha.corrigidoEm : undefined,
            });
          }
          setProvasList(provasMapped);
          setRespostasRegistradas(respostasLoaded);
        })
        .catch(() => null);
    }
    if (isNotasRelacionalEnabled() && user?.id) {
      void listNotasRelacionalPorAluno(user.id)
        .then((rows) => {
          const mapped: NotaAluno[] = rows.map((n, idx) => ({
            id: `rel-${n.id ?? idx}`,
            alunoId: String(n.alunoId ?? user.id),
            alunoNome: n.alunoNome ?? user.nome ?? '',
            turma: n.turmaNome ?? '',
            disciplina: n.disciplinaNome ?? '',
            bimestre: n.bimestre ?? '',
            trabalhosNota: n.trabalhosNota ?? null,
            provasNota: n.provasNota ?? null,
            nota: n.nota ?? null,
          }));
          setNotasAlunos(mapped);
        })
        .catch(() => null);
    }
  }, [user?.id, user?.nome]);

  const alunoAtual = useMemo(
    () => usuarios.find((u) => u.id === user?.id) ?? null,
    [usuarios, user?.id],
  );

  const turmaReferencia = useMemo(() => {
    if (user && 'turma' in user && typeof user.turma === 'string' && user.turma.trim()) {
      return user.turma.trim();
    }
    if (user?.turmaId) {
      const t = turmasList.find((x) => x.id === user.turmaId);
      if (t?.nome?.trim()) return t.nome.trim();
      const match = user.turmaId.match(/^(\d+)\s*([a-z])$/i);
      if (match) {
        return `${match[1]}º Ano ${match[2].toUpperCase()}`;
      }
      return user.turmaId;
    }
    const primeira = alunoAtual?.turmas?.find((x) => x.trim());
    if (primeira) return primeira.trim();
    return '—';
  }, [user, turmasList, alunoAtual]);

  const turmaKeyAluno = useMemo(() => getTurmaKey(turmaReferencia), [turmaReferencia]);

  const provasDaTurma = useMemo(() => {
    return provasList
      .filter((prova) => getTurmaKey(prova.turma) === turmaKeyAluno)
      .filter((prova) => prova.publicada)
      .filter((prova) => prova.status === 'Agendada')
      .sort((a, b) => String(a.data).localeCompare(String(b.data)));
  }, [provasList, turmaKeyAluno]);

  const getRespostaDaProva = (provaId: string) => {
    const uid = normalizeText(user?.id);
    return respostasRegistradas.find(
      (resposta) => resposta.provaId === provaId && normalizeText(resposta.alunoId) === uid,
    );
  };

  const provasDisponiveis = useMemo(
    () => provasDaTurma.filter((prova) => !getRespostaDaProva(prova.id)),
    [provasDaTurma, respostasRegistradas, user?.id],
  );

  const provasRealizadas = useMemo(() => {
    const uid = normalizeText(user?.id);
    return respostasRegistradas.filter((resposta) => normalizeText(resposta.alunoId) === uid);
  }, [respostasRegistradas, user?.id]);

  const provasPorId = useMemo(
    () => new Map(provasList.map((prova) => [prova.id, prova])),
    [provasList],
  );

  const notasDoAluno = useMemo(() => {
    const uid = normalizeText(user?.id);
    if (!uid) return [];
    return notasAlunos.filter((n) => normalizeText(n.alunoId) === uid);
  }, [notasAlunos, user?.id]);

  const mediasNumericas = useMemo(() => {
    return notasDoAluno
      .map((n) => {
        if (typeof n.nota === 'number') return n.nota;
        const t = n.trabalhosNota;
        const p = n.provasNota;
        if (typeof t === 'number' && typeof p === 'number') return Math.round(((t + p) / 2) * 10) / 10;
        if (typeof t === 'number') return t;
        if (typeof p === 'number') return p;
        return null;
      })
      .filter((m): m is number => typeof m === 'number' && !Number.isNaN(m));
  }, [notasDoAluno]);

  const mediaGeralAluno = useMemo(() => {
    if (mediasNumericas.length === 0) return 0;
    const soma = mediasNumericas.reduce((a, b) => a + b, 0);
    return Math.round((soma / mediasNumericas.length) * 10) / 10;
  }, [mediasNumericas]);

  const mediaEvolucaoPct = useMemo(() => {
    if (mediasNumericas.length < 2) return undefined;
    const sorted = [...notasDoAluno]
      .map((n) => {
        let m: number | null = null;
        if (typeof n.nota === 'number') m = n.nota;
        else {
          const t = n.trabalhosNota;
          const p = n.provasNota;
          if (typeof t === 'number' && typeof p === 'number') m = Math.round(((t + p) / 2) * 10) / 10;
          else if (typeof t === 'number') m = t;
          else if (typeof p === 'number') m = p;
        }
        return { key: `${n.disciplina}-${n.bimestre}`, m };
      })
      .filter((x): x is { key: string; m: number } => typeof x.m === 'number')
      .sort((a, b) => a.key.localeCompare(b.key, 'pt-BR'));
    if (sorted.length < 2) return undefined;
    const prev = sorted[sorted.length - 2].m;
    const last = sorted[sorted.length - 1].m;
    if (prev <= 0) return undefined;
    return Math.round(((last - prev) / prev) * 1000) / 10;
  }, [notasDoAluno]);

  const frequenciaGeralPct = useMemo(() => {
    const uid = normalizeText(user?.id);
    if (!uid) return null;
    const regs = presencas.filter((p) => normalizeText(p.alunoId) === uid);
    if (regs.length === 0) return null;
    const presentes = regs.filter((p) => p.status === 'Presente').length;
    return Math.round((presentes / regs.length) * 1000) / 10;
  }, [presencas, user?.id]);

  const materiasReais = useMemo(() => {
    if (!user?.id) return [];
    const turmaKeysAluno = new Set((alunoAtual?.turmas ?? []).map((t) => getTurmaKey(t)));
    if (turmaKeyAluno) turmaKeysAluno.add(turmaKeyAluno);

    const vinculosAluno = vinculos.filter((v) => {
      const isAlunoNoVinculo = (v.alunos ?? []).some((a) => normalizeText(a.alunoId) === normalizeText(user.id));
      const turmaNome = turmasList.find((t) => t.id === v.turmaId)?.nome ?? v.turmaNome;
      const isTurmaDoAluno = turmaKeysAluno.has(getTurmaKey(turmaNome));
      return isAlunoNoVinculo || isTurmaDoAluno;
    });

    const notaPorDisciplina = (discNome: string) => {
      const key = normalizeText(discNome);
      const matches = notasDoAluno.filter((n) => normalizeText(n.disciplina) === key);
      if (matches.length === 0) return null;
      const medias = matches
        .map((n) => {
          if (typeof n.nota === 'number') return n.nota;
          const t = n.trabalhosNota;
          const p = n.provasNota;
          if (typeof t === 'number' && typeof p === 'number') return (t + p) / 2;
          if (typeof t === 'number') return t;
          if (typeof p === 'number') return p;
          return null;
        })
        .filter((m): m is number => typeof m === 'number');
      if (medias.length === 0) return null;
      return Math.round((medias.reduce((a, b) => a + b, 0) / medias.length) * 10) / 10;
    };

    const unique = new Map<
      string,
      { id: string; nome: string; professor: string; nota: number | null; frequencia: number }
    >();

    vinculosAluno.forEach((v) => {
      const turmaNome = turmasList.find((t) => t.id === v.turmaId)?.nome ?? v.turmaNome ?? v.turmaId;
      const disciplinaNome =
        disciplinasList.find((d) => d.id === v.disciplinaId)?.nome ?? v.disciplinaId;
      const turmaKey = getTurmaKey(turmaNome);
      const presencasAluno = presencas.filter(
        (p) => normalizeText(p.alunoId) === normalizeText(user.id) && getTurmaKey(p.turma) === turmaKey,
      );
      const faltas = presencasAluno.filter((p) => p.status === 'Falta').length;
      const presencaPercentual =
        presencasAluno.length > 0
          ? Math.round(((presencasAluno.length - faltas) / presencasAluno.length) * 1000) / 10
          : 0;

      const id = `${v.disciplinaId}-${v.turmaId || turmaNome}`;
      unique.set(id, {
        id,
        nome: disciplinaNome,
        professor: v.professorNome?.trim() ? `Prof. ${v.professorNome}` : 'Professor',
        nota: notaPorDisciplina(disciplinaNome),
        frequencia: presencaPercentual,
      });
    });

    return Array.from(unique.values()).sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }),
    );
  }, [
    alunoAtual?.turmas,
    disciplinasList,
    notasDoAluno,
    presencas,
    turmasList,
    turmaKeyAluno,
    user?.id,
    vinculos,
  ]);

  const qtdMaterias = materiasReais.length;

  const diaHojeNome = useMemo(() => diasAgenda[new Date().getDay()], []);

  const aulasHojeReal = useMemo(() => {
    return aulasGrade
      .filter((a) => a.dia === diaHojeNome && getTurmaKey(a.turmaId) === turmaKeyAluno)
      .map((a) => {
        const disc =
          disciplinasList.find((d) => d.id === a.disciplinaId)?.nome ?? a.disciplinaId;
        const turmaNome = turmasList.find((t) => t.id === a.turmaId)?.nome ?? a.turmaId;
        const v = vinculos.find(
          (x) => x.turmaId === a.turmaId && x.disciplinaId === a.disciplinaId,
        );
        const professor = v?.professorNome?.trim()
          ? `Prof. ${v.professorNome}`
          : 'Professor';
        return {
          materia: disc,
          horario: `${a.inicio} - ${a.fim}`,
          sala: turmaNome,
          professor,
        };
      })
      .sort((x, y) => x.horario.localeCompare(y.horario));
  }, [aulasGrade, diaHojeNome, disciplinasList, turmaKeyAluno, turmasList, vinculos]);

  const avisosRecentesReal = useMemo(
    () =>
      [...avisosLista]
        .sort((a, b) => String(b.data).localeCompare(String(a.data)))
        .slice(0, 6)
        .map((a) => ({
          titulo: a.titulo,
          data: a.data?.slice(0, 10) ?? '',
          urgente: a.nivel === 'Urgente',
        })),
    [avisosLista],
  );

  const colegasReal = useMemo(() => {
    if (!user?.id || !alunoAtual) return [];
    const minhasTurmas = new Set((alunoAtual.turmas ?? []).map((t) => getTurmaKey(t)));
    if (turmaKeyAluno) minhasTurmas.add(turmaKeyAluno);
    return usuarios
      .filter(
        (u) =>
          u.perfil === UserProfile.ALUNO &&
          u.id !== user.id &&
          (u.turmas ?? []).some((t) => minhasTurmas.has(getTurmaKey(t))),
      )
      .slice(0, 16)
      .map((u) => ({
        nome: u.nome,
        avatar: (u.nome?.trim().charAt(0) || '?').toUpperCase(),
      }));
  }, [usuarios, user?.id, alunoAtual, turmaKeyAluno]);

  const handleOpenProva = (prova: Prova) => {
    const respostaExistente = getRespostaDaProva(prova.id);
    const draftInicial = (prova.questoes ?? []).reduce<Record<string, ProvaRespostaItem>>(
      (acc, questao) => {
        const existente = respostaExistente?.respostas.find(
          (item) => item.questaoId === questao.id,
        );
        acc[questao.id] = {
          questaoId: questao.id,
          tipo: questao.tipo ?? 'multipla',
          alternativaIndex: existente?.alternativaIndex ?? null,
          respostaTexto: existente?.respostaTexto ?? '',
          pontosObtidos: existente?.pontosObtidos ?? null,
        };
        return acc;
      },
      {},
    );
    setProvaSelecionada(prova);
    setRespostasDraft(draftInicial);
    setModoConsulta(!!respostaExistente);
    setDialogOpen(true);
  };

  const handleChangeAlternativa = (questaoId: string, alternativaIndex: number) => {
    setRespostasDraft((prev) => ({
      ...prev,
      [questaoId]: {
        ...prev[questaoId],
        alternativaIndex,
      },
    }));
  };

  const handleChangeResposta = (questaoId: string, respostaTexto: string) => {
    setRespostasDraft((prev) => ({
      ...prev,
      [questaoId]: {
        ...prev[questaoId],
        respostaTexto,
      },
    }));
  };

  const handleSubmitProva = (event: React.FormEvent) => {
    event.preventDefault();
    if (!provaSelecionada || !user) return;
    const questoes = provaSelecionada.questoes ?? [];
    const invalid = questoes.some((questao) => {
      const resposta = respostasDraft[questao.id];
      if (!resposta) return true;
      if (questao.tipo === 'aberta') {
        return !resposta.respostaTexto?.trim();
      }
      return resposta.alternativaIndex === null || resposta.alternativaIndex === undefined;
    });
    if (invalid) {
      window.alert('Responda todas as questões antes de enviar.');
      return;
    }

    const pontosMaximos = questoes.reduce((acc, questao) => acc + (questao.pontos || 0), 0);
    const respostasFinal = questoes.map((questao) => {
      const resposta = respostasDraft[questao.id];
      const correta = questao.tipo !== 'aberta' && resposta.alternativaIndex === questao.corretaIndex;
      const pontosObtidos = questao.tipo === 'aberta' ? null : correta ? questao.pontos : 0;
      return {
        questaoId: questao.id,
        tipo: questao.tipo ?? 'multipla',
        alternativaIndex: resposta.alternativaIndex ?? null,
        respostaTexto: resposta.respostaTexto ?? '',
        pontosObtidos,
      } satisfies ProvaRespostaItem;
    });

    const pontosAutomaticos = respostasFinal.reduce(
      (acc, item) => acc + (item.pontosObtidos ?? 0),
      0,
    );
    const novoRegistro: ProvaResposta = {
      id: `${provaSelecionada.id}-${user.id}`,
      provaId: provaSelecionada.id,
      provaTitulo: provaSelecionada.titulo,
      alunoId: user.id,
      alunoNome: user.nome,
      turma: provaSelecionada.turma,
      disciplina: provaSelecionada.disciplina,
      status: 'Enviado',
      respostas: respostasFinal,
      pontosMaximos,
      pontosObtidos: pontosAutomaticos,
      notaFinal: null,
      enviadoEm: new Date().toISOString(),
    };

    const updated = [
      novoRegistro,
      ...respostasRegistradas.filter(
        (item) => !(item.provaId === provaSelecionada.id && item.alunoId === user.id),
      ),
    ];
    if (
      isProvasRelacionalEnabled() &&
      Number.isFinite(Number(provaSelecionada.id)) &&
      Number.isFinite(Number(user.id))
    ) {
      void submitRespostaRelacional(
        Number(provaSelecionada.id),
        Number(user.id),
        respostasFinal.map((r) => {
          const questaoIdNum = Number(r.questaoId);
          return {
            questaoId: Number.isFinite(questaoIdNum) ? questaoIdNum : undefined,
            tipo: r.tipo,
            alternativaIndex: r.alternativaIndex ?? null,
            respostaTexto: r.respostaTexto ?? '',
          };
        }),
      ).catch(() => {
        window.alert('Nao foi possivel enviar a prova. Verifique a API e tente novamente.');
      });
    }
    if (isProvasRelacionalEnabled()) {
      setRespostasRegistradas(updated);
      setModoConsulta(true);
      return;
    }
    setRespostasRegistradas(updated);
    saveToStorage(respostasStorageKey, updated);
    setModoConsulta(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="font-display font-bold text-3xl text-foreground mb-2">
              Painel do Aluno
            </h1>
            <p className="text-muted-foreground">
              Olá, <span className="font-medium text-foreground">{user?.nome}</span>!
              Turma: <span className="font-medium text-foreground">{turmaReferencia}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Boletim
            </Button>
            <Link to="/minhas-materias">
              <Button variant="gradient">
                <FileText className="w-4 h-4 mr-2" />
                Ver Matérias
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Award}
            title="Média Geral"
            value={mediaGeralAluno > 0 ? String(mediaGeralAluno) : '—'}
            change={mediaEvolucaoPct}
            variant="success"
            delay={0}
          />
          <StatCard
            icon={UserCheck}
            title="Frequência"
            value={frequenciaGeralPct !== null ? `${frequenciaGeralPct}%` : '—'}
            variant="primary"
            delay={100}
          />
          <StatCard
            icon={BookOpen}
            title="Matérias"
            value={qtdMaterias > 0 ? String(qtdMaterias) : '—'}
            variant="accent"
            delay={200}
          />
          <StatCard
            icon={FileText}
            title="Provas Próximas"
            value={String(provasDisponiveis.length)}
            variant="warning"
            delay={300}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/minhas-notas" className="block">
            <div className="bg-card rounded-xl p-4 border border-border/50 card-hover text-center">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mx-auto mb-3">
                <ClipboardList className="w-6 h-6 text-success" />
              </div>
              <p className="font-medium text-sm">Ver Notas</p>
            </div>
          </Link>
          <Link to="/minha-frequencia" className="block">
            <div className="bg-card rounded-xl p-4 border border-border/50 card-hover text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <p className="font-medium text-sm">Frequência</p>
            </div>
          </Link>
          <Link to="/minhas-materias" className="block">
            <div className="bg-card rounded-xl p-4 border border-border/50 card-hover text-center">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-6 h-6 text-accent" />
              </div>
              <p className="font-medium text-sm">Matérias</p>
            </div>
          </Link>
          <Link to="/atividades" className="block">
            <div className="bg-card rounded-xl p-4 border border-border/50 card-hover text-center">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-warning" />
              </div>
              <p className="font-medium text-sm">Atividades</p>
            </div>
          </Link>
        </div>

        {/* Provas */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="bg-card rounded-xl p-6 border border-border/50 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-lg text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Provas disponíveis
              </h3>
              <span className="text-xs text-muted-foreground">
                {provasDisponiveis.length} prova(s) disponíveis
              </span>
            </div>
            {provasDisponiveis.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Nenhuma prova disponível para a sua turma no momento.
              </div>
            ) : (
              <div className="space-y-4">
                {provasDisponiveis.map((prova) => (
                  <div key={prova.id} className="rounded-lg border border-border/60 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {prova.disciplina || 'Disciplina'} • {prova.periodo || 'Periodo'}
                        </p>
                        <p className="text-base font-semibold text-foreground">{prova.titulo}</p>
                        <p className="text-xs text-muted-foreground">
                          {prova.data} • {prova.horario} • {prova.sala}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-muted-foreground">
                          {prova.questoes?.length ?? 0} questão(ões)
                        </div>
                        <Button size="sm" variant="outline" onClick={() => handleOpenProva(prova)}>
                          Fazer prova
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card rounded-xl p-6 border border-border/50 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-lg text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                Provas realizadas
              </h3>
              <span className="text-xs text-muted-foreground">
                {provasRealizadas.length} prova(s) realizadas
              </span>
            </div>
            {provasRealizadas.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Você ainda não realizou nenhuma prova.
              </div>
            ) : (
              <div className="space-y-4">
                {provasRealizadas.map((resposta) => {
                  const prova = provasPorId.get(resposta.provaId);
                  return (
                    <div key={resposta.id} className="rounded-lg border border-border/60 p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {prova?.disciplina || resposta.disciplina} • {prova?.periodo || 'Periodo'}
                          </p>
                          <p className="text-base font-semibold text-foreground">
                            {prova?.titulo || resposta.provaTitulo}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Status: {resposta.status === 'Corrigido' ? 'Corrigida' : 'Enviada'}
                            {resposta.notaFinal !== null && resposta.notaFinal !== undefined
                              ? ` • Nota ${resposta.notaFinal.toFixed(1)}`
                              : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-xs text-muted-foreground">
                            {typeof resposta.pontosMaximos === 'number' &&
                            resposta.pontosMaximos > 0 &&
                            typeof resposta.pontosObtidos === 'number'
                              ? `${resposta.pontosObtidos}/${resposta.pontosMaximos} pts`
                              : typeof resposta.pontosObtidos === 'number'
                                ? `${resposta.pontosObtidos} pts`
                                : '—'}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => prova && handleOpenProva(prova)}
                            disabled={!prova}
                          >
                            Ver envio
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Classes */}
          <div className="lg:col-span-2 bg-card rounded-xl p-6 border border-border/50 animate-slide-up">
            <h3 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Aulas de Hoje
            </h3>
            <div className="space-y-3">
              {aulasHojeReal.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Nenhuma aula cadastrada para hoje na sua turma (grade horária em{' '}
                  <span className="font-medium text-foreground">Agenda</span>).
                </div>
              ) : (
                aulasHojeReal.map((aula, index) => (
                  <div
                    key={`${aula.materia}-${aula.horario}-${index}`}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[80px] p-2 rounded-lg bg-aluno-light">
                        <p className="text-xs text-muted-foreground">Horário</p>
                        <p className="text-sm font-semibold text-aluno">{aula.horario}</p>
                      </div>
                      <div>
                        <p className="font-medium">{aula.materia}</p>
                        <p className="text-sm text-muted-foreground">
                          {aula.professor} • {aula.sala}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Notices and Classmates */}
          <div className="space-y-6">
            {/* Notices */}
            <div className="bg-card rounded-xl p-6 border border-border/50 animate-slide-up" style={{ animationDelay: '100ms' }}>
              <h3 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-warning" />
                Avisos
              </h3>
              <div className="space-y-3">
                {avisosRecentesReal.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum aviso no momento.</p>
                ) : (
                  avisosRecentesReal.map((aviso, index) => (
                    <div
                      key={`${aviso.titulo}-${index}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {aviso.urgente && (
                          <span className="w-2 h-2 rounded-full bg-destructive flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium">{aviso.titulo}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{aviso.data}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Classmates */}
            <div className="bg-card rounded-xl p-6 border border-border/50 animate-slide-up" style={{ animationDelay: '150ms' }}>
              <h3 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                Colegas de Turma
              </h3>
              <div className="flex flex-wrap gap-2">
                {colegasReal.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum colega na mesma turma encontrado no cadastro.
                  </p>
                ) : (
                  colegasReal.map((colega, index) => (
                    <div
                      key={`${colega.nome}-${index}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                        {colega.avatar}
                      </div>
                      <span className="text-sm">{colega.nome}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Subjects Grid */}
        <div className="bg-card rounded-xl p-6 border border-border/50 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-lg text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Minhas Matérias
            </h3>
            <Link to="/minhas-materias">
              <Button variant="ghost" size="sm" type="button">
                Ver detalhes
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materiasReais.length === 0 ? (
              <div className="col-span-full rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nenhuma matéria vinculada à sua turma. Os professores precisam cadastrar vínculos em{' '}
                <strong className="text-foreground">Disciplinas</strong>.
              </div>
            ) : (
              materiasReais.map((materia) => (
                <div
                  key={materia.id}
                  className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-foreground">{materia.nome}</h4>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        materia.nota === null
                          ? 'bg-muted text-muted-foreground'
                          : materia.nota >= 7
                            ? 'bg-success/10 text-success'
                            : 'bg-destructive/10 text-destructive'
                      }`}
                    >
                      {materia.nota === null ? 'Nota: —' : `Nota: ${materia.nota.toFixed(1)}`}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{materia.professor}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, materia.frequencia)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {materia.frequencia > 0 ? `${materia.frequencia}%` : '—'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] w-full max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modoConsulta ? 'Prova enviada' : 'Realizar prova'}</DialogTitle>
            <DialogDescription>
              {provaSelecionada?.titulo} • {provaSelecionada?.disciplina} • {provaSelecionada?.turma}
            </DialogDescription>
          </DialogHeader>
          {provaSelecionada && (
            <form onSubmit={handleSubmitProva} className="space-y-4">
              {provaSelecionada.instrucoes && (
                <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  {provaSelecionada.instrucoes}
                </div>
              )}
              {(provaSelecionada.questoes ?? []).map((questao, index) => {
                const resposta = respostasDraft[questao.id];
                return (
                  <div key={questao.id} className="rounded-md border border-border p-4 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Questão {index + 1}
                      </p>
                      <p className="text-sm text-foreground">{questao.enunciado}</p>
                    </div>
                    {questao.tipo === 'aberta' ? (
                      <div className="space-y-2">
                        <Label>Resposta</Label>
                        <Textarea
                          value={resposta?.respostaTexto ?? ''}
                          onChange={(event) => handleChangeResposta(questao.id, event.target.value)}
                          rows={3}
                          disabled={modoConsulta}
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Alternativas</Label>
                        <div className="grid grid-cols-1 gap-2">
                          {(questao.opcoes ?? []).map((opcao, optionIndex) => (
                            <label
                              key={`${questao.id}-${optionIndex}`}
                              className="flex items-center gap-2 text-sm text-muted-foreground"
                            >
                              <input
                                type="radio"
                                name={`questao-${questao.id}`}
                                checked={resposta?.alternativaIndex === optionIndex}
                                onChange={() => handleChangeAlternativa(questao.id, optionIndex)}
                                disabled={modoConsulta}
                              />
                              {String.fromCharCode(65 + optionIndex)}) {opcao}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Fechar
                </Button>
                {!modoConsulta && (
                  <Button type="submit" variant="gradient">
                    Enviar prova
                  </Button>
                )}
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AlunoDashboard;
