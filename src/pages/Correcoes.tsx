import React, { useMemo, useState } from 'react';
import { CheckCircle2, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { defaultUsers, StoredUser, usersStorageKey } from '@/lib/mockUsers';
import { loadFromStorage } from '@/lib/mockStorage';
import { CatalogItem, defaultDisciplinas, disciplinasStorageKey } from '@/lib/mockAcademics';
import { Turma, defaultTurmas, turmasStorageKey } from '@/lib/mockTurmas';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const normalizeText = (value?: string) =>
  (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

interface DisciplinaVinculo {
  disciplinaId: string;
  turmaId: string;
  turmaNome: string;
  professorId: string;
  professorNome: string;
}

const vinculosStorageKey = 'school-compass:disciplinas-vinculos';
const atividadesStorageKey = 'school-compass:atividades';
const entregasStorageKey = 'school-compass:atividades-entregas';

interface Atividade {
  id: string;
  professorId?: string;
  turma: string;
  disciplina: string;
  turno?: string;
  titulo?: string;
}

interface AtividadeEntrega {
  id: string;
  atividadeId: string;
  alunoId: string;
  alunoNome?: string;
  nota?: number | null;
  corrigidoEm?: string;
  enviadoEm?: string;
}

type StatusFiltro = 'pendente' | 'corrigido' | 'todos';

interface CorrecaoItem {
  id: string;
  alunoId: string;
  alunoNome: string;
  atividadeTitulo: string;
  turma: string;
  materia: string;
  turno: string;
  status: 'Pendente' | 'Corrigido';
  nota?: number | null;
  enviadoEm?: string;
}

const formatTimeAgo = (iso?: string) => {
  if (!iso) return 'Sem data';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMin < 60) return `Entregue ha ${diffMin} min`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `Entregue ha ${diffHour}h`;
  const diffDay = Math.floor(diffHour / 24);
  return `Entregue ha ${diffDay}d`;
};

export default function Correcoes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>('todos');
  const [turmaFiltro, setTurmaFiltro] = useState('todas');
  const [materiaFiltro, setMateriaFiltro] = useState('todas');

  const usuarios = useMemo(
    () => loadFromStorage<StoredUser[]>(usersStorageKey, defaultUsers),
    [],
  );
  const disciplinas = useMemo(
    () => loadFromStorage<CatalogItem[]>(disciplinasStorageKey, defaultDisciplinas),
    [],
  );
  const turmas = useMemo(
    () => loadFromStorage<Turma[]>(turmasStorageKey, defaultTurmas),
    [],
  );
  const vinculos = useMemo(
    () => loadFromStorage<DisciplinaVinculo[]>(vinculosStorageKey, []),
    [],
  );
  const atividades = useMemo(
    () => loadFromStorage<Atividade[]>(atividadesStorageKey, []),
    [],
  );
  const entregasAtividades = useMemo(
    () => loadFromStorage<AtividadeEntrega[]>(entregasStorageKey, []),
    [],
  );

  const vinculosProfessor = useMemo(() => {
    if (!user?.id) return [];
    return vinculos.filter((v) => v.professorId === user.id);
  }, [vinculos, user?.id]);

  const materiasDisponiveis = useMemo(() => {
    const ids = Array.from(new Set(vinculosProfessor.map((v) => v.disciplinaId)));
    return ids
      .map((id) => disciplinas.find((d) => d.id === id)?.nome)
      .filter((item): item is string => Boolean(item))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [vinculosProfessor, disciplinas]);

  const turmasDisponiveis = useMemo(() => {
    const nomes = vinculosProfessor
      .map((v) => turmas.find((t) => t.id === v.turmaId)?.nome ?? v.turmaNome)
      .filter(Boolean);
    return Array.from(new Set(nomes)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [vinculosProfessor, turmas]);

  const vinculoParSet = useMemo(
    () =>
      new Set(
        vinculosProfessor.map((v) => {
          const turmaNome = turmas.find((t) => t.id === v.turmaId)?.nome ?? v.turmaNome;
          const disciplinaNome = disciplinas.find((d) => d.id === v.disciplinaId)?.nome ?? '';
          return `${normalizeText(turmaNome)}::${normalizeText(disciplinaNome)}`;
        }),
      ),
    [vinculosProfessor, turmas, disciplinas],
  );

  const correcoesBase = useMemo(() => {
    const atividadePorId = new Map(atividades.map((item) => [item.id, item]));
    const usuarioPorId = new Map(usuarios.map((item) => [item.id, item]));

    return entregasAtividades
      .map((entrega) => {
        const atividade = atividadePorId.get(entrega.atividadeId);
        if (!atividade) return null;

        const turmaNome = atividade.turma;
        const materiaNome = atividade.disciplina;
        const chavePar = `${normalizeText(turmaNome)}::${normalizeText(materiaNome)}`;
        if (user?.id && atividade.professorId && atividade.professorId !== user.id) return null;
        if (!atividade.professorId && !vinculoParSet.has(chavePar)) return null;

        if (turmaFiltro !== 'todas' && turmaNome !== turmaFiltro) return null;
        if (materiaFiltro !== 'todas' && materiaNome !== materiaFiltro) return null;

        const alunoUsuario = usuarioPorId.get(entrega.alunoId);
        const alunoNome = alunoUsuario?.nome ?? entrega.alunoNome ?? `Aluno ${entrega.alunoId}`;
        const tituloAtividade = atividade.titulo ?? 'Atividade';
        const turno = turmas.find((t) => t.nome === turmaNome)?.turno ?? atividade.turno ?? '';

        return {
          id: entrega.id || `${entrega.atividadeId}-${entrega.alunoId}`,
          alunoId: entrega.alunoId,
          alunoNome,
          atividadeTitulo: tituloAtividade,
          turma: turmaNome,
          materia: materiaNome,
          turno,
          status:
            typeof entrega.nota === 'number' || Boolean(entrega.corrigidoEm)
              ? 'Corrigido'
              : 'Pendente',
          nota: entrega.nota,
          enviadoEm: entrega.enviadoEm,
        } as CorrecaoItem;
      })
      .filter((item): item is CorrecaoItem => Boolean(item))
      .sort((a, b) => (b.enviadoEm ?? '').localeCompare(a.enviadoEm ?? ''));
  }, [atividades, entregasAtividades, usuarios, user?.id, vinculoParSet, turmaFiltro, materiaFiltro, turmas]);

  const totalPendentes = useMemo(
    () => correcoesBase.filter((item) => item.status === 'Pendente').length,
    [correcoesBase],
  );
  const totalCorrigidos = useMemo(
    () => correcoesBase.filter((item) => item.status === 'Corrigido').length,
    [correcoesBase],
  );
  const totalTodos = correcoesBase.length;

  const correcoes = useMemo(() => {
    return correcoesBase.filter((item) => {
      if (statusFiltro === 'pendente' && item.status !== 'Pendente') return false;
      if (statusFiltro === 'corrigido' && item.status !== 'Corrigido') return false;
      if (!busca.trim()) return true;
      const texto = normalizeText(`${item.alunoNome} ${item.atividadeTitulo} ${item.turma} ${item.materia}`);
      return texto.includes(normalizeText(busca));
    });
  }, [correcoesBase, statusFiltro, busca]);

  const handleAbrirCorrecao = (item: CorrecaoItem) => {
    navigate('/correcoes/detalhe', {
      state: {
        alunosIds: [item.alunoId],
        tipo: 'atividades',
        turma: item.turma,
        materia: item.materia,
        turno: item.turno,
      },
    });
  };

  const initials = (name: string) =>
    name
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Correções</h1>
            <p className="text-muted-foreground">
              Você tem {totalPendentes} atividade{totalPendentes === 1 ? '' : 's'} aguardando correção.
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-semibold text-foreground leading-none">{totalPendentes}</div>
            <div className="text-xs text-muted-foreground">pendentes</div>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar aluno ou atividade..."
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              className="pl-9"
            />
          </div>
          <div className="inline-flex rounded-md border border-border bg-muted/20 p-1">
            <Button
              type="button"
              size="sm"
              variant={statusFiltro === 'pendente' ? 'default' : 'ghost'}
              onClick={() => setStatusFiltro('pendente')}
            >
              Pendentes {totalPendentes}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={statusFiltro === 'corrigido' ? 'default' : 'ghost'}
              onClick={() => setStatusFiltro('corrigido')}
            >
              Corrigidos {totalCorrigidos}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={statusFiltro === 'todos' ? 'default' : 'ghost'}
              onClick={() => setStatusFiltro('todos')}
            >
              Todos {totalTodos}
            </Button>
          </div>
          <Select value={turmaFiltro} onValueChange={setTurmaFiltro}>
            <SelectTrigger className="w-full md:w-[170px]">
              <SelectValue placeholder="Todas turmas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas turmas</SelectItem>
              {turmasDisponiveis.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={materiaFiltro} onValueChange={setMateriaFiltro}>
            <SelectTrigger className="w-full md:w-[170px]">
              <SelectValue placeholder="Todas materias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas materias</SelectItem>
              {materiasDisponiveis.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="divide-y divide-border/60">
          {correcoes.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma correção encontrada para os filtros aplicados.
            </div>
          ) : (
            correcoes.map((item) => (
              <div key={item.id} className="flex items-center gap-4 px-4 py-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">{initials(item.alunoNome)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.alunoNome}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.atividadeTitulo}</p>
                </div>
                <div className="hidden min-w-[70px] text-xs text-muted-foreground md:block">{item.turma}</div>
                <div className="hidden min-w-[120px] text-xs text-muted-foreground md:block">
                  {formatTimeAgo(item.enviadoEm)}
                </div>
                <Badge variant={item.status === 'Pendente' ? 'destructive' : 'secondary'}>
                  {item.status === 'Pendente' ? 'PENDENTE' : 'CORRIGIDO'}
                </Badge>
                <div className="w-10 text-right text-sm font-medium text-foreground">
                  {typeof item.nota === 'number' ? item.nota.toFixed(1) : '-'}
                </div>
                <Button size="sm" variant="outline" onClick={() => handleAbrirCorrecao(item)}>
                  {item.status === 'Pendente' ? 'Corrigir' : 'Ver'}
                </Button>
              </div>
            ))
          )}
        </Card>

        {correcoes.length > 0 && (
          <div className="flex justify-end">
            <Button variant="gradient" className="gap-2" onClick={() => handleAbrirCorrecao(correcoes[0])}>
              <CheckCircle2 className="h-4 w-4" />
              Iniciar correção
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
