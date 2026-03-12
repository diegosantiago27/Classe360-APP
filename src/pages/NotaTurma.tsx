import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createId, loadFromStorage, saveToStorage } from '@/lib/mockStorage';

interface Lancamento {
  id: string;
  turma: string;
  disciplina: string;
  bimestre: string;
}

interface AlunoTurma {
  id: string;
  nome: string;
  turma: string;
}

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

interface ProvaResposta {
  id: string;
  provaId: string;
  alunoId: string;
  alunoNome: string;
  turma: string;
  disciplina: string;
  status: 'Enviado' | 'Corrigido';
  notaFinal?: number | null;
}

interface AtividadeEntrega {
  id: string;
  atividadeId: string;
  alunoId: string;
  alunoNome: string;
  disciplina: string;
  nota?: number | null;
}

const lancamentosStorageKey = 'school-compass:notas';
const notasAlunosStorageKey = 'school-compass:notas-alunos';
const provasRespostasStorageKey = 'school-compass:provas-respostas';
const atividadesEntregasStorageKey = 'school-compass:atividades-entregas';

const defaultLancamentos: Lancamento[] = [
  {
    id: 'MAT-9A-1',
    turma: '9o Ano A',
    disciplina: 'Matematica',
    bimestre: '1o Bimestre',
  },
  {
    id: 'MAT-9B-1',
    turma: '9o Ano B',
    disciplina: 'Matematica',
    bimestre: '1o Bimestre',
  },
  {
    id: 'FIS-8A-2',
    turma: '8o Ano A',
    disciplina: 'Fisica',
    bimestre: '2o Bimestre',
  },
  {
    id: 'POR-7C-1',
    turma: '7o Ano C',
    disciplina: 'Portugues',
    bimestre: '1o Bimestre',
  },
];

const defaultAlunos: AlunoTurma[] = [
  { id: 'AL-9A-1', nome: 'Pedro Oliveira', turma: '9o Ano A' },
  { id: 'AL-9A-2', nome: 'Maria Souza', turma: '9o Ano A' },
  { id: 'AL-9B-1', nome: 'Joao Pedro', turma: '9o Ano B' },
  { id: 'AL-9B-2', nome: 'Ana Lima', turma: '9o Ano B' },
  { id: 'AL-8A-1', nome: 'Lucia Ferreira', turma: '8o Ano A' },
  { id: 'AL-7C-1', nome: 'Bruno Santos', turma: '7o Ano C' },
];

const NotaTurma: React.FC = () => {
  const { user } = useAuth();
  const podeEditarNotas = user?.perfil !== UserProfile.SECRETARIA;
  const { id } = useParams();
  const lancamentos = useMemo(
    () => loadFromStorage<Lancamento[]>(lancamentosStorageKey, defaultLancamentos),
    [],
  );
  const lancamento = useMemo(
    () => lancamentos.find((item) => item.id === id) ?? null,
    [id, lancamentos],
  );
  const [notasAlunos, setNotasAlunos] = useState<NotaAluno[]>(
    () => loadFromStorage<NotaAluno[]>(notasAlunosStorageKey, []),
  );
  const respostasProvas = useMemo(
    () => loadFromStorage<ProvaResposta[]>(provasRespostasStorageKey, []),
    [],
  );
  const entregasAtividades = useMemo(
    () => loadFromStorage<AtividadeEntrega[]>(atividadesEntregasStorageKey, []),
    [],
  );

  const notasDaTurma = useMemo(() => {
    if (!lancamento) return [];
    return notasAlunos.filter(
      (nota) =>
        nota.turma === lancamento.turma &&
        nota.disciplina === lancamento.disciplina &&
        nota.bimestre === lancamento.bimestre,
    );
  }, [lancamento, notasAlunos]);

  useEffect(() => {
    if (!lancamento) return;
    if (notasDaTurma.length > 0) return;
    const alunosTurma = defaultAlunos.filter((aluno) => aluno.turma === lancamento.turma);
    const novasNotas: NotaAluno[] = alunosTurma.map((aluno) => ({
      id: createId('nota-aluno'),
      alunoId: aluno.id,
      alunoNome: aluno.nome,
      turma: lancamento.turma,
      disciplina: lancamento.disciplina,
      bimestre: lancamento.bimestre,
      trabalhosNota: null,
      provasNota: null,
      nota: null,
    }));
    if (novasNotas.length === 0) return;
    const updated = [...notasAlunos, ...novasNotas];
    setNotasAlunos(updated);
    saveToStorage(notasAlunosStorageKey, updated);
  }, [lancamento, notasDaTurma.length, notasAlunos]);

  const notasExibidas = useMemo(() => notasDaTurma, [notasDaTurma]);

  const notasOrdenadas = useMemo(() => {
    return [...notasExibidas].sort((a, b) =>
      a.alunoNome.localeCompare(b.alunoNome, 'pt-BR', { sensitivity: 'base' }),
    );
  }, [notasExibidas]);

  const alunosDaTurma = useMemo(() => {
    return [...notasOrdenadas].map((nota) => ({
      alunoId: nota.alunoId,
      alunoNome: nota.alunoNome,
    }));
  }, [notasOrdenadas]);

  const calcularMediaFinal = (alunoId: string, turma: string, disciplina: string) => {
    const provasAluno = respostasProvas.filter(
      (resposta) =>
        resposta.alunoId === alunoId &&
        resposta.turma === turma &&
        resposta.disciplina === disciplina &&
        resposta.status === 'Corrigido' &&
        typeof resposta.notaFinal === 'number',
    );
    const trabalhosAluno = entregasAtividades.filter(
      (entrega) =>
        entrega.alunoId === alunoId &&
        entrega.disciplina === disciplina &&
        typeof entrega.nota === 'number',
    );

    const mediaProvas =
      provasAluno.length > 0
        ? Math.round(
            (provasAluno.reduce((acc, item) => acc + (item.notaFinal ?? 0), 0) /
              provasAluno.length) *
              10,
          ) / 10
        : null;

    const mediaTrabalhos =
      trabalhosAluno.length > 0
        ? Math.round(
            (trabalhosAluno.reduce((acc, item) => acc + (item.nota ?? 0), 0) /
              trabalhosAluno.length) *
              10,
          ) / 10
        : null;

    const componentes = [mediaProvas, mediaTrabalhos].filter(
      (valor): valor is number => typeof valor === 'number',
    );
    const mediaFinal =
      componentes.length > 0
        ? Math.round((componentes.reduce((acc, item) => acc + item, 0) / componentes.length) * 10) /
          10
        : null;

    return { mediaProvas, mediaTrabalhos, mediaFinal };
  };

  const notasPorAluno = useMemo(() => {
    if (!lancamento) return [];
    return alunosDaTurma.map((aluno) => {
      const { mediaProvas, mediaTrabalhos, mediaFinal } = calcularMediaFinal(
        aluno.alunoId,
        lancamento.turma,
        lancamento.disciplina,
      );
      const notasRegistradas = notasAlunos.filter(
        (nota) =>
          nota.alunoId === aluno.alunoId &&
          nota.turma === lancamento.turma &&
          nota.disciplina === lancamento.disciplina &&
          typeof nota.nota === 'number',
      );
      const notaAtualBimestre =
        notasAlunos.find(
          (nota) =>
            nota.alunoId === aluno.alunoId &&
            nota.turma === lancamento.turma &&
            nota.disciplina === lancamento.disciplina &&
            nota.bimestre === lancamento.bimestre,
        ) ?? null;
      const trabalhosExibicao =
        typeof notaAtualBimestre?.trabalhosNota === 'number'
          ? notaAtualBimestre.trabalhosNota
          : mediaTrabalhos;
      const provasExibicao =
        typeof notaAtualBimestre?.provasNota === 'number'
          ? notaAtualBimestre.provasNota
          : mediaProvas;
      const notaExibicao =
        typeof notaAtualBimestre?.nota === 'number' ? notaAtualBimestre.nota : mediaFinal;
      const totalRegistrado = notasRegistradas.reduce((acc, item) => acc + (item.nota ?? 0), 0);
      const temTotal = notasRegistradas.length > 0 || typeof notaExibicao === 'number';

      return {
        ...aluno,
        mediaProvas,
        mediaTrabalhos,
        mediaFinal,
        trabalhosExibicao,
        provasExibicao,
        notaExibicao,
        totalBimestres: temTotal
          ? Math.round((notasRegistradas.length > 0 ? totalRegistrado : notaExibicao ?? 0) * 10) / 10
          : null,
      };
    });
  }, [alunosDaTurma, entregasAtividades, lancamento, notasAlunos, respostasProvas]);

  const handleNotaChange = (alunoId: string, field: 'trabalhosNota' | 'provasNota' | 'nota', rawValue: string) => {
    if (!lancamento) return;
    const normalizedValue =
      rawValue.trim() === ''
        ? null
        : Math.max(0, Math.min(10, Number(rawValue.replace(',', '.'))));
    if (normalizedValue !== null && Number.isNaN(normalizedValue)) return;

    const updated = notasAlunos.map((nota) => {
      const isTarget =
        nota.alunoId === alunoId &&
        nota.turma === lancamento.turma &&
        nota.disciplina === lancamento.disciplina &&
        nota.bimestre === lancamento.bimestre;
      return isTarget ? { ...nota, [field]: normalizedValue } : nota;
    });
    setNotasAlunos(updated);
    saveToStorage(notasAlunosStorageKey, updated);
  };

  if (!lancamento) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <h1 className="font-display text-3xl font-bold text-foreground">
            Notas nao encontradas
          </h1>
          <Link to="/notas">
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
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/notas">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Notas da turma
            </h1>
            <p className="text-muted-foreground">
              {lancamento.turma} - {lancamento.disciplina} - {lancamento.bimestre}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Alunos e notas</CardTitle>
            <CardDescription>
              Visualize as notas registradas para esta turma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {notasOrdenadas.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nenhum aluno encontrado para esta turma.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">No</TableHead>
                    <TableHead>Aluno</TableHead>
                    <TableHead className="text-right">Trabalhos</TableHead>
                    <TableHead className="text-right">Provas</TableHead>
                    <TableHead className="text-right">Nota</TableHead>
                    <TableHead className="text-right">Final</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notasPorAluno.map((nota, index) => (
                    <TableRow key={`${nota.alunoId}-${index}`}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">{nota.alunoNome}</TableCell>
                      <TableCell className="text-right">
                        {podeEditarNotas ? (
                          <Input
                            className="ml-auto h-8 w-24 text-right"
                            value={typeof nota.trabalhosExibicao === 'number' ? nota.trabalhosExibicao.toFixed(1) : ''}
                            onChange={(event) => handleNotaChange(nota.alunoId, 'trabalhosNota', event.target.value)}
                            placeholder="-"
                          />
                        ) : typeof nota.trabalhosExibicao === 'number' ? (
                          nota.trabalhosExibicao.toFixed(1)
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {podeEditarNotas ? (
                          <Input
                            className="ml-auto h-8 w-24 text-right"
                            value={typeof nota.provasExibicao === 'number' ? nota.provasExibicao.toFixed(1) : ''}
                            onChange={(event) => handleNotaChange(nota.alunoId, 'provasNota', event.target.value)}
                            placeholder="-"
                          />
                        ) : typeof nota.provasExibicao === 'number' ? (
                          nota.provasExibicao.toFixed(1)
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {podeEditarNotas ? (
                          <Input
                            className="ml-auto h-8 w-24 text-right"
                            value={typeof nota.notaExibicao === 'number' ? nota.notaExibicao.toFixed(1) : ''}
                            onChange={(event) => handleNotaChange(nota.alunoId, 'nota', event.target.value)}
                            placeholder="-"
                          />
                        ) : typeof nota.notaExibicao === 'number' ? (
                          nota.notaExibicao.toFixed(1)
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {typeof nota.totalBimestres === 'number' ? nota.totalBimestres.toFixed(1) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default NotaTurma;
