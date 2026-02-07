import React, { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    turma: '9º Ano A',
    disciplina: 'Matematica',
    bimestre: '1º Bimestre',
  },
  {
    id: 'MAT-9B-1',
    turma: '9º Ano B',
    disciplina: 'Matematica',
    bimestre: '1º Bimestre',
  },
  {
    id: 'FIS-8A-2',
    turma: '8º Ano A',
    disciplina: 'Fisica',
    bimestre: '2º Bimestre',
  },
  {
    id: 'POR-7C-1',
    turma: '7º Ano C',
    disciplina: 'Portugues',
    bimestre: '1º Bimestre',
  },
];

const defaultAlunos: AlunoTurma[] = [
  { id: 'AL-9A-1', nome: 'Pedro Oliveira', turma: '9º Ano A' },
  { id: 'AL-9A-2', nome: 'Maria Souza', turma: '9º Ano A' },
  { id: 'AL-9B-1', nome: 'Joao Pedro', turma: '9º Ano B' },
  { id: 'AL-9B-2', nome: 'Ana Lima', turma: '9º Ano B' },
  { id: 'AL-8A-1', nome: 'Lucia Ferreira', turma: '8º Ano A' },
  { id: 'AL-7C-1', nome: 'Bruno Santos', turma: '7º Ano C' },
];

const NotaTurma: React.FC = () => {
  const { id } = useParams();
  const lancamentos = useMemo(
    () => loadFromStorage<Lancamento[]>(lancamentosStorageKey, defaultLancamentos),
    [],
  );
  const lancamento = useMemo(
    () => lancamentos.find((item) => item.id === id) ?? null,
    [id, lancamentos],
  );
  const notasAlunos = useMemo(
    () => loadFromStorage<NotaAluno[]>(notasAlunosStorageKey, []),
    [],
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

  const notasExibidas = useMemo(() => {
    if (!lancamento) return [];
    if (notasDaTurma.length > 0) return notasDaTurma;
    const alunosTurma = defaultAlunos.filter((aluno) => aluno.turma === lancamento.turma);
    const novasNotas: NotaAluno[] = alunosTurma.map((aluno, index) => ({
      id: createId('nota-aluno'),
      alunoId: aluno.id,
      alunoNome: aluno.nome,
      turma: lancamento.turma,
      disciplina: lancamento.disciplina,
      bimestre: lancamento.bimestre,
      nota: null,
    }));
    const updated = [...notasAlunos, ...novasNotas];
    saveToStorage(notasAlunosStorageKey, updated);
    return novasNotas;
  }, [lancamento, notasDaTurma, notasAlunos]);

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
      const totalRegistrado = notasRegistradas.reduce((acc, item) => acc + (item.nota ?? 0), 0);
      const temTotal = notasRegistradas.length > 0 || typeof mediaFinal === 'number';

      return {
        ...aluno,
        mediaProvas,
        mediaTrabalhos,
        mediaFinal,
        totalBimestres: temTotal
          ? Math.round((notasRegistradas.length > 0 ? totalRegistrado : mediaFinal ?? 0) * 10) / 10
          : null,
      };
    });
  }, [alunosDaTurma, entregasAtividades, lancamento, notasAlunos, respostasProvas]);

  if (!lancamento) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <h1 className="font-display text-3xl font-bold text-foreground">
            Notas não encontradas
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
              {lancamento.turma} • {lancamento.disciplina} • {lancamento.bimestre}
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
                    <TableHead className="w-16">Nº</TableHead>
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
                        {typeof nota.mediaTrabalhos === 'number' ? nota.mediaTrabalhos.toFixed(1) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {typeof nota.mediaProvas === 'number' ? nota.mediaProvas.toFixed(1) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {typeof nota.mediaFinal === 'number' ? nota.mediaFinal.toFixed(1) : '-'}
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
