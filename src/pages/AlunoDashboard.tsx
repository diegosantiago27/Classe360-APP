import React, { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/common/StatCard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { loadFromStorage, saveToStorage } from '@/lib/mockStorage';
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
  pontosMaximos: number;
  pontosObtidos: number;
  notaFinal?: number | null;
  enviadoEm: string;
  corrigidoEm?: string;
}

const AlunoDashboard: React.FC = () => {
  const { user } = useAuth();
  const [respostasRegistradas, setRespostasRegistradas] = useState<ProvaResposta[]>(
    () => loadFromStorage<ProvaResposta[]>(respostasStorageKey, []),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [provaSelecionada, setProvaSelecionada] = useState<Prova | null>(null);
  const [respostasDraft, setRespostasDraft] = useState<Record<string, ProvaRespostaItem>>({});
  const [modoConsulta, setModoConsulta] = useState(false);
  const turmaReferencia = useMemo(() => {
    if (user && 'turma' in user && typeof user.turma === 'string' && user.turma.trim()) {
      return user.turma;
    }
    if (user?.turmaId) {
      const match = user.turmaId.match(/^(\d+)\s*([a-z])$/i);
      if (match) {
        return `${match[1]}º Ano ${match[2].toUpperCase()}`;
      }
      return user.turmaId;
    }
    return '9º Ano A';
  }, [user]);

  const provasDaTurma = useMemo(() => {
    const provas = loadFromStorage<Prova[]>(provasStorageKey, []);
    const normalize = (value: string) =>
      value.toLowerCase().replace(/ano/g, '').replace(/[^a-z0-9]/g, '');
    const turmaNormalizada = normalize(turmaReferencia);
    return provas
      .filter((prova) => normalize(prova.turma) === turmaNormalizada)
      .filter((prova) => prova.publicada)
      .filter((prova) => prova.status === 'Agendada')
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [turmaReferencia]);

  const getRespostaDaProva = (provaId: string) =>
    respostasRegistradas.find(
      (resposta) => resposta.provaId === provaId && resposta.alunoId === user?.id,
    );

  const provasDisponiveis = useMemo(
    () => provasDaTurma.filter((prova) => !getRespostaDaProva(prova.id)),
    [provasDaTurma, respostasRegistradas, user],
  );

  const provasRealizadas = useMemo(
    () => respostasRegistradas.filter((resposta) => resposta.alunoId === user?.id),
    [respostasRegistradas, user],
  );

  const provasPorId = useMemo(() => {
    const provas = loadFromStorage<Prova[]>(provasStorageKey, []);
    return new Map(provas.map((prova) => [prova.id, prova]));
  }, [turmaReferencia, respostasRegistradas]);

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
    setRespostasRegistradas(updated);
    saveToStorage(respostasStorageKey, updated);
    setModoConsulta(true);
  };

  const materias = [
    { nome: 'Matemática', professor: 'Prof. Ana Costa', nota: 8.5, frequencia: 95 },
    { nome: 'Português', professor: 'Prof. Carlos Mendes', nota: 7.8, frequencia: 92 },
    { nome: 'História', professor: 'Prof. Maria Santos', nota: 9.0, frequencia: 98 },
    { nome: 'Geografia', professor: 'Prof. João Lima', nota: 8.2, frequencia: 94 },
    { nome: 'Física', professor: 'Prof. Ana Costa', nota: 7.5, frequencia: 90 },
    { nome: 'Química', professor: 'Prof. Roberto Silva', nota: 8.0, frequencia: 93 },
  ];

  const aulasHoje = [
    { materia: 'Matemática', horario: '07:30 - 08:20', sala: 'Sala 12', professor: 'Prof. Ana' },
    { materia: 'Português', horario: '08:20 - 09:10', sala: 'Sala 12', professor: 'Prof. Carlos' },
    { materia: 'História', horario: '09:30 - 10:20', sala: 'Sala 12', professor: 'Prof. Maria' },
    { materia: 'Educação Física', horario: '10:20 - 11:10', sala: 'Quadra', professor: 'Prof. Paulo' },
  ];

  const avisosRecentes = [
    { titulo: 'Reunião de pais', data: '20/01', urgente: true },
    { titulo: 'Prova de Matemática', data: '22/01', urgente: true },
    { titulo: 'Feira de Ciências', data: '28/01', urgente: false },
  ];

  const colegas = [
    { nome: 'Lucas Silva', avatar: 'L' },
    { nome: 'Maria Souza', avatar: 'M' },
    { nome: 'João Pedro', avatar: 'J' },
    { nome: 'Ana Clara', avatar: 'A' },
    { nome: 'Rafael Costa', avatar: 'R' },
  ];

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
            value="8.2"
            change={5.1}
            variant="success"
            delay={0}
          />
          <StatCard
            icon={UserCheck}
            title="Frequência"
            value="94%"
            variant="primary"
            delay={100}
          />
          <StatCard
            icon={BookOpen}
            title="Matérias"
            value="10"
            variant="accent"
            delay={200}
          />
          <StatCard
            icon={FileText}
            title="Provas Próximas"
            value="3"
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
                            {resposta.pontosObtidos}/{resposta.pontosMaximos} pts
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => prova && handleOpenProva(prova)}
                            disabled={!prova}
                          >
                            Ver prova
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
              {aulasHoje.map((aula, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[80px] p-2 rounded-lg bg-aluno-light">
                      <p className="text-xs text-muted-foreground">Horário</p>
                      <p className="text-sm font-semibold text-aluno">{aula.horario}</p>
                    </div>
                    <div>
                      <p className="font-medium">{aula.materia}</p>
                      <p className="text-sm text-muted-foreground">{aula.professor} • {aula.sala}</p>
                    </div>
                  </div>
                </div>
              ))}
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

            {/* Classmates */}
            <div className="bg-card rounded-xl p-6 border border-border/50 animate-slide-up" style={{ animationDelay: '150ms' }}>
              <h3 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                Colegas de Turma
              </h3>
              <div className="flex flex-wrap gap-2">
                {colegas.map((colega, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-2 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                      {colega.avatar}
                    </div>
                    <span className="text-sm">{colega.nome}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-muted/30 text-muted-foreground">
                  <span className="text-sm">+27 mais</span>
                </div>
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
            <Button variant="ghost" size="sm">
              Ver detalhes
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materias.map((materia, index) => (
              <div
                key={index}
                className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-foreground">{materia.nome}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    materia.nota >= 7 
                      ? 'bg-success/10 text-success' 
                      : 'bg-destructive/10 text-destructive'
                  }`}>
                    Nota: {materia.nota}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{materia.professor}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${materia.frequencia}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{materia.frequencia}%</span>
                </div>
              </div>
            ))}
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
