import React, { useMemo, useState } from 'react';
import { ArrowLeft, ClipboardList, Save } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createId, loadFromStorage, saveToStorage } from '@/lib/mockStorage';
import { CatalogItem, defaultDisciplinas, disciplinasStorageKey } from '@/lib/mockAcademics';

type AtividadeStatus = 'Pendente' | 'Entregue';

interface Atividade {
  id: string;
  titulo: string;
  disciplina: string;
  descricao: string;
  entrega: string;
  status: AtividadeStatus;
}

const storageKey = 'school-compass:atividades';

const NovaAtividade: React.FC = () => {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Omit<Atividade, 'id'>>({
    titulo: '',
    disciplina: '',
    descricao: '',
    entrega: '',
    status: 'Pendente',
  });

  const disciplinasDisponiveis = useMemo(
    () => loadFromStorage<CatalogItem[]>(disciplinasStorageKey, defaultDisciplinas),
    [],
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const stored = loadFromStorage<Atividade[]>(storageKey, []);
    const updated = [
      { id: createId('atividade'), ...draft },
      ...stored,
    ];
    saveToStorage(storageKey, updated);
    navigate('/atividades');
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/atividades">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Nova atividade
            </h1>
            <p className="text-muted-foreground">
              Cadastre a atividade e defina o prazo de entrega.
            </p>
          </div>
        </div>

        <Card className="p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Titulo</Label>
              <Input
                id="titulo"
                value={draft.titulo}
                onChange={(event) => setDraft((prev) => ({ ...prev, titulo: event.target.value }))}
                placeholder="Ex: Lista de exercicios"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="disciplina">Disciplina</Label>
              <Select
                value={draft.disciplina}
                onValueChange={(value) => setDraft((prev) => ({ ...prev, disciplina: value }))}
              >
                <SelectTrigger id="disciplina">
                  <SelectValue placeholder="Selecione a disciplina" />
                </SelectTrigger>
                <SelectContent>
                  {disciplinasDisponiveis.map((disciplina) => (
                    <SelectItem key={disciplina.id} value={disciplina.nome}>
                      {disciplina.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Questao / Enunciado</Label>
              <Textarea
                id="descricao"
                value={draft.descricao}
                onChange={(event) => setDraft((prev) => ({ ...prev, descricao: event.target.value }))}
                placeholder="Descreva a atividade ou questao para o aluno"
                rows={4}
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="entrega">Entrega</Label>
                <Input
                  id="entrega"
                  type="date"
                  value={draft.entrega}
                  onChange={(event) => setDraft((prev) => ({ ...prev, entrega: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={draft.status}
                  onValueChange={(value) => setDraft((prev) => ({ ...prev, status: value as AtividadeStatus }))}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Entregue">Entregue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Link to="/atividades">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" variant="gradient">
                <Save className="w-4 h-4" />
                Salvar atividade
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default NovaAtividade;
