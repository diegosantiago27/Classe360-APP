import React, { useMemo, useState } from 'react';
import { BookOpen, Download, FolderOpen, Pencil, Trash2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createId, loadFromStorage, saveToStorage } from '@/lib/mockStorage';

type MaterialTipo = 'PDF' | 'PPT' | 'DOC' | 'LINK' | 'OUTRO';

interface Material {
  id: string;
  titulo: string;
  disciplina: string;
  tipo: MaterialTipo;
  atualizado: string;
  link?: string;
}

const storageKey = 'school-compass:materiais';

const defaultMateriais: Material[] = [
  {
    id: 'MAT-001',
    titulo: 'Lista de exercicios - Funcoes',
    disciplina: 'Matematica',
    tipo: 'PDF',
    atualizado: '20/01/2026',
  },
  {
    id: 'MAT-002',
    titulo: 'Slides - Movimento Uniforme',
    disciplina: 'Fisica',
    tipo: 'PPT',
    atualizado: '18/01/2026',
  },
  {
    id: 'MAT-003',
    titulo: 'Resumo - Historia do Brasil',
    disciplina: 'Historia',
    tipo: 'DOC',
    atualizado: '15/01/2026',
  },
];

const Materiais: React.FC = () => {
  const [materiais, setMateriais] = useState<Material[]>(
    () => loadFromStorage<Material[]>(storageKey, defaultMateriais),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<Material, 'id'>>({
    titulo: '',
    disciplina: '',
    tipo: 'PDF',
    atualizado: '',
    link: '',
  });

  const totalPorTipo = useMemo(() => {
    return materiais.reduce(
      (acc, material) => {
        acc[material.tipo] = (acc[material.tipo] || 0) + 1;
        return acc;
      },
      {} as Record<MaterialTipo, number>,
    );
  }, [materiais]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setDraft({
      titulo: '',
      disciplina: '',
      tipo: 'PDF',
      atualizado: '',
      link: '',
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (material: Material) => {
    setEditingId(material.id);
    setDraft({
      titulo: material.titulo,
      disciplina: material.disciplina,
      tipo: material.tipo,
      atualizado: material.atualizado,
      link: material.link ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    const hoje = new Date().toLocaleDateString('pt-BR');
    const normalized = {
      ...draft,
      atualizado: draft.atualizado || hoje,
    };

    if (editingId) {
      const updated = materiais.map((material) =>
        material.id === editingId ? { ...material, ...normalized } : material,
      );
      setMateriais(updated);
      saveToStorage(storageKey, updated);
    } else {
      const newMateriais = [
        { id: createId('material'), ...normalized },
        ...materiais,
      ];
      setMateriais(newMateriais);
      saveToStorage(storageKey, newMateriais);
    }

    setDialogOpen(false);
  };

  const handleDelete = (material: Material) => {
    const confirmed = window.confirm(
      `Deseja remover o material "${material.titulo}"?`,
    );
    if (!confirmed) return;
    const updated = materiais.filter((item) => item.id !== material.id);
    setMateriais(updated);
    saveToStorage(storageKey, updated);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Materiais
            </h1>
            <p className="text-muted-foreground">
              Organize os recursos compartilhados com alunos e professores.
            </p>
          </div>
          <Button variant="gradient" onClick={handleOpenCreate}>
            <FolderOpen className="w-4 h-4" />
            Adicionar material
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de materiais
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">
                  {materiais.length}
                </div>
              </div>
              <BookOpen className="w-5 h-5 text-primary" />
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  PDFs
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">
                  {totalPorTipo.PDF || 0}
                </div>
              </div>
              <BookOpen className="w-5 h-5 text-accent" />
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Links
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">
                  {totalPorTipo.LINK || 0}
                </div>
              </div>
              <BookOpen className="w-5 h-5 text-warning" />
            </CardHeader>
          </Card>
        </div>

        {materiais.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhum material cadastrado. Clique em "Adicionar material".
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {materiais.map((material) => (
              <Card key={material.id} className="card-hover">
                <CardHeader>
                  <CardTitle className="text-lg">{material.titulo}</CardTitle>
                  <CardDescription>{material.disciplina}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="w-4 h-4" />
                    Atualizado em {material.atualizado}
                  </div>
                  {material.link && (
                    <div className="text-xs text-primary truncate">
                      {material.link}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{material.tipo}</Badge>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4" />
                        Baixar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(material)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(material)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar material' : 'Novo material'}
            </DialogTitle>
            <DialogDescription>
              Cadastre materiais de apoio para as turmas.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
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
              <Input
                id="disciplina"
                value={draft.disciplina}
                onChange={(event) => setDraft((prev) => ({ ...prev, disciplina: event.target.value }))}
                placeholder="Ex: Matematica"
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Select
                  value={draft.tipo}
                  onValueChange={(value) =>
                    setDraft((prev) => ({ ...prev, tipo: value as MaterialTipo }))
                  }
                >
                  <SelectTrigger id="tipo">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PDF">PDF</SelectItem>
                    <SelectItem value="PPT">PPT</SelectItem>
                    <SelectItem value="DOC">DOC</SelectItem>
                    <SelectItem value="LINK">LINK</SelectItem>
                    <SelectItem value="OUTRO">OUTRO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="atualizado">Atualizado em</Label>
                <Input
                  id="atualizado"
                  value={draft.atualizado}
                  onChange={(event) => setDraft((prev) => ({ ...prev, atualizado: event.target.value }))}
                  placeholder="Ex: 20/01/2026"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="link">Link (opcional)</Label>
              <Input
                id="link"
                value={draft.link}
                onChange={(event) => setDraft((prev) => ({ ...prev, link: event.target.value }))}
                placeholder="https://..."
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

export default Materiais;
