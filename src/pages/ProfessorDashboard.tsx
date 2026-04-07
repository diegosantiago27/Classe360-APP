import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/common/StatCard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BookOpen,
  Users,
  ClipboardList,
  Calendar,
  FileText,
  Bell,
  Clock,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { loadFromStorage, saveToStorage, syncKeysFromBackend } from '@/lib/mockStorage';
import { isApiEnabled, listAvisosApi } from '@/lib/entityCrudApi';
import {
  isProvasRelacionalEnabled,
  listProvasRelacionalParaProfessor,
  listRespostasRelacionalParaProfessor,
  patchCorrecaoRespostaRelacional,
} from '@/lib/provasRelApi';

interface ProvaQuestion {
  id: string;
  enunciado: string;
  tipo?: 'multipla' | 'aberta';
  pontos?: number;
  opcoes: string[];
  corretaIndex: number | null;
}

interface ProvaResumo {
  id: string;
  titulo: string;
  turma?: string;
  disciplina?: string;
  questoes?: ProvaQuestion[];
  status?: 'Agendada' | 'Rascunho' | 'Concluida';
}

interface ProvaRespostaItem {
  questaoId: string;
  tipo: 'multipla' | 'aberta';
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
  pontosMaximos: number;
  pontosObtidos: number;
  notaFinal?: number | null;
  enviadoEm: string;
  corrigidoEm?: string;
}

const provasStorageKey = 'school-compass:provas';
const respostasStorageKey = 'school-compass:provas-respostas';
const avisosStorageKey = 'school-compass:avisos';

const ProfessorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [provas, setProvas] = useState<ProvaResumo[]>(
    () => (isProvasRelacionalEnabled() ? [] : loadFromStorage<ProvaResumo[]>(provasStorageKey, [])),
  );
  const [respostas, setRespostas] = useState<ProvaResposta[]>(
    () => (isProvasRelacionalEnabled() ? [] : loadFromStorage<ProvaResposta[]>(respostasStorageKey, [])),
  );
  const [avisosRecentes, setAvisosRecentes] = useState<Array<{ titulo: string; data: string; urgente: boolean }>>(
    () =>
      loadFromStorage<Array<{ titulo: string; data: string; urgente: boolean }>>(avisosStorageKey, []).slice(0, 3),
  );
  useEffect(() => {
    const usarStorageProvas =
      !isProvasRelacionalEnabled() || !user?.id || !Number.isFinite(Number(user.id));
    if (usarStorageProvas) {
      void syncKeysFromBackend([provasStorageKey, respostasStorageKey]).finally(() => {
        setProvas(loadFromStorage<ProvaResumo[]>(provasStorageKey, []));
        setRespostas(loadFromStorage<ProvaResposta[]>(respostasStorageKey, []));
      });
    }
    if (isApiEnabled()) {
      void listAvisosApi()
        .then((items) => {
          const mapped = items
            .map((a) => ({
              titulo: a.titulo ?? '',
              data: a.dataCriacao ? new Date(a.dataCriacao).toLocaleDateString('pt-BR') : '',
              urgente: (a.conteudo ?? '').includes('[NIVEL:Urgente]'),
            }))
            .slice(0, 3);
          setAvisosRecentes(mapped);
        })
        .catch(() => null);
    }
    if (isProvasRelacionalEnabled() && user?.id && Number.isFinite(Number(user.id))) {
      void Promise.all([
        listProvasRelacionalParaProfessor(user.id),
        listRespostasRelacionalParaProfessor(user.id),
      ])
        .then(([provasRel, respostasRel]) => {
          const provasMapeadas: ProvaResumo[] = provasRel.map((p) => ({
            id: String(p.id ?? ''),
            titulo: p.titulo,
            turma: p.turmaNome ?? '',
            disciplina: p.disciplinaNome ?? '',
            status: (p.status as ProvaResumo['status']) ?? 'Agendada',
            questoes: (p.questoes ?? []).map((q, idx) => ({
              id: String(q.id ?? `q-${idx}`),
              enunciado: q.enunciado,
              tipo: q.tipo === 'aberta' ? 'aberta' : 'multipla',
              pontos: q.pontos ?? 0,
              opcoes: q.opcoes ?? [],
              corretaIndex: q.corretaIndex ?? null,
            })),
          }));
          const respostasMapeadas: ProvaResposta[] = respostasRel.map((r) => ({
            id: String(r.id ?? `${r.provaId}-${r.alunoId}`),
            provaId: String(r.provaId),
            provaTitulo: r.provaTitulo ?? '',
            alunoId: String(r.alunoId),
            alunoNome: r.alunoNome ?? '',
            turma: r.turma ?? '',
            disciplina: r.disciplina ?? '',
            status:
              r.status === 'Corrigido' || (r.notaFinal ?? null) !== null ? 'Corrigido' : 'Enviado',
            respostas: (r.respostas ?? []).map((i) => ({
              questaoId: String(i.questaoId ?? ''),
              tipo: i.tipo === 'aberta' ? 'aberta' : 'multipla',
              alternativaIndex: i.alternativaIndex ?? null,
              respostaTexto: i.respostaTexto ?? '',
              pontosObtidos: i.pontosObtidos ?? null,
            })),
            pontosMaximos: r.pontosMaximos ?? 0,
            pontosObtidos: r.pontosObtidos ?? 0,
            notaFinal: r.notaFinal ?? null,
            enviadoEm: r.enviadoEm ?? '',
            corrigidoEm: typeof r.corrigidoEm === 'string' ? r.corrigidoEm : undefined,
          }));
          setProvas(provasMapeadas);
          setRespostas(respostasMapeadas);
        })
        .catch(() => null);
    }
  }, [user?.id]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [respostaSelecionada, setRespostaSelecionada] = useState<ProvaResposta | null>(null);
  const [correcaoDraft, setCorrecaoDraft] = useState<Record<string, number>>({});
  const [turmaFiltro, setTurmaFiltro] = useState<string>('todas');
  const questoesCriadas = useMemo(() => {
    return provas
      .flatMap((prova) =>
        (prova.questoes ?? []).map((questao) => ({
          provaTitulo: prova.titulo,
          ...questao,
        })),
      )
      .slice(0, 5);
  }, [provas]);
  const turmasDisponiveis = useMemo(
    () => Array.from(new Set(respostas.map((item) => item.turma))).sort(),
    [respostas],
  );
  const respostasFiltradas = useMemo(() => {
    if (turmaFiltro === 'todas') return respostas;
    return respostas.filter((item) => item.turma === turmaFiltro);
  }, [respostas, turmaFiltro]);
  const pendentesCorrecao = useMemo(
    () => respostasFiltradas.filter((item) => item.status === 'Enviado').length,
    [respostasFiltradas],
  );
  const provasAgendadas = useMemo(
    () => provas.filter((prova) => prova.status === 'Agendada').length,
    [provas],
  );
  const respostasRecentes = useMemo(
    () =>
      [...respostasFiltradas].sort((a, b) => b.enviadoEm.localeCompare(a.enviadoEm)).slice(0, 5),
    [respostasFiltradas],
  );

  const handleOpenCorrecao = (resposta: ProvaResposta) => {
    const draft = resposta.respostas.reduce<Record<string, number>>((acc, item) => {
      acc[item.questaoId] = item.pontosObtidos ?? 0;
      return acc;
    }, {});
    setCorrecaoDraft(draft);
    setRespostaSelecionada(resposta);
    setDialogOpen(true);
  };

  const handleChangePontos = (questaoId: string, value: number) => {
    setCorrecaoDraft((prev) => ({ ...prev, [questaoId]: value }));
  };

  const handleSalvarCorrecao = () => {
    if (!respostaSelecionada) return;
    const prova = provas.find((item) => item.id === respostaSelecionada.provaId);
    const questoes = prova?.questoes ?? [];
    const respostasCorrigidas = respostaSelecionada.respostas.map((item) => {
      const questao = questoes.find((q) => q.id === item.questaoId);
      if (questao?.tipo === 'aberta') {
        return {
          ...item,
          pontosObtidos: Math.max(0, Math.min(questao.pontos ?? 0, correcaoDraft[item.questaoId] ?? 0)),
        };
      }
      return item;
    });
    const pontosObtidos = respostasCorrigidas.reduce(
      (acc, item) => acc + (item.pontosObtidos ?? 0),
      0,
    );
    const notaFinal =
      respostaSelecionada.pontosMaximos > 0
        ? Math.round((pontosObtidos / respostaSelecionada.pontosMaximos) * 10 * 10) / 10
        : 0;
    const updatedResposta: ProvaResposta = {
      ...respostaSelecionada,
      respostas: respostasCorrigidas,
      pontosObtidos,
      notaFinal,
      status: 'Corrigido',
      corrigidoEm: new Date().toISOString(),
    };
    const updatedRespostas = respostas.map((item) =>
      item.id === respostaSelecionada.id ? updatedResposta : item,
    );
    setRespostas(updatedRespostas);
    if (!isProvasRelacionalEnabled()) {
      saveToStorage(respostasStorageKey, updatedRespostas);
    }
    if (
      isProvasRelacionalEnabled() &&
      Number.isFinite(Number(respostaSelecionada.provaId)) &&
      Number.isFinite(Number(respostaSelecionada.alunoId)) &&
      Number.isFinite(Number(user?.id))
    ) {
      void patchCorrecaoRespostaRelacional(
        Number(respostaSelecionada.provaId),
        Number(respostaSelecionada.alunoId),
        Number(user?.id),
        notaFinal,
      ).catch(() => null);
      setDialogOpen(false);
      return;
    }

    setDialogOpen(false);
  };

  const turmas = useMemo(
    () =>
      Array.from(new Set(respostas.map((r) => r.turma)))
        .filter(Boolean)
        .map((nome, idx) => ({
          id: String(idx + 1),
          nome,
          materia: respostas.find((r) => r.turma === nome)?.disciplina ?? '-',
          alunos: new Set(respostas.filter((r) => r.turma === nome).map((r) => r.alunoId)).size,
          horario: '--:-- - --:--',
        })),
    [respostas],
  );
  const totalAlunosUnicos = useMemo(
    () => new Set(respostas.map((r) => r.alunoId).filter(Boolean)).size,
    [respostas],
  );
  const aulasHoje = useMemo(
    () =>
      provas
        .filter((p) => p.status === 'Agendada')
        .slice(0, 3)
        .map((p) => ({
          turma: p.turma ?? '-',
          materia: p.disciplina ?? '-',
          horario: '--:-- - --:--',
          sala: 'Sala',
        })),
    [provas],
  );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="font-display font-bold text-3xl text-foreground mb-2">
              Painel do Professor
            </h1>
            <p className="text-muted-foreground">
              Olá, <span className="font-medium text-foreground">{user?.nome}</span>!
              Gerencie suas turmas e atividades.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Ver Agenda
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={BookOpen}
            title="Minhas Turmas"
            value={String(turmas.length)}
            variant="primary"
            delay={0}
          />
          <StatCard
            icon={Users}
            title="Total de Alunos"
            value={String(totalAlunosUnicos)}
            variant="accent"
            delay={100}
          />
          <StatCard
            icon={ClipboardList}
            title="Notas Pendentes"
            value={String(pendentesCorrecao)}
            variant="warning"
            delay={200}
          />
          <StatCard
            icon={FileText}
            title="Provas Agendadas"
            value={String(provasAgendadas)}
            variant="success"
            delay={300}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Link to="/notas" className="block">
            <div className="bg-card rounded-xl p-4 border border-border/50 card-hover text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <ClipboardList className="w-6 h-6 text-primary" />
              </div>
              <p className="font-medium text-sm">Lançar Notas</p>
            </div>
          </Link>
          <Link to="/frequencia" className="block">
            <div className="bg-card rounded-xl p-4 border border-border/50 card-hover text-center">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-accent" />
              </div>
              <p className="font-medium text-sm">Frequência</p>
            </div>
          </Link>
          <Link to="/provas" className="block">
            <div className="bg-card rounded-xl p-4 border border-border/50 card-hover text-center">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-warning" />
              </div>
              <p className="font-medium text-sm">Criar Prova</p>
            </div>
          </Link>
          <Link to="/atividades" className="block">
            <div className="bg-card rounded-xl p-4 border border-border/50 card-hover text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <ClipboardList className="w-6 h-6 text-primary" />
              </div>
              <p className="font-medium text-sm">Atividades</p>
            </div>
          </Link>
          <Link to="/materiais" className="block">
            <div className="bg-card rounded-xl p-4 border border-border/50 card-hover text-center">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-6 h-6 text-success" />
              </div>
              <p className="font-medium text-sm">Materiais</p>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Classes */}
          <div className="lg:col-span-2 bg-card rounded-xl p-6 border border-border/50 animate-slide-up">
            <h3 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Aulas de Hoje
            </h3>
            <div className="space-y-3">
              {aulasHoje.map((aula, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[80px] p-2 rounded-lg bg-primary/10">
                      <p className="text-xs text-muted-foreground">Horário</p>
                      <p className="text-sm font-semibold text-primary">{aula.horario}</p>
                    </div>
                    <div>
                      <p className="font-medium">{aula.turma}</p>
                      <p className="text-sm text-muted-foreground">{aula.materia} • {aula.sala}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Notices */}
          <div className="bg-card rounded-xl p-6 border border-border/50 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <h3 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-warning" />
              Avisos
            </h3>
            <div className="space-y-3">
              {avisosRecentes.map((aviso, index) => (
                <div
                  key={index}
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
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 border border-border/50 animate-slide-up" style={{ animationDelay: '150ms' }}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
            <h3 className="font-display font-semibold text-lg text-foreground flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              Correções de provas
            </h3>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
              <span className="text-xs text-muted-foreground">
                {pendentesCorrecao} pendente(s)
              </span>
              <Select value={turmaFiltro} onValueChange={setTurmaFiltro}>
                <SelectTrigger className="h-8 w-[180px]">
                  <SelectValue placeholder="Filtrar por turma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as turmas</SelectItem>
                  {turmasDisponiveis.map((turma) => (
                    <SelectItem key={turma} value={turma}>
                      {turma}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {respostasRecentes.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Nenhuma prova enviada para correção ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {respostasRecentes.map((resposta) => (
                <div
                  key={resposta.id}
                  className="flex flex-col gap-3 rounded-lg border border-border/60 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{resposta.provaTitulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {resposta.alunoNome} • {resposta.turma} • {resposta.disciplina}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Status: {resposta.status === 'Enviado' ? 'Pendente' : 'Corrigida'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {resposta.pontosObtidos}/{resposta.pontosMaximos} pts
                    </span>
                    <Button size="sm" variant="outline" onClick={() => handleOpenCorrecao(resposta)}>
                      {resposta.status === 'Enviado' ? 'Corrigir' : 'Ver'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl p-6 border border-border/50 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-lg text-foreground flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              Questões criadas
            </h3>
            <Link to="/provas">
              <Button variant="ghost" size="sm">
                Ver todas
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          {questoesCriadas.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Nenhuma questão cadastrada ainda.
            </div>
          ) : (
            <div className="space-y-4">
              {questoesCriadas.map((questao) => (
                <div key={questao.id} className="rounded-lg border border-border/60 p-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    Prova: {questao.provaTitulo}
                  </p>
                  <p className="font-medium text-foreground">{questao.enunciado}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Tipo: {questao.tipo === 'aberta' ? 'Resposta aberta' : 'Multipla escolha'} • Pontos: {questao.pontos ?? 0}
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {questao.tipo === 'aberta' ? (
                      <div className="text-muted-foreground">Resposta aberta</div>
                    ) : (
                      questao.opcoes.map((opcao, index) => (
                        <div
                          key={`${questao.id}-${index}`}
                          className={index === questao.corretaIndex ? 'text-success font-medium' : ''}
                        >
                          {String.fromCharCode(65 + index)}) {opcao}
                        </div>
                      ))
                    )}
                  </div>
                  {questao.tipo !== 'aberta' && questao.corretaIndex !== null && (
                    <div className="mt-2 text-xs text-success">
                      Resposta correta: {String.fromCharCode(65 + questao.corretaIndex)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Classes */}
        <div className="bg-card rounded-xl p-6 border border-border/50 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-lg text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-accent" />
              Minhas Turmas e Matérias
            </h3>
            <Button variant="ghost" size="sm">
              Ver todas
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {turmas.map((turma) => (
              <div
                key={turma.id}
                className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-professor-light text-professor">
                    {turma.materia}
                  </span>
                  <span className="text-xs text-muted-foreground">{turma.horario}</span>
                </div>
                <h4 className="font-semibold text-foreground mb-1">{turma.nome}</h4>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {turma.alunos} alunos
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] w-full max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Correção de prova</DialogTitle>
            <DialogDescription>
              {respostaSelecionada?.provaTitulo} • {respostaSelecionada?.alunoNome}
            </DialogDescription>
          </DialogHeader>
          {respostaSelecionada && (
            <div className="space-y-4">
              {respostaSelecionada.respostas.map((item, index) => {
                const prova = provas.find((provaItem) => provaItem.id === respostaSelecionada.provaId);
                const questao = prova?.questoes?.find((q) => q.id === item.questaoId);
                const pontosMax = questao?.pontos ?? 0;
                const corretaIndex = questao?.corretaIndex;
                const acertou =
                  questao?.tipo !== 'aberta' &&
                  corretaIndex !== null &&
                  corretaIndex !== undefined &&
                  item.alternativaIndex === corretaIndex;
                return (
                  <div key={item.questaoId} className="rounded-md border border-border p-4 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Questão {index + 1}
                      </p>
                      <p className="text-sm text-foreground">{questao?.enunciado}</p>
                    </div>
                    {questao?.tipo === 'aberta' ? (
                      <div className="space-y-2">
                        <Label>Resposta do aluno</Label>
                        <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                          {item.respostaTexto || 'Sem resposta'}
                        </div>
                        <div className="space-y-2">
                          <Label>Pontuação (0 a {pontosMax})</Label>
                          <Input
                            type="number"
                            min={0}
                            max={pontosMax}
                            step="0.5"
                            value={correcaoDraft[item.questaoId] ?? 0}
                            onChange={(event) =>
                              handleChangePontos(item.questaoId, Number(event.target.value))
                            }
                            disabled={respostaSelecionada.status === 'Corrigido'}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div>
                          Resposta do aluno:{' '}
                          {item.alternativaIndex === null || item.alternativaIndex === undefined
                            ? 'Não respondida'
                            : `${String.fromCharCode(65 + item.alternativaIndex)}) ${questao?.opcoes?.[item.alternativaIndex] ?? ''}`}
                        </div>
                        <div>
                          Correta:{' '}
                          {questao?.corretaIndex !== null && questao?.corretaIndex !== undefined
                            ? `${String.fromCharCode(65 + questao.corretaIndex)}) ${questao?.opcoes?.[questao.corretaIndex] ?? ''}`
                            : 'Não definida'}
                        </div>
                        <div>
                          Resultado: {acertou ? 'Acertou' : 'Errou'}
                        </div>
                        <div>
                          Pontos: {item.pontosObtidos ?? 0}/{pontosMax}
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
                {respostaSelecionada.status === 'Enviado' && (
                  <Button type="button" variant="gradient" onClick={handleSalvarCorrecao}>
                    Finalizar correção
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default ProfessorDashboard;
