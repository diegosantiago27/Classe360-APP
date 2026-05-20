import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell, Pencil, Send, Trash2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { createId, loadFromStorage, saveToStorage, syncKeysFromBackend } from '@/lib/mockStorage';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/auth';
import {
  deleteAvisoApi,
  isApiEnabled,
  listAvisosApi,
  listDisciplinasApi,
  listTurmasApi,
  saveAvisoApi,
} from '@/lib/entityCrudApi';
import { loadVinculosDisciplinaTurma, type VinculoDisciplinaTurma } from '@/lib/vinculosRelacional';

type AvisoNivel = 'Informativo' | 'Urgente' | 'Lembrete';

interface Aviso {
  id: string;
  titulo: string;
  descricao: string;
  data: string;
  nivel: AvisoNivel;
  disciplinaId?: string;
  disciplinaNome?: string;
  turmaId?: string;
  turmaNome?: string;
}

const LEVEL_PREFIX = /^\[NIVEL:(Informativo|Urgente|Lembrete)\]\s*/;

const encodeConteudo = (nivel: AvisoNivel, descricao: string) => `[NIVEL:${nivel}] ${descricao}`;

const decodeConteudo = (conteudo: string): { nivel: AvisoNivel; descricao: string } => {
  const match = conteudo.match(LEVEL_PREFIX);
  if (!match) return { nivel: 'Informativo', descricao: conteudo };
  const nivel = (match[1] as AvisoNivel) ?? 'Informativo';
  return { nivel, descricao: conteudo.replace(LEVEL_PREFIX, '').trim() };
};

const storageKey = 'school-compass:avisos';
const avisosLidosKey = 'school-compass:avisos-lidos';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

const defaultAvisos: Aviso[] = API_URL ? [] : [
  {
    id: 'AV-001',
    titulo: 'Reuniao de pais',
    descricao: 'Reuniao geral na proxima segunda-feira, 19h.',
    data: '20/01/2026',
    nivel: 'Urgente',
  },
  {
    id: 'AV-002',
    titulo: 'Entrega de boletins',
    descricao: 'Boletins disponiveis na secretaria e portal.',
    data: '22/01/2026',
    nivel: 'Informativo',
  },
  {
    id: 'AV-003',
    titulo: 'Feriado municipal',
    descricao: 'Nao havera aula em 25/01.',
    data: '25/01/2026',
    nivel: 'Informativo',
  },
];

const Avisos: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const canManage = user?.perfil !== UserProfile.ALUNO;
  const isProfessor =
    user?.perfil === UserProfile.PROFESSOR ||
    String((user as { role?: unknown } | null)?.role ?? '')
      .trim()
      .toUpperCase() === 'ROLE_PROFESSOR';
  const [avisosLidos, setAvisosLidos] = useState<Record<string, string[]>>(
    () => loadFromStorage<Record<string, string[]>>(avisosLidosKey, {}),
  );
  const [avisos, setAvisos] = useState<Aviso[]>(
    () => loadFromStorage<Aviso[]>(storageKey, isApiEnabled() ? [] : defaultAvisos),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [nivel, setNivel] = useState<AvisoNivel>('Informativo');
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState('');
  const [turmaSelecionada, setTurmaSelecionada] = useState('');
  const [vinculosProfessor, setVinculosProfessor] = useState<VinculoDisciplinaTurma[]>([]);
  const [disciplinaNomeById, setDisciplinaNomeById] = useState<Record<string, string>>({});
  const [turmaNomeById, setTurmaNomeById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isApiEnabled()) {
      setLoading(true);
      void Promise.all([listAvisosApi(), listDisciplinasApi(), listTurmasApi(), loadVinculosDisciplinaTurma()])
        .then(([items, disciplinas, turmas, vinculos]) => {
          const disciplinaMap = Object.fromEntries(
            disciplinas
              .filter((d) => d.id != null)
              .map((d) => [String(d.id), d.nome ?? `Disciplina ${String(d.id)}`]),
          );
          const turmaMap = Object.fromEntries(
            turmas
              .filter((t) => t.id != null)
              .map((t) => [String(t.id), t.nome ?? `Turma ${String(t.id)}`]),
          );
          setDisciplinaNomeById(disciplinaMap);
          setTurmaNomeById(turmaMap);
          setVinculosProfessor(vinculos);

          const mapped: Aviso[] = items
            .map((item) => {
              const parsed = decodeConteudo(item.conteudo ?? '');
              const dataFmt = item.dataCriacao
                ? new Date(item.dataCriacao).toLocaleDateString('pt-BR')
                : new Date().toLocaleDateString('pt-BR');
              const disciplinaId = item.disciplinaId != null ? String(item.disciplinaId) : undefined;
              const turmaId = item.turmaId != null ? String(item.turmaId) : undefined;
              return {
                id: String(item.id ?? createId('aviso')),
                titulo: item.titulo ?? '',
                descricao: parsed.descricao,
                nivel: parsed.nivel,
                data: dataFmt,
                disciplinaId,
                turmaId,
                disciplinaNome: disciplinaId ? disciplinaMap[disciplinaId] : undefined,
                turmaNome: turmaId ? turmaMap[turmaId] : undefined,
              };
            })
            .sort((a, b) => b.data.localeCompare(a.data));
          setAvisos(mapped);
          saveToStorage(storageKey, mapped);
        })
        .catch(() => {
          toast({
            title: 'Erro ao carregar',
            description: 'Nao foi possivel carregar avisos do servidor.',
            variant: 'destructive',
          });
          setAvisos([]);
        })
        .finally(() => setLoading(false));
      return;
    }
    // Sem backend, mantém modo local
    void syncKeysFromBackend([storageKey, avisosLidosKey]).finally(() => {
      setAvisos(loadFromStorage<Aviso[]>(storageKey, defaultAvisos));
      setAvisosLidos(loadFromStorage<Record<string, string[]>>(avisosLidosKey, {}));
    });
  }, []);

  const totalUrgentes = useMemo(
    () => avisos.filter((aviso) => aviso.nivel === 'Urgente').length,
    [avisos],
  );

  const vinculosDoProfessor = useMemo(() => {
    if (!isProfessor || !user?.id) return [];
    const professorId = String(user.id);
    const mapa = new Map<string, VinculoDisciplinaTurma>();
    vinculosProfessor
      .filter((item) => item.professorId === professorId)
      .forEach((item) => mapa.set(`${item.disciplinaId}:${item.turmaId}`, item));
    return Array.from(mapa.values());
  }, [isProfessor, user?.id, vinculosProfessor]);

  const disciplinasProfessor = useMemo(() => {
    const mapa = new Map<string, string>();
    vinculosDoProfessor.forEach((item) => {
      const nome = item.disciplinaNome || disciplinaNomeById[item.disciplinaId] || `Disciplina ${item.disciplinaId}`;
      mapa.set(item.disciplinaId, nome);
    });
    return Array.from(mapa.entries()).map(([id, nome]) => ({ id, nome }));
  }, [vinculosDoProfessor, disciplinaNomeById]);

  const turmasProfessor = useMemo(() => {
    const mapa = new Map<string, string>();
    vinculosDoProfessor
      .filter((item) => item.disciplinaId === disciplinaSelecionada)
      .forEach((item) => {
        const nome = item.turmaNome || turmaNomeById[item.turmaId] || `Turma ${item.turmaId}`;
        mapa.set(item.turmaId, nome);
      });
    return Array.from(mapa.entries()).map(([id, nome]) => ({ id, nome }));
  }, [vinculosDoProfessor, disciplinaSelecionada, turmaNomeById]);

  const resetForm = () => {
    setTitulo('');
    setMensagem('');
    setNivel('Informativo');
    setDisciplinaSelecionada('');
    setTurmaSelecionada('');
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (aviso: Aviso) => {
    setEditingId(aviso.id);
    setTitulo(aviso.titulo);
    setMensagem(aviso.descricao);
    setNivel(aviso.nivel);
    setDisciplinaSelecionada(aviso.disciplinaId ?? '');
    setTurmaSelecionada(aviso.turmaId ?? '');
    setDialogOpen(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    if (isProfessor && (!disciplinaSelecionada || !turmaSelecionada)) {
      toast({
        title: 'Selecione a disciplina e a turma',
        description: 'Para professor, o aviso deve ter disciplina e turma de destino.',
        variant: 'destructive',
      });
      return;
    }

    if (isApiEnabled()) {
      setLoading(true);
      const payload = {
        id: editingId ? Number(editingId) : undefined,
        titulo,
        conteudo: encodeConteudo(nivel, mensagem),
        criadoPorId: user?.id ? Number(user.id) : undefined,
        disciplinaId: isProfessor && disciplinaSelecionada ? Number(disciplinaSelecionada) : null,
        turmaId: isProfessor && turmaSelecionada ? Number(turmaSelecionada) : null,
      };
      void saveAvisoApi(payload)
        .then((saved) => {
          const parsed = decodeConteudo(saved.conteudo ?? payload.conteudo);
          const disciplinaId = saved.disciplinaId != null
            ? String(saved.disciplinaId)
            : isProfessor
              ? disciplinaSelecionada
              : undefined;
          const turmaId = saved.turmaId != null
            ? String(saved.turmaId)
            : isProfessor
              ? turmaSelecionada
              : undefined;
          const avisoSalvo: Aviso = {
            id: String(saved.id ?? editingId ?? createId('aviso')),
            titulo: saved.titulo ?? titulo,
            descricao: parsed.descricao,
            nivel: parsed.nivel,
            data: saved.dataCriacao
              ? new Date(saved.dataCriacao).toLocaleDateString('pt-BR')
              : dataHoje,
            disciplinaId,
            turmaId,
            disciplinaNome: disciplinaId ? disciplinaNomeById[disciplinaId] : undefined,
            turmaNome: turmaId ? turmaNomeById[turmaId] : undefined,
          };
          const updated = editingId
            ? avisos.map((aviso) => (aviso.id === editingId ? avisoSalvo : aviso))
            : [avisoSalvo, ...avisos];
          setAvisos(updated);
          saveToStorage(storageKey, updated);
          toast({
            title: editingId ? 'Aviso atualizado' : 'Aviso enviado',
            description: 'O aviso foi registrado e sera exibido aos usuarios.',
          });
          resetForm();
          setDialogOpen(false);
        })
        .catch(() => {
          toast({
            title: 'Erro ao salvar',
            description: 'Nao foi possivel salvar no servidor.',
            variant: 'destructive',
          });
        })
        .finally(() => setLoading(false));
      return;
    }

    if (!isApiEnabled()) {
      if (editingId) {
        const updated = avisos.map((aviso) =>
          aviso.id === editingId
            ? { ...aviso, titulo, descricao: mensagem, nivel }
            : aviso,
        );
        setAvisos(updated);
        saveToStorage(storageKey, updated);
      } else {
        const novoAviso: Aviso = {
          id: createId('aviso'),
          titulo,
          descricao: mensagem,
          data: dataHoje,
          nivel,
          disciplinaId: isProfessor ? disciplinaSelecionada : undefined,
          turmaId: isProfessor ? turmaSelecionada : undefined,
          disciplinaNome: isProfessor && disciplinaSelecionada ? disciplinaNomeById[disciplinaSelecionada] : undefined,
          turmaNome: isProfessor && turmaSelecionada ? turmaNomeById[turmaSelecionada] : undefined,
        };
        const updated = [novoAviso, ...avisos];
        setAvisos(updated);
        saveToStorage(storageKey, updated);
      }

      toast({
        title: editingId ? 'Aviso atualizado' : 'Aviso enviado',
        description: 'O aviso foi registrado e sera exibido aos usuarios.',
      });
      resetForm();
      setDialogOpen(false);
    }
  };

  const handleDelete = (aviso: Aviso) => {
    const confirmed = window.confirm(
      `Deseja remover o aviso "${aviso.titulo}"?`,
    );
    if (!confirmed) return;
    if (isApiEnabled() && Number.isFinite(Number(aviso.id))) {
      setLoading(true);
      void deleteAvisoApi(Number(aviso.id))
        .then(() => {
          setAvisos((prev) => prev.filter((item) => item.id !== aviso.id));
        })
        .catch(() => {
          toast({
            title: 'Erro ao remover',
            description: 'Nao foi possivel remover o aviso no servidor.',
            variant: 'destructive',
          });
        })
        .finally(() => setLoading(false));
      return;
    }
    const updated = avisos.filter((item) => item.id !== aviso.id);
    setAvisos(updated);
    saveToStorage(storageKey, updated);
  };

  const handleMarkAsRead = (avisoId: string) => {
    if (!user?.id) return;
    setAvisosLidos((prev) => {
      const lidosUsuario = new Set(prev[user.id] ?? []);
      if (lidosUsuario.has(avisoId)) return prev;
      const updated = {
        ...prev,
        [user.id]: [...lidosUsuario, avisoId],
      };
      saveToStorage(avisosLidosKey, updated);
      return updated;
    });
  };

  const handleSelecionarDisciplina = (value: string) => {
    setDisciplinaSelecionada(value);
    if (!value) {
      setTurmaSelecionada('');
      return;
    }
    const turmaEhValida = vinculosDoProfessor.some(
      (item) => item.disciplinaId === value && item.turmaId === turmaSelecionada,
    );
    if (!turmaEhValida) {
      setTurmaSelecionada('');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Avisos
            </h1>
            <p className="text-muted-foreground">
              Centralize comunicados importantes para toda a comunidade escolar.
            </p>
          </div>
          {canManage && (
            <Button variant="gradient" onClick={handleOpenCreate}>
              <Bell className="w-4 h-4" />
              Novo aviso
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de avisos
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">
                  {loading ? '...' : avisos.length}
                </div>
              </div>
              <Bell className="w-5 h-5 text-primary" />
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Urgentes
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">
                  {totalUrgentes}
                </div>
              </div>
              <AlertTriangle className="w-5 h-5 text-warning" />
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Lembretes
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">
                  {avisos.filter((aviso) => aviso.nivel === 'Lembrete').length}
                </div>
              </div>
              <Bell className="w-5 h-5 text-accent" />
            </CardHeader>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr,1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="w-5 h-5 text-primary" />
                Avisos recentes
              </CardTitle>
              <CardDescription>
                Ultimos comunicados publicados para alunos e professores.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {avisos.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Nenhum aviso cadastrado. Clique em "Novo aviso".
                </div>
              ) : (
                avisos.map((aviso) => (
                  <div
                    key={aviso.id}
                    className="rounded-lg border border-border/60 p-4 transition-colors hover:bg-muted/40"
                    onMouseEnter={() => handleMarkAsRead(aviso.id)}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-foreground">{aviso.titulo}</h3>
                      <Badge variant={aviso.nivel === 'Urgente' ? 'destructive' : 'secondary'}>
                        {aviso.nivel}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{aviso.descricao}</p>
                    {(aviso.disciplinaNome || aviso.turmaNome) && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Destino: {[aviso.disciplinaNome, aviso.turmaNome].filter(Boolean).join(' • ')}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Publicado em {aviso.data}</span>
                      {canManage ? (
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(aviso)}>
                            <Pencil className="w-4 h-4" />
                            Editar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(aviso)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Somente leitura para alunos.
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  {editingId ? 'Editar aviso' : 'Criar aviso'}
                </CardTitle>
                <CardDescription>
                  Envie um comunicado rapido para as turmas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="titulo">Titulo</Label>
                    <Input
                      id="titulo"
                      value={titulo}
                      onChange={(event) => setTitulo(event.target.value)}
                      placeholder="Ex: Reuniao geral"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nivel">Nivel</Label>
                    <Select value={nivel} onValueChange={setNivel}>
                      <SelectTrigger id="nivel">
                        <SelectValue placeholder="Selecione o nivel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Informativo">Informativo</SelectItem>
                        <SelectItem value="Urgente">Urgente</SelectItem>
                        <SelectItem value="Lembrete">Lembrete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {isProfessor && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="disciplina-aviso">Disciplina</Label>
                        <Select value={disciplinaSelecionada} onValueChange={handleSelecionarDisciplina}>
                          <SelectTrigger id="disciplina-aviso">
                            <SelectValue placeholder="Selecione a disciplina" />
                          </SelectTrigger>
                          <SelectContent>
                            {disciplinasProfessor.map((disciplina) => (
                              <SelectItem key={disciplina.id} value={disciplina.id}>
                                {disciplina.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="turma-aviso">Turma</Label>
                        <Select
                          value={turmaSelecionada}
                          onValueChange={setTurmaSelecionada}
                          disabled={!disciplinaSelecionada}
                        >
                          <SelectTrigger id="turma-aviso">
                            <SelectValue placeholder="Selecione a turma" />
                          </SelectTrigger>
                          <SelectContent>
                            {turmasProfessor.map((turma) => (
                              <SelectItem key={turma.id} value={turma.id}>
                                {turma.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="mensagem">Mensagem</Label>
                    <Textarea
                      id="mensagem"
                      value={mensagem}
                      onChange={(event) => setMensagem(event.target.value)}
                      placeholder="Escreva o comunicado..."
                      rows={4}
                      required
                    />
                  </div>
                  <Button type="submit" variant="gradient" className="w-full">
                    <Send className="w-4 h-4" />
                    {editingId ? 'Salvar alteracoes' : 'Enviar aviso'}
                  </Button>
                  {editingId && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setEditingId(null);
                        resetForm();
                      }}
                    >
                      Cancelar edicao
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar aviso' : 'Novo aviso'}</DialogTitle>
            <DialogDescription>
              Preencha o titulo, nivel e a mensagem principal.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo-modal">Titulo</Label>
              <Input
                id="titulo-modal"
                value={titulo}
                onChange={(event) => setTitulo(event.target.value)}
                placeholder="Ex: Reuniao geral"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nivel-modal">Nivel</Label>
              <Select value={nivel} onValueChange={(value) => setNivel(value as AvisoNivel)}>
                <SelectTrigger id="nivel-modal">
                  <SelectValue placeholder="Selecione o nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Informativo">Informativo</SelectItem>
                  <SelectItem value="Urgente">Urgente</SelectItem>
                  <SelectItem value="Lembrete">Lembrete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isProfessor && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="disciplina-modal">Disciplina</Label>
                  <Select value={disciplinaSelecionada} onValueChange={handleSelecionarDisciplina}>
                    <SelectTrigger id="disciplina-modal">
                      <SelectValue placeholder="Selecione a disciplina" />
                    </SelectTrigger>
                    <SelectContent>
                      {disciplinasProfessor.map((disciplina) => (
                        <SelectItem key={disciplina.id} value={disciplina.id}>
                          {disciplina.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="turma-modal">Turma</Label>
                  <Select
                    value={turmaSelecionada}
                    onValueChange={setTurmaSelecionada}
                    disabled={!disciplinaSelecionada}
                  >
                    <SelectTrigger id="turma-modal">
                      <SelectValue placeholder="Selecione a turma" />
                    </SelectTrigger>
                    <SelectContent>
                      {turmasProfessor.map((turma) => (
                        <SelectItem key={turma.id} value={turma.id}>
                          {turma.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="mensagem-modal">Mensagem</Label>
              <Textarea
                id="mensagem-modal"
                value={mensagem}
                onChange={(event) => setMensagem(event.target.value)}
                placeholder="Escreva o comunicado..."
                rows={4}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="gradient">
                {editingId ? 'Salvar' : 'Publicar aviso'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Avisos;
