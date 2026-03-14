import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { defaultUsers, StoredUser, usersStorageKey } from '@/lib/mockUsers';
import { loadFromStorage } from '@/lib/mockStorage';
import { CatalogItem, defaultDisciplinas, disciplinasStorageKey } from '@/lib/mockAcademics';
import { Turma, defaultTurmas, turmasStorageKey } from '@/lib/mockTurmas';
import { UserProfile } from '@/types/auth';

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const getTurmaKey = (value: string) => {
  const normalized = normalizeText(value);
  const match = normalized.match(/(\d+)\s*(?:ano)?\s*([a-z])/i);
  if (match) {
    return `${match[1]}${match[2]}`.toLowerCase();
  }
  return normalized.replace(/[^a-z0-9]/g, '');
};

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
  turma: string;
  disciplina: string;
  turno?: string;
}

interface AtividadeEntrega {
  atividadeId: string;
  alunoId: string;
  alunoNome?: string;
}

export default function Correcoes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tipoCorrecao, setTipoCorrecao] = useState<'provas' | 'atividades' | ''>('');
  const [turno, setTurno] = useState('');
  const [materia, setMateria] = useState('');
  const [turma, setTurma] = useState('');
  const [autoCorrigir, setAutoCorrigir] = useState(true);
  const [alunosSelecionados, setAlunosSelecionados] = useState<string[]>([]);
  const [pesquisaAtiva, setPesquisaAtiva] = useState(false);

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

  const professorLogado = useMemo(() => {
    if (!user) return null;
    return usuarios.find((item) => item.id === user.id) ?? null;
  }, [usuarios, user]);

  const vinculosProfessor = useMemo(() => {
    if (!user?.id) return [];
    return vinculos.filter((v) => v.professorId === user.id);
  }, [vinculos, user?.id]);

  const materiasDisponiveis = useMemo(() => {
    if (vinculosProfessor.length > 0) {
      const ids = Array.from(new Set(vinculosProfessor.map((v) => v.disciplinaId)));
      return ids
        .map((id) => disciplinas.find((d) => d.id === id)?.nome)
        .filter((nome): nome is string => Boolean(nome))
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }
    return professorLogado?.materias ?? [];
  }, [vinculosProfessor, disciplinas, professorLogado]);

  const turmasDisponiveis = useMemo(() => {
    if (vinculosProfessor.length > 0) {
      const porId = new Set(vinculosProfessor.map((v) => v.turmaId));
      const nomesPorId = turmas
        .filter((t) => porId.has(t.id))
        .map((t) => t.nome);
      if (nomesPorId.length > 0) {
        return Array.from(new Set(nomesPorId)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
      }
      const nomesVinculo = vinculosProfessor.map((v) => v.turmaNome).filter(Boolean);
      return Array.from(new Set(nomesVinculo)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }
    return professorLogado?.turmas ?? [];
  }, [vinculosProfessor, turmas, professorLogado]);

  const alunosDisponiveis = useMemo(() => {
    const turmaFiltro = getTurmaKey(turma);
    const turnoFiltro = normalizeText(turno);
    const alunos = usuarios.filter(
      (item) => item.perfil === UserProfile.ALUNO && item.status === 'ativo',
    );

    if (tipoCorrecao === 'atividades') {
      const atividadesFiltradas = atividades.filter((item) => {
        if (turma && getTurmaKey(item.turma) !== turmaFiltro) return false;
        if (materia && normalizeText(item.disciplina) !== normalizeText(materia)) return false;
        if (turno && item.turno && normalizeText(item.turno) !== turnoFiltro) return false;
        return true;
      });
      const atividadeIds = new Set(atividadesFiltradas.map((item) => item.id));
      const atividadesPorId = new Map(atividadesFiltradas.map((item) => [item.id, item]));
      const alunosPorId = new Map<
        string,
        { id: string; nome: string; email: string }
      >();

      entregasAtividades
        .filter((entrega) => atividadeIds.has(entrega.atividadeId))
        .forEach((entrega) => {
          const usuarioAluno = alunos.find((item) => item.id === entrega.alunoId);
          if (turno) {
            const turnoAluno = usuarioAluno?.turno;
            const turnoAtividade = atividadesPorId.get(entrega.atividadeId)?.turno;
            const turnoBase = turnoAluno || turnoAtividade;
            if (turnoBase && normalizeText(turnoBase) !== turnoFiltro) {
              return;
            }
          }
          if (!alunosPorId.has(entrega.alunoId)) {
            alunosPorId.set(entrega.alunoId, {
              id: entrega.alunoId,
              nome: usuarioAluno?.nome ?? entrega.alunoNome ?? `Aluno ${entrega.alunoId}`,
              email: usuarioAluno?.email ?? 'Sem e-mail',
            });
          }
        });

      return Array.from(alunosPorId.values()).sort((a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }),
      );
    }

    return alunos
      .filter((item) => {
        if (!turma) return true;
        // suporta estruturas antigas (item.turma) e atuais (item.turmas[])
        const turmaLegada = getTurmaKey((item as { turma?: string }).turma ?? '');
        const turmasVinculadas = (item.turmas ?? []).map((value) => getTurmaKey(value));
        return turmaLegada === turmaFiltro || turmasVinculadas.includes(turmaFiltro);
      })
      .filter((item) => {
        if (!turno) return true;
        // suporta "Manha" vs "Manhã" e variações de caixa
        return normalizeText(item.turno ?? '') === turnoFiltro;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
  }, [usuarios, turma, turno, tipoCorrecao, atividades, entregasAtividades, materia]);

  const podePesquisar = Boolean(tipoCorrecao && turno && materia && turma);

  useEffect(() => {
    setPesquisaAtiva(false);
    setAlunosSelecionados([]);
  }, [tipoCorrecao, turno, materia, turma]);

  const handleToggleAluno = (alunoId: string) => {
    setAlunosSelecionados((prev) =>
      prev.includes(alunoId) ? prev.filter((id) => id !== alunoId) : [...prev, alunoId],
    );
  };

  const handleSelecionarTodos = () => {
    if (alunosSelecionados.length === alunosDisponiveis.length) {
      setAlunosSelecionados([]);
      return;
    }
    setAlunosSelecionados(alunosDisponiveis.map((item) => item.id));
  };

  const handleIniciarCorrecao = () => {
    if (alunosSelecionados.length === 0) {
      window.alert('Selecione pelo menos um aluno para iniciar a correção.');
      return;
    }
    if (!podePesquisar) {
      window.alert('Selecione tipo, turno, matéria e turma.');
      return;
    }
    navigate('/correcoes/detalhe', {
      state: {
        alunosIds: alunosSelecionados,
        tipo: tipoCorrecao,
        turma,
        materia,
        turno,
        autoCorrigir,
      },
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Correções</h1>
            <p className="text-muted-foreground">
              Selecione turma, matéria e alunos para corrigir.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={autoCorrigir} onCheckedChange={setAutoCorrigir} />
            <span className="text-sm text-foreground">Auto corrigir</span>
            <Badge variant="outline" className="text-xs">
              {autoCorrigir ? 'Ativo' : 'Manual'}
            </Badge>
          </div>
        </div>

        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Filtros</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="tipo-correcao">Tipo de correção</Label>
              <Select
                value={tipoCorrecao}
                onValueChange={(value) => setTipoCorrecao(value as 'provas' | 'atividades' | '')}
              >
                <SelectTrigger id="tipo-correcao">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="provas">Provas</SelectItem>
                  <SelectItem value="atividades">Atividades</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="turno">Turno</Label>
              <Select value={turno} onValueChange={setTurno}>
                <SelectTrigger id="turno">
                  <SelectValue placeholder="Selecione o turno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manha">Manhã</SelectItem>
                  <SelectItem value="Tarde">Tarde</SelectItem>
                  <SelectItem value="Noite">Noite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="materia">Matéria</Label>
              <Select
                value={materia}
                onValueChange={setMateria}
                disabled={materiasDisponiveis.length === 0}
              >
                <SelectTrigger id="materia">
                  <SelectValue placeholder="Selecione a matéria" />
                </SelectTrigger>
                <SelectContent>
                  {materiasDisponiveis.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {materiasDisponiveis.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhuma matéria vinculada ao professor.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="turma">Turma</Label>
              <Select
                value={turma}
                onValueChange={setTurma}
                disabled={turmasDisponiveis.length === 0}
              >
                <SelectTrigger id="turma">
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  {turmasDisponiveis.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {turmasDisponiveis.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhuma turma vinculada ao professor.
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="gradient"
              onClick={() => setPesquisaAtiva(true)}
              disabled={!podePesquisar}
            >
              Pesquisar
            </Button>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Selecionar alunos</h2>
            </div>
            <Button type="button" variant="outline" onClick={handleSelecionarTodos}>
              {alunosSelecionados.length === alunosDisponiveis.length
                ? 'Limpar seleção'
                : 'Selecionar todos'}
            </Button>
          </div>

          {!pesquisaAtiva ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Selecione turno, matéria e turma para pesquisar alunos.
            </div>
          ) : alunosDisponiveis.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhum aluno disponível.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {alunosDisponiveis.map((aluno) => (
                <label
                  key={aluno.id}
                  htmlFor={`aluno-${aluno.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/10 px-3 py-2 cursor-pointer"
                >
                  <Checkbox
                    id={`aluno-${aluno.id}`}
                    checked={alunosSelecionados.includes(aluno.id)}
                    onCheckedChange={() => handleToggleAluno(aluno.id)}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{aluno.nome}</p>
                    <p className="text-xs text-muted-foreground">{aluno.email}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </Card>

        <div className="flex justify-end">
          <Button variant="gradient" className="gap-2" onClick={handleIniciarCorrecao}>
            <CheckCircle2 className="h-4 w-4" />
            Iniciar correção
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
