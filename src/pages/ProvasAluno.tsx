import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, MapPin, Play, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { loadFromStorage, syncKeysFromBackend } from '@/lib/mockStorage';
import {
  getMinhaRespostaRelacional,
  isProvasRelacionalEnabled,
  listProvasRelacionalParaAluno,
  mapRelApiToStorageShape,
} from '@/lib/provasRelApi';

interface Prova {
  id: string;
  titulo: string;
  turma: string;
  disciplina: string;
  periodo: string;
  data: string;
  horario: string;
  sala?: string;
  instrucoes?: string;
  publicada?: boolean;
}

interface ProvaResposta {
  id: string;
  provaId: string;
  alunoId: string;
  status?: string;
}

const provasStorageKey = 'school-compass:provas';
const respostasStorageKey = 'school-compass:provas-respostas';

const formatDate = (value?: string) => {
  if (!value) return '';
  if (value.includes('-')) {
    const [yyyy, mm, dd] = value.split('-');
    if (yyyy && mm && dd) return `${dd}/${mm}/${yyyy}`;
  }
  return value;
};

const getTurmaShort = (value?: string) => {
  if (!value) return '';
  const normalized = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const match = normalized.match(/(\d+)\s*(?:ano)?\s*([a-z])/i);
  if (match) return `${match[1]}${match[2]}`.toLowerCase();
  return normalized.replace(/[^a-z0-9]/g, '');
};

export default function ProvasAluno() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [materia, setMateria] = useState('');
  const [pesquisaAtiva, setPesquisaAtiva] = useState(false);
  const [provas, setProvas] = useState<Prova[]>(() => loadFromStorage<Prova[]>(provasStorageKey, []));
  const [respostas, setRespostas] = useState<ProvaResposta[]>(() =>
    loadFromStorage<ProvaResposta[]>(respostasStorageKey, []),
  );

  const loadLocalData = useCallback(() => {
    return syncKeysFromBackend([provasStorageKey, respostasStorageKey]).finally(() => {
      setProvas(loadFromStorage<Prova[]>(provasStorageKey, []));
      setRespostas(loadFromStorage<ProvaResposta[]>(respostasStorageKey, []));
    });
  }, []);

  useEffect(() => {
    if (isProvasRelacionalEnabled() && user?.id) {
      void listProvasRelacionalParaAluno(user.id)
        .then((rows) => {
          if (rows.length === 0) {
            void loadLocalData();
            return;
          }
          setProvas(rows.map((r) => ({ ...mapRelApiToStorageShape(r), sala: '' })));
        })
        .catch(() => {
          void loadLocalData();
        });
      return;
    }
    void loadLocalData();
  }, [loadLocalData, user?.id]);

  useEffect(() => {
    if (!isProvasRelacionalEnabled() || !user?.id || provas.length === 0) return;
    void (async () => {
      const fetched = await Promise.all(
        provas.map(async (prova) => {
          const r = await getMinhaRespostaRelacional(prova.id, user.id);
          if (!r) return null;
          return {
            id: String(r.id ?? `${prova.id}-${user.id}`),
            provaId: String(r.provaId),
            alunoId: String(r.alunoId),
            status: r.status,
          } as ProvaResposta;
        }),
      );
      setRespostas(fetched.filter((x): x is ProvaResposta => Boolean(x)));
    })();
  }, [provas, user?.id]);

  const getRespostaDoAluno = useCallback(
    (provaId: string) =>
      user?.id
        ? respostas.find((r) => r.provaId === provaId && r.alunoId === user.id)
        : undefined,
    [respostas, user?.id],
  );

  const disciplinasDisponiveis = useMemo(() => {
    const disciplinas = Array.from(new Set(provas.map((p) => p.disciplina).filter(Boolean)));
    return disciplinas.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  }, [provas]);

  const provasFiltradas = useMemo(() => {
    const publicadas = provas.filter((p) => p.publicada);
    if (!pesquisaAtiva) return [];
    if (!materia) return [];
    return publicadas
      .filter((p) => p.disciplina === materia)
      .sort((a, b) => String(a.data).localeCompare(String(b.data)));
  }, [provas, pesquisaAtiva, materia]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Provas</h1>
          <p className="text-muted-foreground">
            Pesquise por matéria para ver as provas disponíveis.
          </p>
        </div>

        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Filtro</h2>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2 w-full md:max-w-sm">
              <Label>Matéria</Label>
              <Select value={materia} onValueChange={setMateria}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a matéria" />
                </SelectTrigger>
                <SelectContent>
                  {disciplinasDisponiveis.map((disc) => (
                    <SelectItem key={disc} value={disc}>
                      {disc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="gradient"
              className="gap-2 self-start md:self-auto"
              onClick={() => setPesquisaAtiva(true)}
              disabled={!materia}
            >
              <Search className="w-4 h-4" />
              Pesquisar
            </Button>
          </div>
        </Card>

        {pesquisaAtiva && materia && provasFiltradas.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhuma prova disponível para essa matéria.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {provasFiltradas.map((prova) => {
              const entrega = getRespostaDoAluno(prova.id);
              const statusAluno = entrega ? 'Entregue' : 'Pendente';
              const dataExibicao = formatDate(prova.data) || prova.data || 'Sem data';
              const horarioExibicao = prova.horario || '';
              return (
                <Card key={prova.id} className="card-hover">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant={statusAluno === 'Pendente' ? 'destructive' : 'secondary'}>
                        {statusAluno}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {prova.turma?.trim() || getTurmaShort(prova.turma)}
                      </span>
                    </div>
                    <CardTitle className="text-lg">{prova.titulo}</CardTitle>
                    <CardDescription>
                      {prova.disciplina} • {prova.periodo?.trim() || 'Período'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {prova.instrucoes?.trim() ? (
                      <div className="text-sm text-muted-foreground line-clamp-3">{prova.instrucoes}</div>
                    ) : null}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarClock className="w-4 h-4" />
                      {dataExibicao}
                      {horarioExibicao ? ` • ${horarioExibicao}` : ''}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {prova.sala?.trim() || ''}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {entrega ? (
                        <Link to={`/provas/${prova.id}`}>
                          <Button size="sm" variant="outline" className="w-full sm:w-auto">
                            Ver envio
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          type="button"
                          variant="gradient"
                          size="sm"
                          className="gap-2 w-full sm:w-auto"
                          onClick={() =>
                            navigate(`/provas/${prova.id}`, { state: { iniciarProva: true } })
                          }
                        >
                          <Play className="h-4 w-4" />
                          Iniciar prova
                        </Button>
                      )}
                    </div>
                    {statusAluno === 'Entregue' && (
                      <div className="flex items-center gap-2 text-xs text-success">
                        <CheckCircle2 className="w-4 h-4" />
                        Entregue com sucesso
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

