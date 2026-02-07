import React, { useMemo, useState } from 'react';
import { BookOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createId, loadFromStorage, saveToStorage } from '@/lib/mockStorage';
import { CatalogItem, defaultDisciplinas, disciplinasStorageKey } from '@/lib/mockAcademics';

const Disciplinas: React.FC = () => {
  const [disciplinas, setDisciplinas] = useState<CatalogItem[]>(
    () => loadFromStorage<CatalogItem[]>(disciplinasStorageKey, defaultDisciplinas),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');

  const total = useMemo(() => disciplinas.length, [disciplinas]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setNome('');
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: CatalogItem) => {
    setEditingId(item.id);
    setNome(item.nome);
    setDialogOpen(true);
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = nome.trim();
    if (!trimmed) return;

    if (editingId) {
      const updated = disciplinas.map((item) =>
        item.id === editingId ? { ...item, nome: trimmed } : item,
      );
      setDisciplinas(updated);
      saveToStorage(disciplinasStorageKey, updated);
    } else {
      const updated = [{ id: createId('disciplina'), nome: trimmed }, ...disciplinas];
      setDisciplinas(updated);
      saveToStorage(disciplinasStorageKey, updated);
    }

    setDialogOpen(false);
  };

  const handleDelete = (item: CatalogItem) => {
    const confirmed = window.confirm(`Deseja remover a disciplina "${item.nome}"?`);
    if (!confirmed) return;
    const updated = disciplinas.filter((row) => row.id !== item.id);
    setDisciplinas(updated);
    saveToStorage(disciplinasStorageKey, updated);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Disciplinas
            </h1>
            <p className="text-muted-foreground">
              Cadastre e mantenha a lista de disciplinas usadas no sistema.
            </p>
          </div>
          <Button variant="gradient" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4" />
            Nova disciplina
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de disciplinas
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">
                  {total}
                </div>
              </div>
              <BookOpen className="w-5 h-5 text-primary" />
            </CardHeader>
          </Card>
        </div>

        {disciplinas.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhuma disciplina cadastrada. Clique em "Nova disciplina".
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {disciplinas.map((item) => (
              <Card key={item.id} className="card-hover">
                <CardHeader>
                  <CardTitle className="text-lg">{item.nome}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleOpenEdit(item)}>
                    <Pencil className="w-4 h-4" />
                    Editar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(item)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar disciplina' : 'Nova disciplina'}</DialogTitle>
            <DialogDescription>
              Informe o nome da disciplina conforme cadastro institucional.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                placeholder="Ex: Matematica"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="gradient">
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Disciplinas;
