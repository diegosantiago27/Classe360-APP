import React, { useEffect, useMemo, useState } from 'react';
import { Award, Pencil, TrendingUp, Trash2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createId, loadFromStorage, saveToStorage } from '@/lib/mockStorage';
import { useAuth } from '@/contexts/AuthContext';

type SituacaoNota = 'Aprovado' | 'Recuperacao' | 'Reprovado';

interface Nota {
  id: string;
  alunoId?: string;
  disciplina: string;
  media: number;
  situacao: SituacaoNota;
  ultimaNota: string;
}

const storageKey = 'school-compass:minhas-notas';

const defaultBoletim: Nota[] = [
  {
    id: 'MAT',
    disciplina: 'Matematica',
    media: 8.5,
    situacao: 'Aprovado',
    ultimaNota: 'Prova 1: 8.0',
  },
  {
    id: 'POR',
    disciplina: 'Portugues',
    media: 7.8,
    situacao: 'Aprovado',
    ultimaNota: 'Trabalho: 7.5',
  },
  {
    id: 'FIS',
    disciplina: 'Fisica',
    media: 6.2,
    situacao: 'Recuperacao',
    ultimaNota: 'Quiz: 6.0',
  },
];

const MinhasNotas: React.FC = () => {
  const { user } = useAuth();
  const [boletim, setBoletim] = useState<Nota[]>(
    () => loadFromStorage<Nota[]>(storageKey, defaultBoletim),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<Nota, 'id'>>({
    disciplina: '',
    media: 0,
    situacao: 'Aprovado',
    ultimaNota: '',
  });

  const boletimFiltrado = useMemo(
    () => boletim.filter((item) => !item.alunoId || item.alunoId === user?.id),
    [boletim, user],
  );

  useEffect(() => {
    if (!user?.id) return;
    const hasAlunoId = boletim.some((item) => item.alunoId);
    const hasNotasAluno = boletim.some((item) => item.alunoId === user.id);
    if (!hasAlunoId && !hasNotasAluno && boletim.length > 0) {
      const updated = boletim.map((item) => ({ ...item, alunoId: user.id }));
      setBoletim(updated);
      saveToStorage(storageKey, updated);
    }
  }, [boletim, user]);

  const mediaGeral = useMemo(() => {
    if (boletimFiltrado.length === 0) return 0;
    return (
      Math.round(
        (boletimFiltrado.reduce((acc, item) => acc + item.media, 0) / boletimFiltrado.length) *
          10,
      ) /
      10
    );
  }, [boletimFiltrado]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setDraft({
      disciplina: '',
      media: 0,
      situacao: 'Aprovado',
      ultimaNota: '',
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (nota: Nota) => {
    setEditingId(nota.id);
    setDraft({
      disciplina: nota.disciplina,
      media: nota.media,
      situacao: nota.situacao,
      ultimaNota: nota.ultimaNota,
    });
    setDialogOpen(true);
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    const normalized: Nota = {
      id: editingId ?? createId('nota-aluno'),
      alunoId: user?.id,
      disciplina: draft.disciplina,
      media: Math.min(10, Math.max(0, draft.media)),
      situacao: draft.situacao,
      ultimaNota: draft.ultimaNota,
    };

    if (editingId) {
      const updated = boletim.map((item) =>
        item.id === editingId ? { ...item, ...normalized } : item,
      );
      setBoletim(updated);
      saveToStorage(storageKey, updated);
    } else {
      const updated = [normalized, ...boletim];
      setBoletim(updated);
      saveToStorage(storageKey, updated);
    }

    setDialogOpen(false);
  };

  const handleDelete = (nota: Nota) => {
    const confirmed = window.confirm(
      `Deseja remover a nota da disciplina ${nota.disciplina}?`,
    );
    if (!confirmed) return;
    const updated = boletim.filter((item) => item.id !== nota.id);
    setBoletim(updated);
    saveToStorage(storageKey, updated);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Minhas notas
            </h1>
            <p className="text-muted-foreground">
              Veja o desempenho por disciplina e acompanhe sua evolucao.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Media geral
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">
                  {mediaGeral}
                </div>
              </div>
              <Award className="w-5 h-5 text-success" />
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Evolucao recente
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">+0.4</div>
              </div>
              <TrendingUp className="w-5 h-5 text-primary" />
            </CardHeader>
          </Card>
        </div>

        {boletimFiltrado.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhuma nota cadastrada. Clique em "Nova nota".
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {boletimFiltrado.map((item) => (
              <Card key={item.id} className="card-hover">
                <CardHeader>
                  <CardTitle className="text-lg">{item.disciplina}</CardTitle>
                  <CardDescription>{item.ultimaNota}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Media</span>
                    <span className="text-lg font-semibold text-foreground">{item.media}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant={item.situacao === 'Aprovado' ? 'secondary' : 'destructive'}>
                      {item.situacao}
                    </Badge>
                    <div className="flex-1 pl-4">
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-success"
                          style={{ width: `${item.media * 10}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    Somente leitura para alunos.
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MinhasNotas;
